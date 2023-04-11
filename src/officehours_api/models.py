from enum import Enum
from typing import List, Optional, Set

from django.conf import settings
from django.db import models
from django.contrib.auth.models import User
from django.contrib.postgres.fields import ArrayField
from django.dispatch import receiver
from django.db.models.signals import post_save
from django.core.validators import MaxLengthValidator
from safedelete.models import (
    SafeDeleteModel, SOFT_DELETE_CASCADE, HARD_DELETE,
)
from jsonfield import JSONField
from requests.exceptions import RequestException

from officehours_api.exceptions import (
    BackendException, DisabledBackendException, NotAllowedBackendException
)
from officehours_api import backends
from officehours_api.backends.types import IMPLEMENTED_BACKEND_NAME

BACKEND_INSTANCES = {
    backend_name: getattr(getattr(backends, backend_name), 'Backend')()
    for backend_name in settings.ENABLED_BACKENDS
}


def get_default_backend():
    return settings.DEFAULT_BACKEND


def get_default_allowed_backends():
    return settings.DEFAULT_ALLOWED_BACKENDS


def get_backend_types():
    return [
        [key, value.friendly_name]
        for key, value in BACKEND_INSTANCES.items()
    ]


def get_enabled_backends() -> Set[IMPLEMENTED_BACKEND_NAME]:
    return settings.ENABLED_BACKENDS


class Profile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
    )
    phone_number = models.CharField(max_length=20, default="", blank=True, null=False)
    notify_me_attendee = models.BooleanField(default=False)
    notify_me_host = models.BooleanField(default=False)
    backend_metadata = JSONField(null=True, default=dict, blank=True)

    @property
    def authorized_backends(self):
        return {
            backend.name: backend.is_authorized(self.user)
            for backend in BACKEND_INSTANCES.values()
        }

    def __str__(self):
        return f'user={self.user.username}'


def get_users_with_emails(manager: models.Manager):
    return manager\
        .exclude(profile__phone_number__isnull=True)\
        .exclude(profile__phone_number__exact='')


class Queue(SafeDeleteModel):
    _safedelete_policy = SOFT_DELETE_CASCADE
    name = models.CharField(max_length=100)
    hosts = models.ManyToManyField(User)
    created_at = models.DateTimeField(auto_now_add=True)
    description = models.TextField(
        max_length=1000,
        blank=True,
        validators=[MaxLengthValidator(1000)]
    )
    status = models.CharField(
        max_length=32,
        choices=[
            ('open', 'Open'),
            ('closed', 'Closed'),
        ],
        default='open',
    )
    allowed_backends = ArrayField(
        models.CharField(max_length=20, choices=get_backend_types(), blank=False),
        default=get_default_allowed_backends,
    )
    inperson_location = models.CharField(max_length=100, blank=True)

    @property
    def hosts_with_phone_numbers(self):
        return get_users_with_emails(self.hosts)

    def replace_allowed_backend_with_default(self, backend_name: IMPLEMENTED_BACKEND_NAME):
        new_allowed_backends = list(filter(lambda x: x != backend_name, self.allowed_backends))
        default_backend = get_default_backend()
        if default_backend not in new_allowed_backends:
            new_allowed_backends.append(default_backend)
        self.allowed_backends = new_allowed_backends

    def __str__(self):
        return self.name


class MeetingStatus(Enum):
    UNASSIGNED = 0
    ASSIGNED = 1
    STARTED = 2


class Meeting(SafeDeleteModel):
    _safedelete_policy = HARD_DELETE
    queue = models.ForeignKey(
        Queue, on_delete=models.CASCADE,
        null=True
    )
    attendees = models.ManyToManyField(User, through='Attendee')
    assignee = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, related_name='assigned',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    agenda = models.CharField(max_length=100, null=False, default="", blank=True)

    backend_type = models.CharField(
        max_length=20,
        choices=get_backend_types(),
        null=False,
        default=get_default_backend,
    )
    backend_metadata = JSONField(null=True, default=dict)

    @property
    def attendees_with_phone_numbers(self):
        return get_users_with_emails(self.attendees)

    def change_backend_type(self, new_backend_name: Optional[IMPLEMENTED_BACKEND_NAME] = None):
        if new_backend_name:
            if new_backend_name not in get_enabled_backends():
                raise DisabledBackendException(new_backend_name)
            if new_backend_name not in self.queue.allowed_backend:
                raise NotAllowedBackendException(new_backend_name)
            self.backend_type = new_backend_name
            return

        default_backend = get_default_backend()
        # Prefer default if it's allowed
        if default_backend in self.queue.allowed_backends:
            self.backend_type = default_backend
        else:
            # Otherwise use first of queue.allowed_backends
            # Dependent on queue.allowed_backends remaining not nullable.
            self.backend_type = self.queue.allowed_backends[0]

    def __init__(self, *args, **kwargs):
        super(Meeting, self).__init__(*args, **kwargs)
        self._saved_backend_type = self.backend_type
        self._saved_assignee = self.assignee
        self.saved_status = self.status

    @property
    def status(self):
        return (
            MeetingStatus.UNASSIGNED
            if not self.assignee
            else MeetingStatus.ASSIGNED
            if not self.backend_metadata
            else MeetingStatus.STARTED
        )

    def start(self):
        if not self.assignee:
            raise Exception("Can't start meeting before assignee is set!")
        backend = BACKEND_INSTANCES.get(self.backend_type)
        if not backend:
            raise DisabledBackendException(self.backend_type)
        try:
            self.backend_metadata = backend.save_user_meeting(
                self.backend_metadata,
                self.assignee,
            )
        except RequestException as ex:
            raise BackendException(self.backend_type) from ex

    def save(self, *args, **kwargs):
        if self.saved_status.value >= MeetingStatus.STARTED.value:
            if self.backend_type != self._saved_backend_type:
                raise Exception("Can't change backend_type once meeting is started!")
            if self.assignee != self._saved_assignee:
                raise Exception("Can't change assignee once meeting is started!")
        super().save(*args, **kwargs)
        self.saved_status = self.status
        self._saved_backend_type = self.backend_type
        self._saved_assignee = self.assignee

    def delete(self, *args, **kwargs):
        # Trigger m2m "remove" signals for attendees
        self.attendees.remove(*self.attendees.all())
        self.save()
        super().delete(*args, **kwargs)

    @property
    def line_place(self) -> Optional[int]:
        if not self.queue:
            return None
        meetings = self.queue.meeting_set.order_by('id')
        unstarted_meetings: List[Meeting] = [
            meeting for meeting in meetings if meeting.status != MeetingStatus.STARTED
        ]
        for i in range(0, len(unstarted_meetings)):
            m = unstarted_meetings[i]
            if m == self:
                return i
        return None

    def __str__(self):
        return f'{self.id}: {self.backend_type} {self.backend_metadata}'


class Attendee(SafeDeleteModel):
    '''
    Attendee must subclass SafeDeleteModel in order to be safedeleted
    when a Meeting is safedeleted
    '''
    _safedelete_policy = HARD_DELETE
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
    )
    meeting = models.ForeignKey(
        Meeting,
        on_delete=models.CASCADE,
    )

    def __str__(self):
        return f'attendee_user={self.user.username}'


@receiver(post_save, sender=User)
def post_save_user_signal_handler(sender, instance: User, created, **kwargs):
    try:
        instance.profile
    except User.profile.RelatedObjectDoesNotExist:
        instance.profile = Profile.objects.create(user=instance)


if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_MESSAGING_SERVICE_SID:
    import officehours_api.notifications

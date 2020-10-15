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


class BackendException(Exception):
    def __init__(self, backend_type):
        self.backend_type = backend_type
        self.message = (
            f'An unexpected error occurred in {self.backend_type.capitalize()}. '
            f'You can check the ITS Status page (https://status.its.umich.edu/) '
            f'to see if there is a known issue with {self.backend_type.capitalize()}, '
            f'or contact the ITS Service Center (https://its.umich.edu/help) for help.'
        )


class Profile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
    )
    phone_number = models.CharField(max_length=20, default="", blank=True, null=False)
    notify_me_attendee = models.BooleanField(default=False)
    notify_me_host = models.BooleanField(default=False)

    def __str__(self):
        return f'user={self.user.username}'


def get_users_with_emails(manager: models.Manager):
    return manager\
        .exclude(profile__phone_number__isnull=True)\
        .exclude(profile__phone_number__exact='')


def get_default_allowed_backends():
    return settings.DEFAULT_ALLOWED_BACKENDS


def get_backend_types():
    return [
        [key, value.friendly_name]
        for key, value in settings.BACKENDS.items()
    ]

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

    @property
    def hosts_with_phone_numbers(self):
        return get_users_with_emails(self.hosts)

    def __str__(self):
        return self.name


def get_default_backend():
    return settings.DEFAULT_BACKEND


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

    def save(self, *args, **kwargs):
        backend = settings.BACKENDS[self.backend_type]
        user_email = self.queue.hosts.first().email
        self.backend_metadata['user_email'] = user_email
        try:
            self.backend_metadata = backend.save_user_meeting(
                self.backend_metadata,
            )
        except RequestException as ex:
            raise BackendException(self.backend_type) from ex

        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Trigger m2m "remove" signals for attendees
        self.attendees.remove(*self.attendees.all())
        self.save()
        super().delete(*args, **kwargs)

    @property
    def line_place(self):
        if not self.queue:
            return None
        meetings = self.queue.meeting_set.order_by('id')
        for i in range(0, len(meetings)):
            m = meetings[i]
            if m == self:
                return i

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


import officehours_api.notifications

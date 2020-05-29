from django.conf import settings
from django.db import models
from django.contrib.auth.models import User
from django.dispatch import receiver
from django.db.models.signals import post_save
from safedelete.models import (
    SafeDeleteModel, SOFT_DELETE_CASCADE, HARD_DELETE,
)
from jsonfield import JSONField
from requests.exceptions import RequestException

from .backends.bluejeans import Bluejeans

if settings.BLUEJEANS_CLIENT_ID and settings.BLUEJEANS_CLIENT_SECRET:
    bluejeans = Bluejeans(
        client_id=settings.BLUEJEANS_CLIENT_ID,
        client_secret=settings.BLUEJEANS_CLIENT_SECRET,
    )
else:
    bluejeans = None


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

    def __str__(self):
        return f'user={self.user.username}'


class Queue(SafeDeleteModel):
    _safedelete_policy = SOFT_DELETE_CASCADE
    name = models.CharField(max_length=100)
    hosts = models.ManyToManyField(User)
    created_at = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=32,
        choices=[
            ('open', 'Open'),
            ('closed', 'Closed'),
        ],
        default='open',
    )

    def __str__(self):
        return self.name


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

    MEETING_BACKEND_TYPES = [
        ('bluejeans', 'BlueJeans'),
    ]
    backend_type = models.CharField(max_length=20,
                                    choices=MEETING_BACKEND_TYPES,
                                    null=True)
    backend_metadata = JSONField(null=True, default=dict)

    def save(self, *args, **kwargs):
        if not self.backend_type and bluejeans:
            self.backend_type = 'bluejeans'
        if self.backend_type:
            backend = globals()[self.backend_type]
            if backend:
                user_email = self.queue.hosts.first().email
                self.backend_metadata['user_email'] = user_email
                try:
                    self.backend_metadata = backend.save_user_meeting(
                        self.backend_metadata,
                    )
                except RequestException as ex:
                    raise BackendException(self.backend_type) from ex

        super().save(*args, **kwargs)


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
        return f'user={self.user.username}'


@receiver(post_save, sender=User)
def post_save_user_signal_handler(sender, instance, created, **kwargs):
    try:
        instance.profile
    except User.profile.RelatedObjectDoesNotExist:
        instance.profile = Profile.objects.create(user=instance)

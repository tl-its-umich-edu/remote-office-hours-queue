from django.db import models
from django.contrib.auth.models import User
from django.dispatch import receiver
from django.db.models.signals import post_save
from safedelete.models import (
    SafeDeleteModel, SOFT_DELETE, SOFT_DELETE_CASCADE, HARD_DELETE,
)


class Profile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
    )

    def __str__(self):
        return f'user={self.user.username}'


class Queue(SafeDeleteModel):
    _safedelete_policy = SOFT_DELETE
    name = models.CharField(max_length=100)
    hosts = models.ManyToManyField(User)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Meeting(SafeDeleteModel):
    _safedelete_policy = SOFT_DELETE_CASCADE
    queue = models.ForeignKey(
        Queue, on_delete=models.CASCADE,
        null=True
    )
    attendees = models.ManyToManyField(User, through='Attendee')
    started_at = models.DateTimeField(auto_now_add=True)
    removed_at = models.DateTimeField(null=True)
    ended_at = models.DateTimeField(null=True)

    @property
    def is_active(self):
        return bool(not(self.removed_at or self.ended_at))


class Attendee(SafeDeleteModel):
    '''
    Attendee must subclass SafeDeleteModel in order to be safedeleted
    when a Meeting is safedeleted
    '''
    # SOFT_DELETE is breaking some interactions, need to investigate
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

from django.db import models
from django.contrib.auth.models import User
from django.dispatch import receiver
from django.db.models.signals import post_save
from safedelete.models import SafeDeleteModel, SOFT_DELETE


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
    _safedelete_policy = SOFT_DELETE
    queue = models.ForeignKey(
        Queue, on_delete=models.CASCADE,
        null=True
    )


class Attendee(models.Model):
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

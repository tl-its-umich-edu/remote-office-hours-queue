from django.db import models
from django.contrib.auth.models import User


class Host(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
    )

    def __str__(self):
        return f'user={self.user.username}'


class Queue(models.Model):
    name = models.CharField(max_length=100)
    hosts = models.ManyToManyField(Host)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Meeting(models.Model):
    queue = models.ForeignKey(Queue, on_delete=models.CASCADE, related_name='queue')


class Attendee(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
    )
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name='meeting')
    
    def __str__(self):
        return f'user={self.user.username}'

from django.conf import settings
from django.db import models
from django.contrib.auth.models import User

from .bluejeans import Bluejeans


bluejeans = Bluejeans(
    client_id=settings.BLUEJEANS_CLIENT_ID,
    client_secret=settings.BLUEJEANS_CLIENT_SECRET,
)


class BluejeansMeeting(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    bjn_user_id = models.IntegerField(null=True)
    bjn_meeting_id = models.IntegerField(null=True)
    bjn_meeting_url = models.URLField(null=True)

    @property
    def bluejeans_user(self):
        return bluejeans.get_user(self.owner.email)

    def save(self, *args, **kwargs):
        if not self.bjn_meeting_id:
            user = bluejeans.get_user(user_email=self.owner.email)
            self.bjn_user_id = user['id']

            meeting = bluejeans.create_meeting(self.bjn_user_id)
            self.bjn_meeting_id = meeting['id']
            self.bjn_meeting_url = \
                f'https://bluejeans.com/{meeting["numericMeetingId"]}'

        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        bluejeans.delete_meeting(self.bluejeans_user['id'],
                                 self.bjn_meeting_id)

        super().delete(*args, **kwargs)

    def __str__(self):
        return f'id={self.bjn_meeting_id} user_email={self.owner.email}'

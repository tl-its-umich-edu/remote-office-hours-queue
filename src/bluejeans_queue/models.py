import time

from django.conf import settings
from django.db import models
from django.contrib.auth.models import User
from requests import HTTPError

from .bluejeans import Bluejeans

if settings.BLUEJEANS_CLIENT_ID and settings.BLUEJEANS_CLIENT_SECRET:
    bluejeans = Bluejeans(
        client_id=settings.BLUEJEANS_CLIENT_ID,
        client_secret=settings.BLUEJEANS_CLIENT_SECRET,
    )
else:
    bluejeans = None


class BluejeansMeeting(models.Model):
    owner = models.ForeignKey(User, related_name='owner',
                              on_delete=models.CASCADE)
    attendee = models.ForeignKey(User, related_name='attendee',
                                 on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    is_active = models.BooleanField(default=True)

    bjn_user_id = models.IntegerField(null=True)
    bjn_meeting_id = models.IntegerField(null=True)
    bjn_meeting_url = models.URLField(null=True)

    @property
    def bluejeans_user(self):
        return bluejeans.get_user(self.owner.email)

    def save(self, *args, **kwargs):
        if bluejeans:
            if not self.bjn_meeting_id:
                user = bluejeans.get_user(user_email=self.owner.email)
                self.bjn_user_id = user['id']
                now = round(time.time()) * 1000

                meeting = bluejeans.create_meeting(
                    self.bjn_user_id,
                    meeting_settings={
                        'title': (
                            f'Remote Office Hours: {self.owner.username} / '
                            f'{self.attendee.username}'),
                        'description': (
                            'This meeting was created by the Remote Office'
                            'Hours Queue application. See '
                            'https://documentation.its.umich.edu/node/1830'),
                        'start': now,
                        'end': now + (60 * 30 * 1000),
                        'timezone': 'America/Detroit',
                        'endPointType': 'WEB_APP',
                        'endPointVersion': '2.10',
                    }
                )
                self.bjn_meeting_id = meeting['id']
                self.bjn_meeting_url = \
                    f'https://bluejeans.com/{meeting["numericMeetingId"]}'

        super().save(*args, **kwargs)

    def deactivate(self):
        if bluejeans:
            try:
                bluejeans.delete_meeting(self.bluejeans_user['id'],
                                        self.bjn_meeting_id)
            except HTTPError as exc:
                print(exc)

        self.is_active = False
        self.save()

    def __str__(self):
        return f'id={self.bjn_meeting_id} user_email={self.owner.email}'

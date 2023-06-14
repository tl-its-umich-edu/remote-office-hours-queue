# started code reference from remote-office-hours-queue/src/officehours_api/tests.py
import json

from django.contrib.auth.models import User
from django.test import Client, TestCase
from rest_framework import status

from officehours_api.models import Meeting, Queue


class MeetingTestCase(TestCase):

    def setUp(self):
        self.attendee_one = User.objects.create(
            username='attendeeone', email='attendeeone@example.com'
        )
        self.host_one = User.objects.create(
            username='hostone', email='hostone@example.com'
        )
        self.host_one.set_password('rohqtest')
        self.host_one.save()
        self.host_two = User.objects.create(
            username='hosttwo', email='hosttwo@example.com'
        )
        self.queue = Queue.objects.create(name='Test Queue')
        self.queue.hosts.set([self.host_one, self.host_two])
        self.queue.save()

        self.meeting = Meeting.objects.create(queue=self.queue, backend_type='inperson')
        self.meeting.attendees.set([self.attendee_one])
        self.meeting.assignee = self.host_two
        self.meeting.start()
        self.meeting.save()

        self.client = Client()

    def test_cannot_reassign_host_when_meeting_has_started(self):
        url = f'/api/meetings/{self.meeting.id}/'
        data = {
            "attendee_ids": [self.attendee_one.id],
            "assignee_id": self.host_one.id
        }
        self.client.login(username='hostone', password='rohqtest')
        response = self.client.put(url, data, content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response_body = json.loads(response.content)
        self.assertEqual(
            response_body['Meeting Detail'],
            "Can't change assignee once meeting is started!"
        )

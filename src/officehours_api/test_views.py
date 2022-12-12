# started code reference from remote-office-hours-queue/src/officehours_api/tests.py

from django.contrib.auth.models import AnonymousUser, User
from django.test import TestCase, override_settings, RequestFactory
from rest_framework.test import APIRequestFactory

from officehours_api.models import User, Queue, Meeting
from officehours_api.views import MeetingDetail


class MeetingTestCase(TestCase):
    def setUp(self):
        self.foo = User.objects.create(username='foo', email='foo@example.com')
        self.bar = User.objects.create(username='bar', email='bar@example.com')
        self.baz = User.objects.create(username='baz', email='baz@example.com')
        self.hostie = User.objects.create(
            username='hostie', email='hostie@example.com')
        self.queue = Queue.objects.create(
            name='MeetingTest',
        )
        self.queue.hosts.set([self.hostie, self.baz])
        self.queue.save()
        self.exceptions = 0
        self.factory = APIRequestFactory()

    # changed the create meeting from the one already in test.py (changes a bit)
    def create_meeting(self, host, attendees, start=False):
        m = Meeting.objects.create(
            queue=self.queue,
            backend_type='inperson',
        )
        m.attendees.set(attendees)
        if start:
            m.assignee = host
            m.start()
            m.save()
        return m

    def test_error(self):
        # meeting has been created where the host is self.hostie and attendees are self.foo and self.bar , the nature of the meeting is zoom
        meeting_in_progress = self.create_meeting(self.hostie, [self.bar], True)
        # put request to change the assignee of the meeting (not understandig what to send in this and how)
        url = f'/api/meetings/{meeting_in_progress.id}/'
        data = {
            "attendee_ids": [self.bar.id],
            "assignee_id": self.baz.id
        }
        
        request = self.factory.put(url, data)
        request.user = self.baz
        # view response
        response = MeetingDetail.as_view()(request, pk=meeting_in_progress.id)
        print(response)

        # self.assertEqual(response.content,
        #                 "Can't change assignee once meeting is started!")

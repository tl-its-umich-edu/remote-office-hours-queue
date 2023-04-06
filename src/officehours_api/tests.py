from unittest import mock

from django.test import TestCase, override_settings

from twilio.base.exceptions import TwilioRestException

from officehours_api.models import User, Queue, Meeting

from officehours_api.serializers import MeetingSerializer

from rest_framework.exceptions import ValidationError


@override_settings(TWILIO_ACCOUNT_SID='aaa', TWILIO_AUTH_TOKEN='bbb', TWILIO_MESSAGING_SERVICE_SID='ccc')
class NotificationTestCase(TestCase):
    def setUp(self):
        self.foo = User.objects.create(username='foo', email='foo@example.com')
        self.configure_profile(self.foo, '+15555550000')
        self.bar = User.objects.create(username='bar', email='bar@example.com')
        self.configure_profile(self.bar, '+15555550001')
        self.baz = User.objects.create(username='baz', email='baz@example.com')
        self.configure_profile(self.baz, '+15555550002')
        self.attendeeoptout = User.objects.create(username='attendeeoptout', email='attendeeoptout@example.com')
        self.configure_profile(self.attendeeoptout, '+15555550003', opt_out=True)
        self.attendeebad = User.objects.create(username='attendeebad', email='attendeebad@example.com')
        self.configure_profile(self.attendeebad, '+1555555001')
        self.hostie = User.objects.create(username='hostie', email='hostie@example.com')
        self.configure_profile(self.hostie, '+15555551111')
        self.hostacular = User.objects.create(username='hostacular', email='hostacular@example.com')
        self.configure_profile(self.hostacular, '+15555552222')
        self.hostoptout = User.objects.create(username='hostoptout', email='hostoptout@example.com')
        self.configure_profile(self.hostoptout, '+15555553333', opt_out=True)
        self.hostbad = User.objects.create(username='hostbad', email='hostbad@example.com')
        self.configure_profile(self.hostbad, '+1555555000')
        self.queue = Queue.objects.create(
            name='NotificationTest',
        )
        self.queue.hosts.set([self.hostie, self.hostacular, self.hostoptout])
        self.queue.save()
        self.exceptions = 0

    @staticmethod
    def configure_profile(user, phone_number, opt_out=False):
        user.profile.phone_number = phone_number
        user.profile.notify_me_attendee = not opt_out
        user.profile.notify_me_host = not opt_out
        user.profile.save()

    def create_meeting(self, attendees, start=False):
        m = Meeting.objects.create(
            queue=self.queue,
            backend_type='inperson',
        )
        m.attendees.set(attendees)
        if start:
            m.assignee = self.hostie
            m.start()
            m.save()
        return m

    @staticmethod
    def get_receivers(mock_twilio: mock.MagicMock):
        return {c.kwargs['to'] for c in mock_twilio.mock_calls if 'to' in c.kwargs}

    def setup_bad_phone_test(self, mock_twilio: mock.MagicMock):
        def side_effect(to=None, messaging_service_sid=None, body=None):
            if len(to) < 12:
                self.exceptions += 1
                raise TwilioRestException(500, '')
        mock_twilio.messages.create.side_effect = side_effect
    
    def assert_twilio_exception_logged(self, do):
        with self.assertLogs(logger='officehours_api.notifications', level='ERROR') as cm:
            do()
            self.assertIn('Twilio returned the following information', cm.output[0])
            self.assertIn('Traceback', cm.output[0])

    @mock.patch('officehours_api.notifications.twilio')
    def test_first_meeting_notifies_hosts(self, mock_twilio: mock.MagicMock):
        self.create_meeting([self.foo, self.bar, self.baz, self.attendeeoptout])
        self.assertEqual(mock_twilio.messages.create.call_count, 2)
        receivers = self.get_receivers(mock_twilio)
        self.assertTrue(
            receivers >=
            {'+15555551111','+15555552222',}
        )
    
    @mock.patch('officehours_api.notifications.twilio')
    def test_first_meeting_bad_phone_logs_exception(self, mock_twilio: mock.MagicMock):
        self.queue.hosts.set([self.hostie, self.hostbad, self.hostacular, self.hostoptout])
        self.queue.save()
        self.setup_bad_phone_test(mock_twilio)
        self.assert_twilio_exception_logged(lambda: self.create_meeting([self.foo, self.bar, self.baz, self.attendeeoptout]))
        self.assertEqual(mock_twilio.messages.create.call_count, 3)
        receivers = self.get_receivers(mock_twilio)
        self.assertTrue(
            receivers >=
            {'+15555551111','+15555552222',}
        )
        self.assertEqual(self.exceptions, 1)

    @mock.patch('officehours_api.notifications.twilio')
    def test_first_meeting_doesnt_notify_optout_hosts(self, mock_twilio: mock.MagicMock):
        self.create_meeting([self.foo, self.bar, self.baz, self.attendeeoptout])
        self.assertEqual(mock_twilio.messages.create.call_count, 2)
        receivers = self.get_receivers(mock_twilio)
        self.assertFalse(
            receivers >=
            {'+15555553333',}
        )

    @mock.patch('officehours_api.notifications.twilio')
    def test_first_meeting_doesnt_notify_attendees(self, mock_twilio: mock.MagicMock):
        self.create_meeting([self.foo, self.bar, self.baz])
        receivers = self.get_receivers(mock_twilio)
        self.assertFalse(
            receivers >=
            {'+15555550000', '+15555550001', '+15555550002',}
        )

    @mock.patch('officehours_api.notifications.twilio')
    def test_second_meeting_doesnt_notify_hosts(self, mock_twilio: mock.MagicMock):
        self.create_meeting([self.foo,])
        mock_twilio.reset_mock()
        self.create_meeting([self.bar, self.baz,])
        receivers = self.get_receivers(mock_twilio)
        self.assertFalse(
            receivers >=
            {'+15555551111', '+15555552222',}
        )

    @mock.patch('officehours_api.notifications.twilio')
    def test_meeting_start_bad_phone_logs_exception(self, mock_twilio: mock.MagicMock):
        self.setup_bad_phone_test(mock_twilio)
        self.assert_twilio_exception_logged(lambda: self.create_meeting([self.attendeebad, self.bar, self.baz], True))
        receivers = self.get_receivers(mock_twilio)
        self.assertTrue(
            receivers >=
            {'+15555550001', '+15555550002',}
        )
        self.assertEqual(self.exceptions, 1)

    @mock.patch('officehours_api.notifications.twilio')
    def test_meeting_start_doesnt_notify_optout(self, mock_twilio: mock.MagicMock):
        self.create_meeting([self.bar, self.baz, self.attendeeoptout,], True)
        receivers = self.get_receivers(mock_twilio)
        self.assertFalse(
            receivers >=
            {'+15555550003',}
        )

    @mock.patch('officehours_api.notifications.twilio')
    def test_meeting_start_doesnt_notify_other(self, mock_twilio: mock.MagicMock):
        m1 = self.create_meeting([self.foo,])
        self.create_meeting([self.baz,])
        m1.assignee = self.hostie
        m1.start()
        m1.save()
        receivers = self.get_receivers(mock_twilio)
        self.assertFalse('+15555550002' in receivers)

    @mock.patch('officehours_api.notifications.twilio')
    def test_meeting_start_notifies_attendees(self, mock_twilio: mock.MagicMock):
        self.create_meeting([self.foo, self.bar,], True)
        receivers = self.get_receivers(mock_twilio)
        self.assertTrue(
            receivers >=
            {'+15555550000', '+15555550001'}
        )

class MeetingSerializerTestCase(TestCase):
    def setUp(self):
        self.user1 = User.objects.create(username='user1')
        self.user2 = User.objects.create(username='user2')

    def test_backend_type_invalid(self):
        queue = Queue.objects.create(name='test queue', status='open', allowed_backends=['zoom'])
        queue.hosts.add(self.user1)
        data = {
            'queue': queue.id,
            'attendee_ids': [self.user2.id],
            'agenda': 'test agenda',
            'assignee_id': self.user1.id,
            'backend_type': 'inperson'
        }
        serializer = MeetingSerializer(data=data)
        with self.assertRaises(ValidationError) as cm:
            serializer.is_valid(raise_exception=True)
        error = str(cm.exception.detail['non_field_errors'][0])
        self.assertEqual(error, 'Invalid backend type!')
    
    def test_backend_type_valid(self):
        queue = Queue.objects.create(name='test queue', status='open', allowed_backends=['inperson'])
        queue.hosts.add(self.user1)
        data = {
            'queue': queue.id,
            'attendee_ids': [self.user2.id],
            'agenda': 'test agenda',
            'assignee_id': self.user1.id,
            'backend_type': 'inperson'
        }
        serializer = MeetingSerializer(data=data)
        valid = serializer.is_valid(raise_exception=False)
        self.assertTrue(valid)
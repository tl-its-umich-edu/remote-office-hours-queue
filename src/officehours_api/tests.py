from unittest import mock

from django.test import TransactionTestCase, override_settings

from officehours_api.models import User, Queue, Meeting


@override_settings(TWILIO_ACCOUNT_SID='aaa', TWILIO_AUTH_TOKEN='bbb', TWILIO_PHONE_FROM='+15555552323')
class NotificationTestCase(TransactionTestCase):
    def setUp(self):
        self.foo = User.objects.create(username='foo', email='foo@example.com')
        self.foo.profile.phone_number = '+15555550000'
        self.foo.profile.save()
        self.bar = User.objects.create(username='bar', email='bar@example.com')
        self.bar.profile.phone_number = '+15555550001'
        self.bar.profile.save()
        self.baz = User.objects.create(username='baz', email='baz@example.com')
        self.baz.profile.phone_number = '+15555550002'
        self.baz.profile.save()
        self.hostie = User.objects.create(username='hostie', email='hostie@example.com')
        self.hostie.profile.phone_number = '+15555551111'
        self.hostie.profile.save()
        self.hostacular = User.objects.create(username='hostacular', email='hostacular@example.com')
        self.hostacular.profile.phone_number = '+15555552222'
        self.hostacular.profile.save()
        self.queue = Queue.objects.create(
            name='NotificationTest',
        )
        self.queue.hosts.set([self.hostie, self.hostacular])
        self.queue.save()

    def create_meeting(self, attendees):
        m = Meeting.objects.create(
            queue=self.queue,
            backend_type='inperson',
        )
        m.attendees.set(attendees)
        return m

    @staticmethod
    def get_receivers(MockTwilio: mock.MagicMock):
        return {c.kwargs['to'] for c in MockTwilio.mock_calls if 'to' in c.kwargs}

    @mock.patch('officehours_api.notifications.TwilioClient')
    def test_first_meeting_notifies_hosts(self, MockTwilio: mock.MagicMock):
        self.create_meeting([self.foo, self.bar, self.baz])
        self.assertEqual(MockTwilio().messages.create.call_count, 2)
        receivers = self.get_receivers(MockTwilio)
        self.assertTrue(
            receivers >=
            {'+15555551111','+15555552222',}
        )

    @mock.patch('officehours_api.notifications.TwilioClient')
    def test_first_meeting_doesnt_notify_attendees(self, MockTwilio: mock.MagicMock):
        self.create_meeting([self.foo, self.bar, self.baz])
        receivers = self.get_receivers(MockTwilio)
        self.assertFalse(
            receivers >=
            {'+15555550000', '+15555550001', '+15555550002',}
        )

    @mock.patch('officehours_api.notifications.TwilioClient')
    def test_second_meeting_doesnt_notify_hosts(self, MockTwilio: mock.MagicMock):
        self.create_meeting([self.foo,])
        MockTwilio.reset_mock()
        self.create_meeting([self.bar, self.baz,])
        receivers = self.get_receivers(MockTwilio)
        self.assertFalse(
            receivers >=
            {'+15555551111', '+15555552222',}
        )

    @mock.patch('officehours_api.notifications.TwilioClient')
    def test_first_meeting_removal_notifies_next_in_line(self, MockTwilio: mock.MagicMock):
        m1 = self.create_meeting([self.foo,])
        self.create_meeting([self.bar, self.baz])
        MockTwilio.reset_mock()
        m1.delete()
        receivers = self.get_receivers(MockTwilio)
        self.assertTrue(
            receivers >=
            {'+15555550001', '+15555550002',}
        )

    @mock.patch('officehours_api.notifications.TwilioClient')
    def test_second_meeting_removal_notifies_none(self, MockTwilio: mock.MagicMock):
        self.create_meeting([self.foo,])
        m2 = self.create_meeting([self.bar, self.baz])
        MockTwilio.reset_mock()
        m2.delete()
        receivers = self.get_receivers(MockTwilio)
        self.assertFalse('+15555550001' in receivers)
        self.assertFalse('+15555550002' in receivers)

    @mock.patch('officehours_api.notifications.TwilioClient')
    def test_first_meeting_removal_doesnt_notify_second_in_line(self, MockTwilio: mock.MagicMock):
        m1 = self.create_meeting([self.foo,])
        self.create_meeting([self.bar,])
        self.create_meeting([self.baz,])
        MockTwilio.reset_mock()
        m1.delete()
        receivers = self.get_receivers(MockTwilio)
        self.assertFalse('+15555550002' in receivers)

from django.test import TestCase
from django.utils import timezone
from django.contrib.auth.models import AnonymousUser
from officehours_api.models import User, Queue, Meeting, QueueAnnouncement
from officehours_api.serializers import QueueAttendeeSerializer, QueueHostSerializer


class AnnouncementSerializerTestCase(TestCase):
    """
    Test the get_current_announcement method of QueueAttendeeSerializer and QueueHostSerializer
    to ensure proper filtering and sorting of announcements.
    """

    def setUp(self):
        # Create users
        self.host_one = User.objects.create(username='host_one', email='host1@example.com')
        self.host_two = User.objects.create(username='host_two', email='host2@example.com')
        self.attendee = User.objects.create(username='attendee', email='attendee@example.com')
        
        # Create queue with two hosts
        self.queue = Queue.objects.create(name='Test Queue')
        self.queue.hosts.set([self.host_one, self.host_two])
        self.queue.save()
        
        # Create announcements with explicit timestamps to ensure proper ordering
        now = timezone.now()
        oldest_announcement_time = now - timezone.timedelta(minutes=2)
        middle_announcement_time = now - timezone.timedelta(minutes=1)
        newest_announcement_time = now
        
        self.announcement_host_one = QueueAnnouncement.objects.create(
            queue=self.queue,
            text='Announcement from Host One',
            created_by=self.host_one,
            active=True,
            created_at=oldest_announcement_time
        )
        self.announcement_host_two = QueueAnnouncement.objects.create(
            queue=self.queue,
            text='Announcement from Host Two',
            created_by=self.host_two,
            active=True,
            created_at=middle_announcement_time
        )
        
        # Create a third announcement from host_one (newest)
        self.announcement_host_one_newer = QueueAnnouncement.objects.create(
            queue=self.queue,
            text='Newer Announcement from Host One',
            created_by=self.host_one,
            active=True,
            created_at=newest_announcement_time
        )

    def test_attendee_assigned_to_host_sees_all_announcements_with_assigned_host_first(self):
        """
        Test that an attendee assigned to a host sees all announcements,
        with announcements from their assigned host listed first.
        """
        # Create a meeting where attendee is assigned to host_one
        meeting = Meeting.objects.create(
            queue=self.queue,
            backend_type='inperson',
            assignee=self.host_one
        )
        meeting.attendees.set([self.attendee])
        meeting.save()
        
        # Get announcements for the attendee
        serializer = QueueAttendeeSerializer(
            self.queue,
            context={'user': self.attendee}
        )
        announcements = serializer.data['current_announcement']
        
        # Should see 3 announcements
        self.assertEqual(len(announcements), 3)
        
        # First two should be from host_one (the assigned host), newest first
        self.assertEqual(announcements[0]['created_by']['username'], 'host_one')
        self.assertEqual(announcements[0]['text'], 'Newer Announcement from Host One')
        
        self.assertEqual(announcements[1]['created_by']['username'], 'host_one')
        self.assertEqual(announcements[1]['text'], 'Announcement from Host One')
        
        # Last should be from host_two
        self.assertEqual(announcements[2]['created_by']['username'], 'host_two')
        self.assertEqual(announcements[2]['text'], 'Announcement from Host Two')

    def test_attendee_not_assigned_to_host_sees_all_announcements_chronologically(self):
        """
        Test that an attendee not assigned to a host sees all announcements
        in reverse chronological order (newest first).
        """
        # Create a meeting with no assignee
        meeting = Meeting.objects.create(
            queue=self.queue,
            backend_type='inperson'
        )
        meeting.attendees.set([self.attendee])
        meeting.save()
        
        # Get announcements for the attendee
        serializer = QueueAttendeeSerializer(
            self.queue,
            context={'user': self.attendee}
        )
        announcements = serializer.data['current_announcement']
        
        # Should see 3 announcements in chronological order (newest first)
        self.assertEqual(len(announcements), 3)
        self.assertEqual(announcements[0]['text'], 'Newer Announcement from Host One')
        self.assertEqual(announcements[1]['text'], 'Announcement from Host Two')
        self.assertEqual(announcements[2]['text'], 'Announcement from Host One')

    def test_host_sees_all_announcements_chronologically(self):
        """
        Test that a host sees all announcements in reverse chronological order,
        without any special sorting based on assignment.
        """
        # Get announcements as a host
        serializer = QueueHostSerializer(
            self.queue,
            context={'user': self.host_one}
        )
        announcements = serializer.data['current_announcement']
        
        # Should see 3 announcements in reverse chronological order
        self.assertEqual(len(announcements), 3)
        self.assertEqual(announcements[0]['text'], 'Newer Announcement from Host One')
        self.assertEqual(announcements[1]['text'], 'Announcement from Host Two')
        self.assertEqual(announcements[2]['text'], 'Announcement from Host One')

    def test_inactive_announcements_are_excluded(self):
        """
        Test that inactive announcements are not returned.
        """
        # Mark one announcement as inactive
        self.announcement_host_one.active = False
        self.announcement_host_one.save()
        
        # Create a meeting where attendee is assigned to host_one
        meeting = Meeting.objects.create(
            queue=self.queue,
            backend_type='inperson',
            assignee=self.host_one
        )
        meeting.attendees.set([self.attendee])
        meeting.save()
        
        # Get announcements for the attendee
        serializer = QueueAttendeeSerializer(
            self.queue,
            context={'user': self.attendee}
        )
        announcements = serializer.data['current_announcement']
        
        # Should only see 2 announcements (the inactive one is excluded)
        self.assertEqual(len(announcements), 2)
        # Both should be from host_one (assigned) sorted newest first
        self.assertEqual(announcements[0]['text'], 'Newer Announcement from Host One')
        self.assertEqual(announcements[1]['text'], 'Announcement from Host Two')

    def test_unauthenticated_user_sees_no_announcements(self):
        """
        Test that an unauthenticated user cannot see any announcements.
        """
        # Use Django's AnonymousUser for unauthenticated users
        unauthenticated_user = AnonymousUser()
        
        # Get announcements for unauthenticated user
        serializer = QueueAttendeeSerializer(
            self.queue,
            context={'user': unauthenticated_user}
        )
        announcements = serializer.data['current_announcement']
        
        # Should see no announcements
        self.assertEqual(len(announcements), 0)

    def test_attendee_assigned_to_host_with_no_announcements_from_host(self):
        """
        Test that if an attendee is assigned to a host who has no announcements,
        they still see all announcements in chronological order.
        """
        # Create another host with no announcements
        host_three = User.objects.create(username='host_three', email='host3@example.com')
        
        # Create a meeting where attendee is assigned to host_three
        meeting = Meeting.objects.create(
            queue=self.queue,
            backend_type='inperson',
            assignee=host_three
        )
        meeting.attendees.set([self.attendee])
        meeting.save()
        
        # Get announcements for the attendee
        serializer = QueueAttendeeSerializer(
            self.queue,
            context={'user': self.attendee}
        )
        announcements = serializer.data['current_announcement']
        
        # Should see 3 announcements in reverse chronological order
        self.assertEqual(len(announcements), 3)
        self.assertEqual(announcements[0]['text'], 'Newer Announcement from Host One')
        self.assertEqual(announcements[1]['text'], 'Announcement from Host Two')
        self.assertEqual(announcements[2]['text'], 'Announcement from Host One')

    def test_no_announcements_returns_empty_list(self):
        """
        Test that when a queue has no announcements, an empty list is returned.
        """
        # Create a new queue with no announcements
        empty_queue = Queue.objects.create(name='Empty Queue')
        empty_queue.hosts.set([self.host_one])
        empty_queue.save()
        
        # Create a meeting in the empty queue
        meeting = Meeting.objects.create(
            queue=empty_queue,
            backend_type='inperson'
        )
        meeting.attendees.set([self.attendee])
        meeting.save()
        
        # Get announcements for the attendee
        serializer = QueueAttendeeSerializer(
            empty_queue,
            context={'user': self.attendee}
        )
        announcements = serializer.data['current_announcement']
        
        # Should see no announcements
        self.assertEqual(len(announcements), 0)

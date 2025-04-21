from django.test import TestCase
from django.contrib.auth import get_user_model
from officehours_api.models import Queue, Meeting
from officehours_api.admin_filters import ActualQueuesFilter

User = get_user_model()

class ActualQueuesFilterTest(TestCase):
    """
    Tests for the ActualQueuesFilter used in the Meeting admin filter.
    Ensures only queues with meetings show up and that filtering works as expected.
    """

    def setUp(self):
        # Create a queue that will be used in a meeting
        self.used_queue = Queue.objects.create(name="Used Queue", status='active')

        # Create a queue that is not associated with any meeting
        self.unused_queue = Queue.objects.create(name="Unused Queue", status='active')

        # Create a user and a meeting with the used_queue
        self.user = User.objects.create_user(username='user1', password='test')
        self.meeting = Meeting.objects.create(queue=self.used_queue, assignee=self.user,
                                              agenda="Test agenda", backend_type='inperson',
                                              backend_metadata={'location': 'Room 1'})

        class DummyAdmin:
            def get_queryset(self, request):
                return Meeting.objects.all()

        self.model_admin = DummyAdmin()
        self.request = None

    def test_lookups_shows_only_queues_with_meetings(self):
        filter_instance = ActualQueuesFilter(self.request, {}, Meeting, self.model_admin)
        lookups = filter_instance.lookups(self.request, self.model_admin)

        self.assertIn((self.used_queue.id, self.used_queue.name), lookups)
        self.assertNotIn((self.unused_queue.id, self.unused_queue.name), lookups)

    def test_queryset_filters_correctly(self):
        filter_instance = ActualQueuesFilter(
            self.request,
            {'queue': str(self.used_queue.id)},
            Meeting,
            self.model_admin
        )
        result = filter_instance.queryset(self.request, Meeting.objects.all())
        self.assertIn(self.meeting, result)

        # Should return nothing for the unused queue
        filter_instance = ActualQueuesFilter(
            self.request,
            {'queue': str(self.unused_queue.id)},
            Meeting,
            self.model_admin
        )
        result = filter_instance.queryset(self.request, Meeting.objects.all())
        self.assertFalse(result.exists(), "Expected no meetings to be returned for a queue without meetings")


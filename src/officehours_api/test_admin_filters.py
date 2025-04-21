from django.test import TestCase
from django.contrib.auth import get_user_model
from officehours_api.models import Queue
from officehours_api.admin_filters import ActualHostsFilter
from django.contrib.admin import site

User = get_user_model()

class ActualHostsFilterTest(TestCase):
    """
    Test suite for the ActualHostsFilter custom admin filter.
    Ensures only users that are actual hosts appear in the admin filter options.
    """

    def setUp(self):
        self.host_user = User.objects.create_user(username='hostuser', password='test')
        self.non_host_user = User.objects.create_user(username='nonhostuser', password='test')

        self.queue = Queue.objects.create(name="Test Queue", status='active')  # add name if required
        self.queue.hosts.add(self.host_user)
        self.queue.refresh_from_db()
        self.queue.save()

        class DummyAdmin:
            def get_queryset(self, request):
                return Queue.objects.all()

        self.model_admin = DummyAdmin()
        self.request = None

    def test_lookups_shows_only_hosts(self):
        """
        Verifies that only users who are actual hosts show up in the filter options.
        """
        filter_instance = ActualHostsFilter(self.request, {}, Queue, self.model_admin)
        lookups = filter_instance.lookups(self.request, self.model_admin)
        self.assertIn((self.host_user.id, self.host_user.username), lookups)
        self.assertNotIn((self.non_host_user.id, self.non_host_user.username), lookups)

    def test_queryset_filters_correctly(self):
        """
        Verifies that filtering by a host user returns only the queues they host.
        """
        # Filter using host_user (should return self.queue)
        filter_instance = ActualHostsFilter(
            self.request,
            {'hosts': str(self.host_user.id)},
            Queue,
            self.model_admin
        )
        result = filter_instance.queryset(self.request, Queue.objects.all())
        self.assertIn(self.queue, result)

        # Filter using non_host_user (should return nothing)
        filter_instance = ActualHostsFilter(
            self.request,
            {'hosts': str(self.non_host_user.id)},
            Queue,
            self.model_admin
        )
        result = filter_instance.queryset(self.request, Queue.objects.all())

        # Robust way to check that no queues are returned
        self.assertFalse(result.exists(), "Expected no queues to be returned for non-host user")


# admin_filters.py
# This file defines custom admin filters for the Django admin interface.
# Specifically, the ActualHostsFilter class replaces the default host filter
# in the Queue admin list view, showing only users who are actually hosts
# of at least one queue (instead of all users in the system).

from django.contrib.admin import SimpleListFilter
from django.contrib.auth.models import User

class ActualHostsFilter(SimpleListFilter):
    title = 'hosts'
    parameter_name = 'hosts'

    def lookups(self, request, model_admin):
        # Only include users who are hosts on at least one queue
        host_users = User.objects.filter(queue__isnull=False).distinct()
        return [(user.id, user.username) for user in host_users]

    def queryset(self, request, queryset):
        if self.value():
            try:
                host_id = int(self.value())
                return queryset.filter(hosts__id=host_id)
            except ValueError:
                return queryset.none()
        return queryset

# Custom admin filter that limits the "by queue" filter in the Meeting admin page
# to only show queues that are actually associated with one or more meetings.

class ActualQueuesFilter(SimpleListFilter):
    # Label for the filter in the admin UI
    title = 'By queues'

    # This is the parameter name used in the URL and request.GET
    parameter_name = 'queue'

    def lookups(self, request, model_admin):
        """
        Returns a list of queue choices to display in the filter dropdown.
        Only includes queues that are linked to at least one meeting.
        """
        from officehours_api.models import Queue
        queues_with_meetings = Queue.objects.filter(meeting__isnull=False).distinct()
        return [(queue.id, queue.name or f"Queue {queue.id}") for queue in queues_with_meetings]

    def queryset(self, request, queryset):
        """
        Filters the queryset of meetings based on the selected queue.
        """
        if self.value():
            try:
                queue_id = int(self.value())
                return queryset.filter(queue__id=queue_id)
            except ValueError:
                # Invalid value passed — return nothing
                return queryset.none()
        return queryset


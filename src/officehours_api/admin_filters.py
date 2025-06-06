from django.contrib.admin import SimpleListFilter
from django.contrib.auth.models import User
from officehours_api.models import Queue


class ActiveHosts(SimpleListFilter):
    title = 'hosts'
    parameter_name = 'hosts'

    def lookups(self, request, _):
        host_users = User.objects.filter(queue__isnull=False).distinct()
        return [(u.id, u.username) for u in host_users]

    def queryset(self, request, queryset):
        if self.value():
            try:
                host_id = int(self.value())
                return queryset.filter(hosts__id=host_id)
            except ValueError:
                return queryset.none()
        return queryset


class ActiveQueues(SimpleListFilter):
    title = 'queues'
    parameter_name = 'queue'

    def lookups(self, request, _):
        meeting_queues = Queue.objects.filter(meeting__isnull=False).distinct()
        return [(q.id, q.name) for q in meeting_queues]

    def queryset(self, request, queryset):
        if self.value():
            try:
                queue_id = int(self.value())
                return queryset.filter(queue__id=queue_id)
            except ValueError:
                return queryset.none()
        return queryset

from django.contrib.admin import SimpleListFilter
from django.contrib.auth.models import User

from officehours_api.models import Queue


class BaseActiveFilter(SimpleListFilter):
    def lookups(self, request, _):
        related_objects = self.get_objects()
        return sorted(
            [(obj.id, obj.name if hasattr(obj, 'name') else obj.username) for
             obj in related_objects], key=lambda λ: λ[1])

    def queryset(self, request, queryset):
        if self.value():
            try:
                obj_id = int(self.value())
                return queryset.filter(**{self.filter_key: obj_id})
            except ValueError:
                return queryset.none()
        return queryset

    def get_objects(self):
        raise NotImplementedError('Subclasses must implement `get_objects`')

    @property
    def filter_key(self):
        raise NotImplementedError('Subclasses must define `filter_key`')


class ActiveHosts(BaseActiveFilter):
    title = 'hosts'
    parameter_name = 'hosts'
    filter_key = 'hosts__id'

    def get_objects(self):
        return User.objects.filter(queue__isnull=False).distinct()


class ActiveQueues(BaseActiveFilter):
    title = 'queues'
    parameter_name = 'queue'
    filter_key = 'queue__id'

    def get_objects(self):
        return Queue.objects.filter(meeting__isnull=False).distinct()

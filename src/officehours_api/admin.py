import logging

#Added for custom host filter
from django.contrib.admin import SimpleListFilter
from django.contrib.auth import get_user_model
from officehours_api.admin_filters import ActualHostsFilter
from officehours_api.admin_filters import ActualQueuesFilter

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from django.http import HttpResponse
from safedelete.admin import SafeDeleteAdmin, highlight_deleted

from officehours_api.models import Queue, Meeting, Attendee, Profile
from officehours_api.views import ExportMeetingStartLogs

logger = logging.getLogger(__name__)

admin.site.site_title = admin.site.site_header = 'ROHQ Admin'
admin.site.index_title = 'Home'


class ExporterAdminMixin:
    actions = ['export_as_csv']

    def queues_queryset(self, request, selection_queryset):
        """
        Return a queryset of queues related to the selection queryset.

        :param request: Django request object.
        :param selection_queryset: A queryset of objects for which queues will
          be found.
        :return: A queryset of queues represented by the selection.
        """
        raise NotImplementedError

    def export_as_csv(self, request, queryset):
        """
        Generate a CSV file of meetings in the queues represented by the
        selection, then return it, triggering a download in the browser.

        :param request: Django request object.
        :param queryset: The queryset of selected objects.
        :return:  CSV file of the queues represented by the selection.
        """

        queues_queryset = self.queues_queryset(request, queryset)
        queue_ids = list(map(lambda λ: λ.id, queues_queryset))

        if len(queue_ids) > 0:
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = \
                'attachment; filename=meeting_data.csv'

            ExportMeetingStartLogs.extract_log(queue_ids, response)

            return response

    export_as_csv.short_description = 'Export meeting data for selection'

#Custom admin filter to only show users who are actual hosts
User = get_user_model()

class HostOnlyFilter(SimpleListFilter):
    title = 'host'
    parameter_name = 'host'

    def lookups(self, request, model_admin):
        hosts = User.objects.filter(queue__isnull=False).distinct()
        return [(host.id, host.username) for host in hosts]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(hosts__id=self.value())
        return queryset

@admin.register(Queue)
class QueueAdmin(ExporterAdminMixin, SafeDeleteAdmin):
    list_display = (('id', highlight_deleted, 'created_at',
                     'status') + SafeDeleteAdmin.list_display)
    #Replaced default 'hosts' filter with custom filter for real hosts only
    list_filter = (ActualHostsFilter, 'status') + SafeDeleteAdmin.list_filter
    search_fields = ['id', 'name']

    def queues_queryset(self, request, selection_queryset):
        """
        In the Queue model, this queryset will already contain only Queues,
        so it can be returned directly.

        :param request: Django request object.
        :param selection_queryset: A queryset of objects for which queues will
          be found.
        :return: A queryset of queues represented by the selection.
        """
        return selection_queryset


class AttendeeInline(admin.TabularInline):
    model = Attendee
    extra = 1


@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):
    list_display = ('id', 'queue', 'created_at')
    list_filter = (ActualQueuesFilter,) # Updated to use custom filter
    search_fields = ['id', 'queue__name']
    inlines = (AttendeeInline,)


class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name_plural = 'profile'


class UserAdmin(ExporterAdminMixin, BaseUserAdmin):
    inlines = (ProfileInline,)

    def queues_queryset(self, request, selection_queryset):
        """
        Take a User selection queryset and return a Queue queryset related to
        it if the User is a host of any Meeting in Queues.  If the User is
        not a host of any Meeting in Queues, display an error message and
        return an empty queryset.

        :param request: Django request object.
        :param selection_queryset: A User queryset for which queues
          will be found.
        :return: A Queue queryset related to the selection.
        """
        queues = Queue.objects.filter(hosts__in=selection_queryset)
        if len(queues) == 0:
            uniqnames = list(map(lambda λ: λ.username, selection_queryset))
            self.message_user(request=request,
                message='No queues were found with the selected '
                        f"user{'s' * (len(uniqnames) > 1)} "
                        f"({', '.join(uniqnames)}) as host.", level='ERROR')
        return queues


admin.site.unregister(User)
admin.site.register(User, UserAdmin)

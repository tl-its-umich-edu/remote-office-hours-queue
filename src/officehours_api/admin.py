import csv
import logging

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

    @staticmethod
    def queues_queryset(selection_queryset):
        """
        Return a queryset of queues related to the selection queryset.

        :param selection_queryset: A queryset of objects for which queues will
          be found.
        :return: A queryset of queues represented by the selection.
        """
        raise NotImplementedError

    def export_as_csv(self, _, queryset):
        """
        Generate a CSV file of meetings in the queues represented by the
        selection, then return it, triggering a download in the browser.

        :param _: Django passes the request object in the first parameter,
          but we don't need it.
        :param queryset: The queryset of selected objects.
        :return:  CSV file of the queues represented by the selection.
        """

        meta = self.model._meta
        queues_queryset = self.queues_queryset(queryset)
        queue_ids = map(lambda λ: λ.id, queues_queryset)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename={meta}.csv'

        ExportMeetingStartLogs.extract_log(queue_ids, response)

        return response

    export_as_csv.short_description = 'Export meeting data for selection'

@admin.register(Queue)
class QueueAdmin(ExporterAdminMixin, SafeDeleteAdmin):
    list_display = ('id', highlight_deleted, 'created_at', 'status') + SafeDeleteAdmin.list_display
    list_filter = ('hosts', 'status',) + SafeDeleteAdmin.list_filter
    search_fields = ['id', 'name']

    @staticmethod
    def queues_queryset(selection_queryset):
        return selection_queryset


class AttendeeInline(admin.TabularInline):
    model = Attendee
    extra = 1


@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):
    list_display = ('id', 'queue', 'created_at')
    list_filter = ('queue',)
    search_fields = ['id', 'queue__name']
    inlines = (AttendeeInline,)


class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name_plural = 'profile'


class UserAdmin(ExporterAdminMixin, BaseUserAdmin):
    inlines = (ProfileInline,)

    @staticmethod
    def queues_queryset(selection_queryset):
        return Queue.objects.filter(hosts__in=selection_queryset)


admin.site.unregister(User)
admin.site.register(User, UserAdmin)

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

    def export_as_csv(self, request, queryset):
        meta = self.model._meta
        field_names = [field.name for field in meta.fields]

        logger.info(f'Exporting {meta} data for selection {queryset}')

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename={meta}.csv'

        logger.info(f'Exporting {meta} data for selection {repr(queryset)}')

        queue_ids = [queue.id for queue in queryset]

        # ExportMeetingStartLogs.as_view()(request, queryset=queryset)
        ExportMeetingStartLogs.extract_log(queue_ids, response)

        return response

        # writer = csv.writer(response)
        #
        # writer.writerow(field_names)
        # for obj in queryset:
        #     writer.writerow([getattr(obj, field) for field in field_names])
        #
        # return response

    export_as_csv.short_description = 'Export meeting data for selection'

@admin.register(Queue)
class QueueAdmin(ExporterAdminMixin, SafeDeleteAdmin):
    list_display = ('id', highlight_deleted, 'created_at', 'status') + SafeDeleteAdmin.list_display
    list_filter = ('hosts', 'status',) + SafeDeleteAdmin.list_filter
    search_fields = ['id', 'name']


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


admin.site.unregister(User)
admin.site.register(User, UserAdmin)

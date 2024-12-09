from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from safedelete.admin import SafeDeleteAdmin, highlight_deleted
from django.http import HttpResponse
import csv
from officehours_api.models import Queue
from officehours_api.models import Queue, Meeting, Attendee, Profile

@admin.action(description="Export selected Queues with details to CSV")
def export_selected_queues_with_details(modeladmin, request, queryset):

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="selected_queues_with_details.csv"'

    writer = csv.writer(response)
    writer.writerow([
        'Queue ID', 
        'Queue Name', 
        'Status', 
        'Created At', 
        'Hosts', 
        'Allowed Backends', 
        'Description', 
        'Meeting Count', 
        'Attendee Count'
    ])

    for queue in queryset.prefetch_related('hosts', 'meeting_set__attendees'):
        hosts = ', '.join([host.username for host in queue.hosts.all()])
        allowed_backends = ', '.join(queue.allowed_backends)
        meetings = queue.meeting_set.all()
        meeting_count = meetings.count()
        attendee_count = sum(meeting.attendees.count() for meeting in meetings)
        writer.writerow([
            queue.id, 
            queue.name, 
            queue.status, 
            queue.created_at, 
            hosts, 
            allowed_backends, 
            queue.description, 
            meeting_count, 
            attendee_count
        ])
    return response

@admin.register(Queue)
class QueueAdmin(SafeDeleteAdmin):
    list_display = ('id', highlight_deleted, 'created_at', 'status') + SafeDeleteAdmin.list_display
    list_filter = ('hosts', 'status',) + SafeDeleteAdmin.list_filter
    search_fields = ['id', 'name']
    actions = SafeDeleteAdmin.actions + (export_selected_queues_with_details,)

    
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


class UserAdmin(BaseUserAdmin):
    inlines = (ProfileInline,)


admin.site.unregister(User)
admin.site.register(User, UserAdmin)

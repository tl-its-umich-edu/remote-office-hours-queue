from django.contrib import admin
from safedelete.admin import SafeDeleteAdmin, highlight_deleted
from officehours_api.models import Queue, Meeting


@admin.register(Queue)
class QueueAdmin(SafeDeleteAdmin):
    list_display = ('id', highlight_deleted, 'created_at') + SafeDeleteAdmin.list_display
    list_filter = ('hosts',) + SafeDeleteAdmin.list_filter
    search_fields = ['id', 'name']


@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):
    list_display = ('id', 'queue', 'started_at')
    list_filter = ('queue',)
    search_fields = ['id', 'queue__name']

from django.contrib.admin import site, register, ModelAdmin, \
    TabularInline
from django.utils.html import format_html

from .exporter import ModelAdminExporter
# import models from officehours_api, but resolve references
from ..officehours_api import models

@register(models.Meeting)
class MeetingAdmin(ModelAdminExporter):
    list_display = (
        'queue',
        'host',
        'start',
        'end',
    )

    search_fields = (
        'queue__name',
        'host__username',
    )

    list_filter = (
        'queue',
        'host',
    )

    ordering = (
        'queue',
        'host',
        'start',
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('queue', 'host')

    def get_host(self, obj):
        return obj.host.username

    get_host.short_description = 'Host'

    def get_queue(self, obj):
        return obj.queue.name

    get_queue.short_description = 'Queue'

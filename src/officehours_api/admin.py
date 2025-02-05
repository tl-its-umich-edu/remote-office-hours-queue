import csv

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from django.http import HttpResponse
from safedelete.admin import SafeDeleteAdmin, highlight_deleted

from officehours_api.models import Queue, Meeting, Attendee, Profile


@admin.register(Queue)
class QueueAdmin(SafeDeleteAdmin):
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
    actions = ['export_as_csv']

    def export_as_csv(self, request, queryset):
        meta = self.model._meta
        field_names = [field.name for field in meta.fields]

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename={meta}.csv'
        writer = csv.writer(response)

        writer.writerow(field_names)
        for obj in queryset:
            row = writer.writerow([getattr(obj, field) for field in field_names])

        return response

    export_as_csv.short_description = "Export Selected"



class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name_plural = 'profile'


class UserAdmin(BaseUserAdmin):
    inlines = (ProfileInline,)


admin.site.unregister(User)
admin.site.register(User, UserAdmin)

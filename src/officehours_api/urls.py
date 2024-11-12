from django.urls import path
from django.conf import settings
from officehours_api import views


urlpatterns = [
    path('', views.api_root, name='api-root'),
    path('users', views.UserList.as_view(), name='user-list'),
    path('users/<int:pk>', views.UserDetail.as_view(), name='user-detail'),
    path('users/<int:pk>/otp', views.UserOTP.as_view(), name='user-otp'),
    path('users/<str:username>', views.UserUniqnameDetail.as_view(), name='user-uniqname-detail'),
    path('queues', views.QueueList.as_view(), name='queue-list'),
    path('queues/<int:pk>', views.QueueDetail.as_view(), name='queue-detail'),
    path('queues/<int:pk>/hosts/<int:user_id>', views.QueueHostDetail.as_view(), name='queuehost-detail'),
    path('queues_search', views.QueueListSearch.as_view(), name='queue-search'),
    path('meetings', views.MeetingList.as_view(), name='meeting-list'),
    path('meetings/<int:pk>', views.MeetingDetail.as_view(), name='meeting-detail'),
    path('meetings/<int:pk>/start', views.MeetingStart.as_view(), name='meeting-start'),
    path('attendees', views.AttendeeList.as_view(), name='attendee-list'),
    path('attendees/<int:pk>', views.AttendeeDetail.as_view(), name='attendee-detail'),
    path('export_meeting_start_logs/<int:queue_id>', views.ExportMeetingStartLogs.as_view(), name='export-meeting-start-logs-with-queue'),
    path('export_meeting_start_logs', views.ExportMeetingStartLogs.as_view(), name='export-meeting-start-logs'),
]

if settings.DEBUG:
    from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

    urlpatterns += [
        path('schema/', SpectacularAPIView.as_view(), name='schema'),
        path('schema/swagger-ui', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui')
    ]

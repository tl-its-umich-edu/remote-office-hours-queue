from django.urls import path
from django.conf import settings
from officehours_api import views


urlpatterns = [
    path('', views.api_root, name='api-root'),
    path('users/', views.UserList.as_view(), name='user-list'),
    path('users/<int:pk>/', views.UserDetail.as_view(), name='user-detail'),
    path('queues/', views.QueueList.as_view(), name='queue-list'),
    path('queues/<int:pk>/', views.QueueDetail.as_view(), name='queue-detail'),
    path('meetings/', views.MeetingList.as_view(), name='meeting-list'),
    path('meetings/<int:pk>/', views.MeetingDetail.as_view(), name='meeting-detail'),
    path('attendees/', views.AttendeeList.as_view(), name='attendee-list'),
    path('attendees/<int:pk>/', views.AttendeeDetail.as_view(), name='attendee-detail'),
]

if settings.DEBUG:
    from drf_yasg.views import get_schema_view as get_yasg_view
    from drf_yasg import openapi

    yasg_view = get_yasg_view(
        openapi.Info(
            title='Office Hours API',
            default_version='v1',
        ),
    )

    urlpatterns += [
        path('swagger', yasg_view.with_ui('swagger', cache_timeout=0), name='swagger'),
        path('redoc', yasg_view.with_ui('redoc', cache_timeout=0), name='redoc'),
    ]

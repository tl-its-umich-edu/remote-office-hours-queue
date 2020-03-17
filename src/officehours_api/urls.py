from django.urls import path
from officehours_api import views

urlpatterns = [
    path('', views.api_root, name='api-root'),
    path('users/', views.UserList.as_view(), name='user-list'),
    path('users/<int:pk>/', views.UserDetail.as_view(), name='user-detail'),
    path('hosts/', views.HostList.as_view(), name='host-list'),
    path('hosts/<int:pk>/', views.HostDetail.as_view(), name='host-detail'),
    path('queues/', views.QueueList.as_view(), name='queue-list'),
    path('queues/<int:pk>/', views.QueueDetail.as_view(), name='queue-detail'),
    path('meetings/', views.MeetingList.as_view(), name='meeting-list'),
    path('meetings/<int:pk>/', views.MeetingDetail.as_view(), name='meeting-detail'),
    path('attendees/', views.AttendeeList.as_view(), name='attendee-list'),
    path('attendees/<int:pk>/', views.AttendeeDetail.as_view(), name='attendee-detail'),
]

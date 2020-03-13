from django.urls import path

from .views import IndexView, MeetingView


urlpatterns = [
    path('', IndexView.as_view(), name='home'),
    path('queue/<str:owner>/', MeetingView.as_view(), name='meeting'),
]

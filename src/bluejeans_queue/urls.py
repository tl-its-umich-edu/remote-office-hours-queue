from django.urls import path

from .views import IndexView, MeetingSearchView, MeetingView, ManageView


urlpatterns = [
    path('', IndexView.as_view(), name='home'),
    path('queue/', MeetingSearchView.as_view(), name='meeting_search'),
    path('queue/<str:owner>/', MeetingView.as_view(), name='meeting'),
    path('manage/', ManageView.as_view(), name='manage'),
]

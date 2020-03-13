from django.urls import path

from .views import IndexView, QueueView


urlpatterns = [
    path('', IndexView.as_view(), name='home'),
    path('queue/', QueueView.as_view(), name='queue'),
]

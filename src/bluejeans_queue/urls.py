from django.urls import path

from .views import SpaView


urlpatterns = [
    path('', SpaView.as_view(), name='home'),
    path('queue/', SpaView.as_view()),
    path('queue/<str:owner>/', SpaView.as_view()),
    path('manage/', SpaView.as_view()),
]

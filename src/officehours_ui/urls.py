from django.urls import path

from .views import SpaView


urlpatterns = [
    path('', SpaView.as_view(), name='home'),
    path('queue/', SpaView.as_view()),
    path('queue/<str:queue_id>/', SpaView.as_view()),
    path('manage/', SpaView.as_view()),
    path('manage/<str:queue_id>/', SpaView.as_view()),
    path('search/<str:term>/', SpaView.as_view()),
    path('contact/', SpaView.as_view(), name='contact'),
]

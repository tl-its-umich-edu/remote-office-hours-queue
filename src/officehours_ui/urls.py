from django.urls import path
from django.conf import settings
from django.views.generic.base import RedirectView

from .views import SpaView, AuthPromptView, auth_callback_view, privacy_policy_redirect_view


urlpatterns = [
    path('', SpaView.as_view(), name='home'),
    path('queue/', SpaView.as_view()),
    path('queue/<str:queue_id>/', SpaView.as_view(), name='queue'),
    path('manage/', SpaView.as_view(), name='manage'),
    path('manage/<str:queue_id>/', SpaView.as_view(), name='edit'),
    path('manage/<str:queue_id>/settings', SpaView.as_view()),
    path('search/', SpaView.as_view()),
    path('preferences/', SpaView.as_view(), name='preferences'),
    path('add_queue/', SpaView.as_view(), name='add_queue'),
    path('auth/<backend_name>/', AuthPromptView.as_view(), name='auth_prompt'),
    path('callback/<backend_name>/', auth_callback_view, name='auth_callback'),
    path("robots.txt", RedirectView.as_view(url='/static/robots.txt', permanent=True)),
    path("favicon.ico", RedirectView.as_view(url='/static/favicon.ico', permanent=True)),
    path("privacy/", privacy_policy_redirect_view, name='privacy-policy')
]

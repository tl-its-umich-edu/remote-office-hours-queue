from django.urls import path
from django.conf import settings

from .views import SpaView
from officehours_api import backends


urlpatterns = [
    path('', SpaView.as_view(), name='home'),
    path('queue/', SpaView.as_view()),
    path('queue/<str:queue_id>/', SpaView.as_view(), name='queue'),
    path('manage/', SpaView.as_view(), name='manage'),
    path('manage/<str:queue_id>/', SpaView.as_view(), name='edit'),
    path('manage/<str:queue_id>/settings', SpaView.as_view()),
    path('search/<str:term>/', SpaView.as_view()),
    path('preferences/', SpaView.as_view(), name='preferences'),
    path('add_queue/', SpaView.as_view(), name='add_queue'),
]
backend_classes = {
    backend_name: getattr(getattr(backends, backend_name), 'Backend')
    for backend_name in settings.ENABLED_BACKENDS
}
urlpatterns += [
    path(f'authorize/{backend_name}/', backend.auth_callback, name=backend_name)
    for backend_name, backend in backend_classes.items()
    if hasattr(backend, 'auth_callback')
]

from typing import List, TypedDict, Union

from django.conf import settings

from officehours_api import backends


class BackendDict(TypedDict):
    name: str
    friendly_name: str
    docs_url: Union[str, None]
    telephone_num: str


def feedback(request):
    return {'FEEDBACK_EMAIL': getattr(settings, 'FEEDBACK_EMAIL', None)}


def login_url(request):
    return {'LOGIN_URL': getattr(settings, 'LOGIN_URL', None)}


def debug(request):
    return {'DEBUG': settings.DEBUG}


def spa_globals(request):
    user_data = {
        'id': request.user.id,
        'username': request.user.username,
        'first_name': request.user.first_name,
        'last_name': request.user.last_name,
    } if request.user.is_authenticated else None

    backend_dicts: List[BackendDict] = []
    for backend_name in settings.ENABLED_BACKENDS:
        backend_class = getattr(getattr(backends, backend_name), 'Backend')
        backend_settings = settings.VC_BACKEND_SETTINGS.get(backend_name)
        backend_dicts.append({
            'name': backend_name,
            'friendly_name': backend_class.friendly_name,
            'docs_url': backend_settings and backend_settings.get('docs_url'),
            'telephone_num': backend_settings and backend_settings.get('telephone_num')
        })

    print(backend_dicts)

    return {
        'spa_globals': {
            'user': user_data,
            'feedback_email': getattr(settings, 'FEEDBACK_EMAIL', None),
            'debug': settings.DEBUG,
            'ga_tracking_id': settings.GA_TRACKING_ID,
            'login_url': settings.LOGIN_URL,
            'backends': backend_dicts,
            'default_backend': settings.DEFAULT_BACKEND,
        }
    }

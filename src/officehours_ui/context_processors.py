from typing import List

from django.conf import settings

from officehours_api import backends
from officehours_api.backends import __all__ as IMPLEMENTED_BACKEND_NAMES
from officehours_api.backends.types import BackendDict


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

    backend_dicts: List[BackendDict] = [
        getattr(getattr(backends, backend_name), 'Backend').get_public_data()
        for backend_name in IMPLEMENTED_BACKEND_NAMES
    ]

    return {
        'spa_globals': {
            'user': user_data,
            'feedback_email': getattr(settings, 'FEEDBACK_EMAIL', None),
            'debug': settings.DEBUG,
            'ga_tracking_id': settings.GA_TRACKING_ID,
            'login_url': settings.LOGIN_URL,
            'backends': backend_dicts,
            'default_backend': settings.DEFAULT_BACKEND,
            'otp_request_buffer': settings.OTP_REQUEST_BUFFER,
            'one_trust_script_domain': settings.ONE_TRUST_SCRIPT_DOMAIN
        }
    }

from django.conf import settings
from django.contrib.auth.models import User

from officehours_api.backends.backend_base import BackendBase
from officehours_api.backends.types import IMPLEMENTED_BACKEND_NAME


class Backend(BackendBase):
    name: IMPLEMENTED_BACKEND_NAME = 'inperson'
    friendly_name = 'In Person'
    enabled = name in settings.ENABLED_BACKENDS

    docs_url = None
    profile_url = None
    telephone_num = None
    intl_telephone_url = None

    def save_user_meeting(self, backend_metadata: dict, assignee: User, attendee_names=None):
        return {'started': True}

    @classmethod
    def is_authorized(cls, user: User) -> bool:
        return True

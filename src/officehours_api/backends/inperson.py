from django.contrib.auth.models import User

from officehours_api.backends.types import BackendDict, IMPLEMENTED_BACKEND_NAME


class Backend:
    name: IMPLEMENTED_BACKEND_NAME = 'inperson'
    friendly_name = "In Person"
    enabled = True

    docs_url = None
    telephone_num = None
    intl_telephone_url = None

    def save_user_meeting(self, backend_metadata: dict, assignee: User):
        return {'started': True}

    @classmethod
    def get_public_data(cls) -> BackendDict:
        return {
            'name': cls.name,
            'friendly_name': cls.friendly_name,
            'enabled': cls.enabled,
            'docs_url': cls.docs_url,
            'telephone_num': cls.telephone_num,
            'intl_telephone_url': cls.intl_telephone_url
        }

    @classmethod
    def is_authorized(cls, user: User) -> bool:
        return True

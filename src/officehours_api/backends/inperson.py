from django.contrib.auth.models import User

from officehours_api.backends.backend_dict import BackendDict


class Backend:
    name = 'inperson'
    friendly_name = "In Person"
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
            'docs_url': cls.docs_url,
            'telephone_num': cls.telephone_num,
            'intl_telephone_url': cls.intl_telephone_url
        }

    @classmethod
    def is_authorized(cls, user: User) -> bool:
        return True

from django.contrib.auth.models import User

from officehours_api.backends.backend_dict import BackendDict


class Backend:
    name = 'inperson'
    friendly_name = "In Person"
    docs_url = None
    telephone_num = None

    def save_user_meeting(self, backend_metadata: dict, assignee: User):
        return {'started': True}

    @classmethod
    def get_public_data(self) -> BackendDict:
        return {
            'name': self.name,
            'friendly_name': self.friendly_name,
            'docs_url': self.docs_url,
            'telephone_num': self.telephone_num
        }

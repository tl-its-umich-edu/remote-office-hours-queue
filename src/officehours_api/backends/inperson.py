from django.contrib.auth.models import User


class Backend:
    friendly_name = "In Person"

    def save_user_meeting(self, backend_metadata: dict, assignee: User):
        return {'started': True}

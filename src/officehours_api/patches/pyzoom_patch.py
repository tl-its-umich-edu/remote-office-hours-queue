from pyzoom._client import MeetingsComponent
from pyzoom import schemas

def patched_create_meeting(
    self: MeetingsComponent,
    user_id: str,
    topic: str,
    start_time: str,
    duration_min: int,
    timezone: str = None,
    password: str = None,    # Explicitly None if no password
    default_password: bool = False,
    settings: schemas.ZoomMeetingSettings = None,
    type_: int = 2
):
    endpoint = f"/users/{user_id}/meetings"
    
    body = {
        "topic": topic,
        "type": type_,
        "start_time": start_time,
        "duration": duration_min,
        "timezone": timezone or self.timezone,
        "default_password": default_password,
    }

    if password is not None:
        body["password"] = password

    if settings:
        body["settings"] = settings.model_dump()
    else:
        pass

    response = self._client.post(endpoint, body=body)
    
    return response.json()

MeetingsComponent.create_meeting = patched_create_meeting
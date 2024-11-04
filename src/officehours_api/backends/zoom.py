import json
from typing import List, Literal, TypedDict
from time import time
from datetime import datetime
import logging

from django.contrib.auth.models import User
from django.conf import settings
from django.shortcuts import redirect

from officehours_api.backends.backend_base import BackendBase
from officehours_api.backends.types import IMPLEMENTED_BACKEND_NAME

from pyzoom import ZoomClient
from pyzoom.err import APIError as ZoomAPIError
from pyzoom.oauth import refresh_tokens, request_tokens
from pyzoom.schemas import ZoomMeetingSettings

logger = logging.getLogger(__name__)


class ZoomMeeting(TypedDict):
    uuid: str
    id: str
    host_id: str
    topic: str
    type: Literal[1, 2, 3, 4, 8]  # instant, scheduled, recurring/unfixed, PMI, recurring/fixed
    status: str
    start_time: str
    duration: int
    timezone: str
    created_at: str
    agenda: str
    start_url: str
    join_url: str


class ZoomUser(TypedDict):
    id: str
    first_name: str
    last_name: str
    email: str
    type: int
    role_name: str
    pmi: int
    use_pmi: bool
    vanity_url: str
    personal_meeting_url: str
    timezone: str
    verified: int
    dept: str
    created_at: str
    last_login_time: str
    last_client_version: str
    pic_url: str
    jid: str
    host_key: str
    group_ids: List[str]
    im_group_ids: List[str]
    account_id: str
    language: str
    phone_country: str
    phone_number: str
    status: str


class ZoomAccessToken(TypedDict):
    access_token: str
    token_type: str
    refresh_token: str
    expires_in: int
    scope: str


class Backend(BackendBase):
    name: IMPLEMENTED_BACKEND_NAME = 'zoom'
    friendly_name: str = 'Zoom'
    enabled: bool = name in settings.ENABLED_BACKENDS

    docs_url: str = settings.ZOOM_DOCS_URL
    profile_url: str = settings.ZOOM_PROFILE_URL
    telephone_num: str = settings.ZOOM_TELE_NUM
    intl_telephone_url: str = settings.ZOOM_INTL_URL
    sign_in_help: str = settings.ZOOM_SIGN_IN_HELP

    base_url = 'https://zoom.us'
    base_domain_url = settings.ZOOM_BASE_DOMAIN_URL
    expiry_buffer_seconds = 60
    client_id = settings.ZOOM_CLIENT_ID
    client_secret = settings.ZOOM_CLIENT_SECRET

    @classmethod
    def _spend_authorization_code(cls, code: str, request) -> ZoomAccessToken:
        redirect_uri = request.build_absolute_uri('/callback/zoom/')
        # the request_tokens function from the PyZoom library replaces
        # the request to /oauth/token for the authorization code grant type
        tokens = request_tokens(cls.client_id, cls.client_secret, redirect_uri, code)
        logger.debug("Received authorization code from Zoom")
        return tokens

    @classmethod
    def _clear_backend_metadata(cls, user: User) -> None:
        user.profile.backend_metadata['zoom'] = {}
        user.profile.save()
        logger.info(f'Removed Zoom metadata for user {user.id} to prompt re-authorization.')

    @classmethod
    def _calculate_expires_at(cls, expires_in: int) -> float:
        return time() + expires_in - cls.expiry_buffer_seconds

    @classmethod
    def _get_access_token(cls, user: User) -> str:
        zoom_meta = user.profile.backend_metadata['zoom']
        logger.debug(f'Checking access token for {user.id} expires at {zoom_meta["access_token_expires"]} time {time()}')
        if time() > zoom_meta['access_token_expires']:
            logger.debug(f'Refreshing token for {user.id}')
            # The refresh_tokens function from the PyZoom library replaces the request to /oauth/token
            # for the refresh token grant type
            try:
                token = refresh_tokens(cls.client_id, cls.client_secret, zoom_meta['refresh_token'])
            except ZoomAPIError:
                logger.info(f'Access token for user {user.id} seems to be invalid, attempting to clear.')
                cls._clear_backend_metadata(user)
                raise

            new_zoom_data = {
                'refresh_token': token['refresh_token'],
                'access_token': token['access_token'],
                'access_token_expires': cls._calculate_expires_at(token['expires_in']),
            }
            user.profile.backend_metadata['zoom'].update(new_zoom_data)
            user.profile.save()
        return user.profile.backend_metadata['zoom']['access_token']

    @classmethod
    def _get_client(cls, user: User) -> ZoomClient:
        """Gets a ZoomClient instance for the given user. Replaces the _get_session method."""
        return ZoomClient(cls._get_access_token(user))

    @classmethod
    def _create_meeting(cls, user: User) -> ZoomMeeting:
        """Creates a Zoom meeting for the given user."""
        client = cls._get_client(user)
        meeting_settings = ZoomMeetingSettings(
            approval_type=2,
            audio='both',
            auto_recording='none',
            cn_meeting=False,
            contact_email=user.email,
            contact_name=user.get_full_name(),
            enforce_login=True,
            host_video=True,
            in_meeting=False,
            join_before_host=False,
            meeting_authentication=False,
            mute_upon_entry=False,
            participant_video=True,
            registrants_email_notification=False,
            use_pmi=False,
            waiting_room=True,
            watermark=False)

        # invoke the create_meeting method of the ZoomClient instance
        try:
            meeting = client.meetings.create_meeting(
                topic='Remote Office Hours Queue Meeting',
                start_time=datetime.now().strftime('%Y-%m-%dT%H:%M:%SZ'),
                duration_min=60,
                timezone='America/Detroit',
                settings=meeting_settings
            )
        except ZoomAPIError:
            logger.info(f'Access token for user {user.id} seems to be invalid, attempting to clear.')
            cls._clear_backend_metadata(user)
            raise

        # The return value of meeting.json() is a string object
        meeting_json = json.loads(meeting.json())
        logger.info("Created meeting: %s", meeting_json)
        return meeting_json

    @classmethod
    def _get_me(cls, user: User) -> ZoomUser:
        """Get the Zoom user info for the given user.
        Note that the PyZoom library does not have a method for this,
        so we will have to use the ZoomClient.raw.get method to make an API call.
        """
        client = cls._get_client(user)
        resp = client.raw.get('/users/me')
        resp.raise_for_status()
        return resp.json()

    @classmethod
    def save_user_meeting(cls, backend_metadata: dict, assignee: User):
        if not backend_metadata:
            backend_metadata = {}
        if backend_metadata.get('meeting_id'):
            return backend_metadata
        meeting = cls._create_meeting(assignee)
        backend_metadata.update({
            'user_id': meeting['host_id'],
            'meeting_id': meeting['id'],
            'numeric_meeting_id': meeting['id'],
            'meeting_url': meeting['join_url'],
            'host_meeting_url': f"{cls.base_domain_url}/s/{meeting['id']}",
        })
        return backend_metadata

    @classmethod
    def auth_callback(cls, request):
        logger.debug("Triggered Zoom auth callback for %s", request.user.username)
        code = request.GET.get('code')
        token = cls._spend_authorization_code(code, request)
        zoom_meta = request.user.profile.backend_metadata.get('zoom', {})
        zoom_meta.update({
            'refresh_token': token['refresh_token'],
            'access_token': token['access_token'],
            'access_token_expires': cls._calculate_expires_at(token['expires_in']),
        })
        request.user.profile.backend_metadata['zoom'] = zoom_meta
        me = cls._get_me(request.user)
        zoom_meta.update({
            'user_id': me['id'],
        })
        request.user.profile.backend_metadata['zoom'] = zoom_meta
        request.user.profile.save()
        logger.debug("Updated Zoom backend_metadata for %s", request.user.username)
        state = request.GET.get('state')
        return redirect(state)

    @classmethod
    def get_auth_url(cls, redirect_uri: str, state: str):
        """Gets the URL to redirect the user to for authorization.
        This is not implemented as a standalone function in the PyZoom library.
        """
        return (
            f"{Backend.base_url}/oauth/authorize"
            f"?response_type=code"
            f"&client_id={cls.client_id}"
            f"&state={state}"
            f"&redirect_uri={redirect_uri}"
        )

    @classmethod
    def is_authorized(cls, user: User) -> bool:
        return bool(user.profile.backend_metadata.get('zoom'))

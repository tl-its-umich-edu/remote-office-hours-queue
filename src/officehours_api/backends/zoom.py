from typing import List, Literal, TypedDict
from base64 import b64encode
from time import time
from datetime import datetime
import logging

import requests
from django.contrib.auth.models import User
from django.conf import settings
from django.shortcuts import redirect

from officehours_api.backends.backend_base import BackendBase
from officehours_api.backends.types import IMPLEMENTED_BACKEND_NAME

from pyzoom import request_tokens
from pyzoom import refresh_tokens
from pyzoom import ZoomClient

logger = logging.getLogger(__name__)


# TODO: configure logging output of debug information and access it through Docker consoles
# TODO: replace API calls with ZoomClient.raw calls
# TODO: replace ZoomClient.raw calls with dedicated methods

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
    def _get_client_auth_headers(cls) -> dict:
        client = b64encode(bytes(f"{cls.client_id}:{cls.client_secret}", 'ascii')).decode('ascii')
        return {
            'Authorization': f"Basic {client}",
            'Accept': 'application/json',
        }

    @classmethod
    def _spend_authorization_code(cls, code: str, request) -> ZoomAccessToken:
        redirect_uri = request.build_absolute_uri('/callback/zoom/')
        # Log debug information about the request
        request_url = f'{cls.base_url}/oauth/token'
        logger.debug(f"Requesting access token from Zoom at {request_url} at function _spend_authorization_code.")
        resp = requests.post(
            request_url,
            params={
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': redirect_uri,
            },
            headers=cls._get_client_auth_headers(),
        )

        resp.raise_for_status()
        logger.debug("Received authorization code from Zoom")
        # Log debug information about the response
        logger.debug(f"Response from Zoom: {resp.json()}")

        # Alternative implementation of _spend_authorization_code from lines 108-116
        try:
            # TODO: there has to be another way of doing authentication from PyZoom
            # TODO: the following line doesn't work: can't create a ZoomClient when the user hasn't authorized the app
            client = ZoomClient.from_environment()
            pyzoom_resp = client.raw.post('/oauth/token')
            pyzoom_resp.raise_for_status()
            logger.debug("Received authorization code from PyZoom")
            # Log debug information about the response
            logger.debug(f"Response from PyZoom: {pyzoom_resp.json()}")
        except Exception as e:
            logger.error(f"Error in PyZoom response: {e}")

        return resp.json()

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
        # Dump Zoom metadata for debugging purposes
        logger.debug(f"Zoom metadata requested by function _get_access_token: {zoom_meta}")
        if time() > zoom_meta['access_token_expires']:
            logger.debug('Refreshing token')
            try:
                pyzoom_response = request_tokens(cls.client_id, cls.client_secret, token['refresh_token'])
                if 400 <= pyzoom_response.status_code < 500:
                    # The refresh_token was invalidated somehow.
                    # Maybe the user removed our Zoom app's auth.
                    # Force them to be prompted again.
                    # The specific code sent by Zoom has changed before,
                    # so it now checks for any client error during refresh.
                    cls._clear_backend_metadata(user)
                pyzoom_response.raise_for_status()
                pyzoom_token = pyzoom_response.json()
                logger.debug(f"Response from PyZoom: {pyzoom_token}")
                user.profile.backend_metadata['zoom'].update({
                    'refresh_token': pyzoom_token['refresh_token'],
                    'access_token': pyzoom_token['access_token'],
                    'access_token_expires': cls._calculate_expires_at(pyzoom_token['expires_in'])
                })
                user.profile.save()
            except Exception as e:
                logger.error(f"Error in PyZoom response for function _get_access_token: {e}")
                # Use old implementation if PyZoom fails
                resp = requests.post(
                    f'{cls.base_url}/oauth/token',
                    params={
                        'grant_type': 'refresh_token',
                        'refresh_token': zoom_meta['refresh_token'],
                    },
                    headers=cls._get_client_auth_headers(),
                )
                if resp.status_code >= 400 and resp.status_code < 500:
                    # The refresh_token was invalidated somehow.
                    # Maybe the user removed our Zoom app's auth.
                    # Force them to be prompted again.
                    # The specific code sent by Zoom has changed before,
                    # so it now checks for any client error during refresh.
                    cls._clear_backend_metadata(user)
                resp.raise_for_status()
                token = resp.json()
                # Log debug information about the response
                logger.debug(f"Response from Zoom: {token}")
                new_zoom_data = {
                    'refresh_token': token['refresh_token'],
                    'access_token': token['access_token'],
                    'access_token_expires': cls._calculate_expires_at(token['expires_in']),
                }
                user.profile.backend_metadata['zoom'].update(new_zoom_data)
                user.profile.save()

        return user.profile.backend_metadata['zoom']['access_token']

    @classmethod
    def _get_session(cls, user: User) -> requests.Session:
        # TODO: maybe this function is not necessary anymore with the _get_client method
        session = requests.Session()
        session.headers.update({
            'Authorization': f'Bearer {cls._get_access_token(user)}',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        })
        return session

    @classmethod
    def _get_client(cls, user: User) -> ZoomClient:
        """Get a ZoomClient instance for the given user. Replaces the _get_session method."""
        zoom_meta = user.profile.backend_metadata['zoom']
        return ZoomClient(zoom_meta['access_token'])

    @classmethod
    def _create_meeting(cls, user: User) -> ZoomMeeting:
        session = cls._get_session(user)
        user_id = user.profile.backend_metadata['zoom']['user_id']
        request_url = f'{cls.base_url}/v2/users/{user_id}/meetings'
        # Log debug information about the request
        logger.debug(f"Requesting meeting creation from Zoom at {request_url} at function _create_meeting.")
        resp = session.post(
            request_url,
            json={
                'topic': 'Remote Office Hours Queue Meeting',
                'start_time': datetime.now().strftime('%Y-%m-%dT%H:%M:%SZ'),
                'timezone': 'America/Detroit',
                "settings": {
                    "join_before_host": False,
                    "waiting_room": True,
                    "meeting_authentication": False,
                    "use_pmi": False
                },
            },
        )
        if resp.status_code == 401:
            logger.info(f'Access token for user {user.id} seems to be invalid.')
            cls._clear_backend_metadata(user)
        resp.raise_for_status()
        logger.info("Created meeting: %s", resp.json())

        # Log debug information about the response
        logger.debug(f"Response from Zoom: {resp.json()}")

        # alternative implementation of _create_meeting
        # TODO: would anything go wrong if I don't specify the duration_min and password fields?
        client = cls._get_client(user)
        user_id = user.profile.backend_metadata['zoom']['user_id']
        try:
            meeting = client.meetings.create_meeting(
                topic='Remote Office Hours Queue Meeting',
                start_time=datetime.now().strftime('%Y-%m-%dT%H:%M:%SZ'),
                timezone='America/Detroit',
                settings={
                    "join_before_host": False,
                    "waiting_room": True,
                    "meeting_authentication": False,
                    "use_pmi": False
                },
            )
            logger.info("Created meeting through PyZoom: %s", meeting.json())
        except Exception as e:
            logger.error(f"Error in PyZoom response: {e}")

        return resp.json()

    @classmethod
    def _get_me(cls, user: User) -> ZoomUser:
        session = cls._get_session(user)
        resp = session.get(f'{cls.base_url}/v2/users/me')
        # Log debug information about the response
        logger.debug(f"Response from Zoom: {resp.json()}")

        # Alternative implementation of _get_me from lines 236 to 240
        try:
            client = cls._get_client(user)
            user_info_resp = client.raw.get('/users/me')
            user_info_resp.raise_for_status()
            user_info = user_info_resp.json()
            logger.debug(f"Response from PyZoom: {user_info}")
        except Exception as e:
            logger.error(f"Error in PyZoom response: {e}")

        return resp.json()

    # alternative implementation of _get_me from lines 236 to 240
    # @classmethod
    # def _get_me(cls, user: User) -> ZoomUser:
    #     client = cls._get_client(user)
    #     user_info = client.raw.get('/users/me')
    #     return user_info
    #

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

    # @classmethod
    # def save_user_meeting(cls, backend_metadata: dict, assignee: User):
    # This should work if the _create_meeting function is implemented correctly
    #     if not backend_metadata:
    #         backend_metadata = {}
    #     if backend_metadata.get('meeting_id'):
    #         return backend_metadata
    #
    #     meeting = cls._create_meeting(assignee)
    #     backend_metadata.update({
    #         'user_id': meeting['host_id'],
    #         'meeting_id': meeting['id'],
    #         'numeric_meeting_id': meeting['id'],
    #         'meeting_url': meeting['join_url'],
    #         'host_meeting_url': f"{cls.base_domain_url}/s/{meeting['id']}",
    #     })
    #     return backend_metadata
    #

    @classmethod
    def auth_callback(cls, request):
        # TODO: figure out what this function does and how to replace this with the oauth_wizard function
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

    # TODO: is this still necessary with the PyZoom library?
    @classmethod
    def get_auth_url(cls, redirect_uri: str, state: str):
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

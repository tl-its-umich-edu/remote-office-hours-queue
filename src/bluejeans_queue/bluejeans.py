import time
import requests


class Bluejeans:
    _base_url = 'https://api.bluejeans.com'

    def __init__(self, client_id, client_secret):
        self._client_id = client_id
        self._client_secret = client_secret
        self._enterprise_id = None

        self._access_token = None
        self._access_token_expires = 0

        self._session = requests.Session()

    @property
    def session(self):
        if time.time() > self._access_token_expires:
            self._update_access_token()

            self._session.headers.update({
                'Authorization': f'Bearer {self._access_token}'
            })

        return self._session

    def _update_access_token(self):
        client_info = {
            'grant_type': 'client_credentials',
            'client_id': self._client_id,
            'client_secret': self._client_secret,
        }
        resp = requests.post(self._base_url + '/oauth2/token?Client',
                             data=client_info)

        resp.raise_for_status()
        data = resp.json()

        self._access_token = data['access_token']
        self._access_token_expires = time.time() - data['expires_in'] - 60
        self._enterprise_id = data['scope']['enterprise']

    def get_user(self, user_email):
        params = {
            'emailId': user_email,
            'fields': 'username, firstName, middleName, lastName, email',
        }

        resp = self.session.get(
            self._base_url + f'/v1/enterprise/{self._enterprise_id}/users',
            params=params,
        )
        resp.raise_for_status()
        r = resp.json()
        if r['count'] > 1:
            raise Exception(f'Too many users match "{user_email}"')
        elif r['count'] == 0:
            return None

        return r['users'][0]

    def create_meeting(self, user_id, meeting_settings=None):
        now = round(time.time()) * 1000

        if not meeting_settings:
            meeting_settings = {
                'title': 'Remote Office Hours',
                'description': '',
                'start': now,
                'end': now + (60 * 30 * 1000),
                'timezone': 'America/Detroit',
                'endPointType': 'WEB_APP',
                'endPointVersion': '2.10',
            }

        resp = self.session.post(
            self._base_url + f'/v1/user/{user_id}/scheduled_meeting',
            json=meeting_settings,
        )

        resp.raise_for_status()

        return resp.json()

    def read_meeting(self, user_id, meeting_id):
        resp = self.session.get(
            self._base_url + f'/v1/user/{user_id}' +
            f'/scheduled_meeting/{meeting_id}'
        )
        resp.raise_for_status()
        return resp.json()

    def delete_meeting(self, user_id, meeting_id):
        resp = self.session.delete(
            self._base_url + f'/v1/user/{user_id}' +
            f'/scheduled_meeting/{meeting_id}'
        )
        resp.raise_for_status()

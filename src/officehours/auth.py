import unicodedata

from mozilla_django_oidc.auth import OIDCAuthenticationBackend


def generate_username(email):
    return unicodedata.normalize('NFKC', email).split('@')[0]


class UMichOIDCBackend(OIDCAuthenticationBackend):
    @staticmethod
    def _set_claims(user, claims):
        user.first_name = claims.get('given_name', '')
        user.last_name = claims.get('family_name', '')

    def create_user(self, claims):
        user = super().create_user(claims)
        self._set_claims(user, claims)
        user.save()
        return user

    def update_user(self, user, claims):
        self._set_claims(user, claims)
        user.save()
        return user

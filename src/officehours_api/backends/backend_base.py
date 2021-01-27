from abc import ABC, abstractclassmethod, abstractmethod
from typing import Optional

from django.contrib.auth.models import User

from officehours_api.backends.types import BackendDict, IMPLEMENTED_BACKEND_NAME


class BackendBase(ABC):

    name: IMPLEMENTED_BACKEND_NAME
    friendly_name: str = 'Backend'
    enabled: bool = True
    docs_url: Optional[str] = None
    profile_url: Optional[str] = None
    telephone_num: Optional[str] = None
    intl_telephone_url: Optional[str] = None

    @classmethod
    def get_public_data(cls) -> BackendDict:
        return {
            'name': cls.name,
            'friendly_name': cls.friendly_name,
            'enabled': cls.enabled,
            'docs_url': cls.docs_url,
            'profile_url': cls.profile_url,
            'telephone_num': cls.telephone_num,
            'intl_telephone_url': cls.intl_telephone_url
        }
    
    @classmethod
    @abstractclassmethod
    def is_authorized(cls, user: User) -> bool:
        pass

    @abstractmethod
    def save_user_meeting(self, backend_metadata: dict, assignee: User):
        pass

from typing import Optional, TypedDict


class BackendDict(TypedDict):
    name: str
    friendly_name: str
    enabled: bool
    docs_url: Optional[str]
    telephone_num: Optional[str]
    intl_telephone_url: Optional[str]

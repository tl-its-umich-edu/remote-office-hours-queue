from typing import Optional, TypedDict


class BackendDict(TypedDict):
    name: str
    friendly_name: str
    docs_url: Optional[str]
    telephone_num: Optional[str]

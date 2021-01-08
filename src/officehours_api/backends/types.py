from typing import Literal, Optional, TypedDict


IMPLEMENTED_BACKEND_NAME = Literal['zoom', 'bluejeans', 'inperson']


class BackendDict(TypedDict):
    name: IMPLEMENTED_BACKEND_NAME
    friendly_name: str
    enabled: bool
    docs_url: Optional[str]
    telephone_num: Optional[str]
    intl_telephone_url: Optional[str]

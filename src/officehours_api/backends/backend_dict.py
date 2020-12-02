from typing import TypedDict, Union


class BackendDict(TypedDict):
    name: str
    friendly_name: str
    docs_url: Union[str, None]
    telephone_num: Union[str, None]

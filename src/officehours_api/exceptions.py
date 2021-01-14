import logging

from rest_framework.views import exception_handler
from rest_framework.response import Response

from officehours_api.backends.types import IMPLEMENTED_BACKEND_NAME

logger = logging.getLogger(__name__)


class BackendException(Exception):
    def __init__(self, backend_type: IMPLEMENTED_BACKEND_NAME):
        self.backend_type = backend_type
        self.message = (
            f'An unexpected error occurred in {self.backend_type.capitalize()}. '
            f'You can check the ITS Status page (https://status.its.umich.edu/) '
            f'to see if there is a known issue with {self.backend_type.capitalize()}, '
            f'or contact the ITS Service Center (https://its.umich.edu/help) for help.'
        )


class DisabledBackendException(Exception):

    def __init__(self, backend_type: IMPLEMENTED_BACKEND_NAME):
        self.backend_type = backend_type
        self.message = (
            f"Backend type {self.backend_type} is no longer a supported meeting type."
        )


class NotAllowedBackendException(Exception):

    def __init__(self, backend_type: IMPLEMENTED_BACKEND_NAME):
        self.backend_type = backend_type
        self.message = (
            f"Backend type {self.backend_type} is not an allowed backend for the queue."
        )


def backend_error_handler(exc, context):
    if isinstance(exc, BackendException):
        # BackendException = Bad Gateway
        logger.exception(exc.message)
        return Response({'detail': exc.message}, status=502)
    return exception_handler(exc, context)

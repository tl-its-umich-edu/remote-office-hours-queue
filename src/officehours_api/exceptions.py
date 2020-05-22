from rest_framework.views import exception_handler
from rest_framework.response import Response

from .models import BackendException


def backend_error_handler(exc, context):
    if isinstance(exc, BackendException):
        # BackendException = Bad Gateway
        return Response({'detail': exc.message}, status=502)
    return exception_handler(exc, context)

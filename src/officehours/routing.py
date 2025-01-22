from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

from django.core.asgi import get_asgi_application

import officehours_api.routing


asgi_application = get_asgi_application()

application = ProtocolTypeRouter({
    # (http->django views is added by default)
    'http': asgi_application,
    'websocket': AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(
                officehours_api.routing.websocket_urlpatterns
            )
        )
    )
})
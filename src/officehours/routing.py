from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

import officehours_api.routing

application = ProtocolTypeRouter({
    # (http->django views is added by default)
    'http': get_asgi_application(),
    'websocket': AuthMiddlewareStack(
        URLRouter(
            officehours_api.routing.websocket_urlpatterns
        )
    ),
})

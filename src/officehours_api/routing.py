from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/queues/(?P<queue_id>\w+)/$', consumers.QueueConsumer),
    re_path(r'ws/users/(?P<user_id>\w+)/$', consumers.UserConsumer),
]

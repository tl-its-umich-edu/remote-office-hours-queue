from asgiref.sync import async_to_sync

from django.contrib.auth.models import User
from django.dispatch import receiver
from django.db.models.signals import post_save

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer

from officehours_api.models import Queue
from officehours_api.permissions import is_host
from officehours_api.serializers import QueueHostSerializer  # , QueueAttendeeSerializer


class QueueConsumer(AsyncJsonWebsocketConsumer):
    _queue_id: int
    _user: User

    @staticmethod
    def get_group_name(queue_id):
        return f'queue_{queue_id}'

    @property
    def queue_id(self):
        return self._queue_id

    @property
    def group_name(self):
        return self.get_group_name(self.queue_id)

    @property
    def user(self):
        return self._user

    async def connect(self):
        self._queue_id = int(self.scope['url_route']['kwargs']['queue_id'])
        self._user = self.scope["user"]
        queue = await database_sync_to_async(
            lambda: Queue.objects.get(pk=self.queue_id)
        )()

        if not is_host(self.user, queue):
            return

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()
        queue_data = await database_sync_to_async(
            lambda: QueueHostSerializer(queue, context={'user': self.user}).data
        )()
        await self.send_json({
            'type': 'init',
            'content': queue_data,
        })

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def update(self, event):
        print('consuming update')
        queue_data = await database_sync_to_async(
            lambda: QueueHostSerializer(
                Queue.objects.get(pk=self.queue_id),
                context={'user': self.user},
            ).data
        )()
        await self.send_json({
            'type': 'update',
            'content': queue_data,
        })


def update_queue_sync(queue_id: int, channel_layer=None):
    async_to_sync(update_queue)(queue_id, channel_layer)


async def update_queue(queue_id: int, channel_layer=None):
    channel_layer = channel_layer or get_channel_layer()
    await channel_layer.group_send(
        QueueConsumer.get_group_name(queue_id),
        {
            'type': 'update',
        }
    )


@receiver(post_save, sender=Queue)
def post_save_queue_signal_handler(sender, instance: Queue, created, **kwargs):
    print('handling queue update')
    update_queue_sync(instance.id)

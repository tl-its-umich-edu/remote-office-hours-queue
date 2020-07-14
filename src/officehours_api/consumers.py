from asgiref.sync import async_to_sync

from django.contrib.auth.models import User
from django.dispatch import receiver
from django.db.models.signals import post_save, post_delete, m2m_changed

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
from safedelete.signals import post_softdelete

from officehours_api.models import Queue, Meeting, Profile
from officehours_api.permissions import is_host
from officehours_api.serializers import QueueHostSerializer, UserSerializer  # , QueueAttendeeSerializer


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

    async def deleted(self, event):
        print('sending deleted event')
        await self.send_json({
            'type': 'deleted',
        })


def send_queue_update_sync(queue_id: int, channel_layer=None):
    async_to_sync(send_queue_update)(queue_id, channel_layer)


def send_queue_delete_sync(queue_id: int, channel_layer=None):
    async_to_sync(send_queue_delete)(queue_id, channel_layer)


async def send_queue_update(queue_id: int, channel_layer=None):
    channel_layer = channel_layer or get_channel_layer()
    await channel_layer.group_send(
        QueueConsumer.get_group_name(queue_id),
        {
            'type': 'update',
        }
    )


async def send_queue_delete(queue_id: int, channel_layer=None):
    print('send_queue_delete')
    print(queue_id)
    channel_layer = channel_layer or get_channel_layer()
    await channel_layer.group_send(
        QueueConsumer.get_group_name(queue_id),
        {
            'type': 'deleted',
        }
    )


@receiver(post_save, sender=Queue)
def post_save_queue_signal_handler(sender, instance: Queue, created, **kwargs):
    print('post_save_queue_signal_handler')
    if instance.deleted:
        return
    send_queue_update_sync(instance.id)


@receiver(post_softdelete, sender=Queue)
def post_delete_queue_signal_handler(sender, instance: Queue, **kwargs):
    print('post_delete_queue_signal_handler')
    send_queue_delete_sync(instance.id)


@receiver(post_save, sender=Meeting)
def post_save_meeting_signal_handler(sender, instance: Meeting, created, **kwargs):
    print('post_save_meeting_signal_handler')
    if instance.queue_id is None:
        return
    send_queue_update_sync(instance.queue_id)


@receiver(post_delete, sender=Meeting)
def post_delete_meeting_signal_handler(sender, instance: Meeting, **kwargs):
    print('post_delete_meeting_signal_handler')
    if instance.queue_id is None:
        return
    send_queue_update_sync(instance.queue_id)


@receiver(m2m_changed, sender=Queue.hosts.through)
def hosts_changed_signal_handler(sender, instance, action, **kwargs):
    print('hosts_changed_signal_handler')
    print(action)
    if action == "post_remove" or action == "post_clear" or action == "post_add":
        send_queue_update_sync(instance.id)


class UsersConsumer(AsyncJsonWebsocketConsumer):
    _user: User
    group_name = "users"

    @property
    def user(self):
        return self._user

    async def connect(self):
        self._user = self.scope["user"]
        users = await database_sync_to_async(
            lambda: User.objects.all()
        )()
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()
        users_data = await database_sync_to_async(
            lambda: list(
                UserSerializer(u, context={'user': self.user}).data
                for u in users
            )
        )()
        await self.send_json({
            'type': 'init',
            'content': users_data,
        })

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def update(self, event):
        # Doesn't scale well - should send only the updated parts instead
        users_data = await database_sync_to_async(
            lambda: list(
                UserSerializer(u, context={'user': self.user}).data
                for u in User.objects.all()
            )
        )()
        await self.send_json({
            'type': 'update',
            'content': users_data,
        })


def send_user_update_sync(channel_layer=None):
    async_to_sync(send_user_update)(channel_layer)


async def send_user_update(channel_layer=None):
    channel_layer = channel_layer or get_channel_layer()
    await channel_layer.group_send(
        UsersConsumer.group_name,
        {
            'type': 'update',
        }
    )


@receiver(post_save, sender=User)
def post_save_user_signal_handler(sender, instance: User, created, **kwargs):
    print('post_save_user_signal_handler')
    send_user_update_sync()


@receiver(post_delete, sender=User)
def post_delete_user_signal_handler(sender, instance: User, **kwargs):
    print('post_delete_user_signal_handler')
    send_user_update_sync()


@receiver(post_save, sender=Profile)
def post_save_profile_signal_handler(sender, instance: Profile, created, **kwargs):
    print('post_save_profile_signal_handler')
    send_user_update_sync()


@receiver(post_delete, sender=Profile)
def post_delete_profile_signal_handler(sender, instance: Profile, **kwargs):
    print('post_delete_profile_signal_handler')
    send_user_update_sync()

from asgiref.sync import async_to_sync
from typing import Union

from django.contrib.auth.models import User
from django.dispatch import receiver
from django.db.models.signals import post_save, post_delete, m2m_changed

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
from safedelete.signals import post_softdelete

from officehours_api.models import Queue, Meeting, Profile
from officehours_api.permissions import is_host
from officehours_api.serializers import (
    QueueHostSerializer, QueueAttendeeSerializer, UserSerializer
)


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
        try:
            queue = await database_sync_to_async(
                lambda: Queue.objects.get(pk=self.queue_id)
            )()
        except Queue.DoesNotExist:
            await self.accept()
            await self.close(code=4404)
            return

        QueueSerializer = (
            QueueHostSerializer
            if await database_sync_to_async(lambda: is_host(self.user, queue))()
            else QueueAttendeeSerializer
        )

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()
        queue_data = await database_sync_to_async(
            lambda: QueueSerializer(queue, context={'user': self.user}).data
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
        queue = await database_sync_to_async(
            lambda: Queue.objects.get(pk=self.queue_id)
        )()
        QueueSerializer = (
            QueueHostSerializer
            if await database_sync_to_async(lambda: is_host(self.user, queue))()
            else QueueAttendeeSerializer
        )
        queue_data = await database_sync_to_async(
            lambda: QueueSerializer(
                queue,
                context={'user': self.user},
            ).data
        )()
        await self.send_json({
            'type': 'update',
            'content': queue_data,
        })

    async def deleted(self, event):
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
def trigger_queue_update(sender, instance: Queue, created, **kwargs):
    if instance.deleted:
        return
    send_queue_update_sync(instance.id)


@receiver(post_softdelete, sender=Queue)
def trigger_queue_delete(sender, instance: Queue, **kwargs):
    send_queue_delete_sync(instance.id)


@receiver(post_save, sender=Meeting)
@receiver(post_delete, sender=Meeting)
def trigger_queue_update_for_meeting(sender, instance: Meeting, **kwargs):
    if instance.queue_id is None:
        return
    send_queue_update_sync(instance.queue_id)


@receiver(m2m_changed, sender=Queue.hosts.through)
def trigger_queue_update_for_hosts(sender, instance, action, **kwargs):
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


class UserConsumer(AsyncJsonWebsocketConsumer):
    _user_id: int
    _user: User

    @staticmethod
    def get_group_name(user_id):
        return f'user_{user_id}'

    @property
    def user_id(self):
        return self._user_id

    @property
    def group_name(self):
        return self.get_group_name(self.user_id)

    @property
    def user(self):
        return self._user

    async def connect(self):
        self._user_id = int(self.scope['url_route']['kwargs']['user_id'])
        self._user = self.scope["user"]
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()
        try:
            user_data = await database_sync_to_async(
                lambda: UserSerializer(
                    User.objects.get(pk=self.user_id), context={'user': self.user}
                ).data
            )()
        except User.DoesNotExist:
            await self.close(code=4404)
            return
        await self.send_json({
            'type': 'init',
            'content': user_data,
        })

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def update(self, event):
        user_data = await database_sync_to_async(
            lambda: UserSerializer(
                User.objects.get(pk=self.user_id), context={'user': self.user}
            ).data
        )()
        await self.send_json({
            'type': 'update',
            'content': user_data,
        })

    async def deleted(self, event):
        await self.send_json({
            'type': 'deleted',
        })


def send_user_update_sync(user_id: int, channel_layer=None):
    async_to_sync(send_user_update)(user_id, channel_layer)


def send_user_deleted_sync(user_id: int, channel_layer=None):
    async_to_sync(send_user_deleted)(user_id, channel_layer)


def send_users_update_sync(channel_layer=None):
    async_to_sync(send_users_update)(channel_layer)


async def send_user_update(user_id: int, channel_layer=None):
    channel_layer = channel_layer or get_channel_layer()
    await channel_layer.group_send(
        UserConsumer.get_group_name(user_id),
        {
            'type': 'update',
        }
    )


async def send_user_deleted(user_id: int, channel_layer=None):
    channel_layer = channel_layer or get_channel_layer()
    await channel_layer.group_send(
        UserConsumer.get_group_name(user_id),
        {
            'type': 'deleted',
        }
    )


async def send_users_update(channel_layer=None):
    channel_layer = channel_layer or get_channel_layer()
    await channel_layer.group_send(
        UsersConsumer.group_name,
        {
            'type': 'update',
        }
    )


@receiver(post_save, sender=User)
@receiver(post_delete, sender=User)
@receiver(post_save, sender=Profile)
@receiver(post_delete, sender=Profile)
def trigger_users_update(sender, instance: User, created, **kwargs):
    send_users_update_sync()


@receiver(post_save, sender=User)
def trigger_user_update(sender, instance: User, **kwargs):
    send_user_update_sync(instance.id)


@receiver(post_delete, sender=User)
def trigger_user_deleted(sender, instance: User, **kwargs):
    send_user_deleted_sync(instance.id)


@receiver(post_save, sender=Profile)
@receiver(post_delete, sender=Profile)
def trigger_user_update_for_profile(sender, instance: Profile, **kwargs):
    send_user_update_sync(instance.user.id)


@receiver(m2m_changed, sender=User.meeting_set.through)
def trigger_user_update_for_meetings(
    sender, instance: Union[User, Meeting],
    action, reverse, model, pk_set, **kwargs
):
    if not (
        action == "post_remove"
        or action == "post_clear"
        or action == "post_add"
    ):
        return
    if isinstance(instance, User):
        send_user_update_sync(instance.id)
    else:  # is Meeting
        for user_id in pk_set:
            send_user_update_sync(user_id)

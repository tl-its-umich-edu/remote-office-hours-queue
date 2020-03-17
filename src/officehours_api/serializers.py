from rest_framework import serializers
from django.contrib.auth.models import User
from officehours_api.models import Host, Queue, Meeting, Attendee


class UserSerializer(serializers.HyperlinkedModelSerializer):

    class Meta:
        model = User
        fields = ('id', 'url', 'username', 'email')


class HostSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Host
        fields = ['id', 'url', 'user']


class QueueSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Queue
        fields = ['id', 'url', 'name', 'created_at', 'hosts']


class MeetingSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Meeting
        fields = ['id', 'url', 'queue']


class AttendeeSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Attendee
        fields = ['id', 'url', 'user', 'meeting']

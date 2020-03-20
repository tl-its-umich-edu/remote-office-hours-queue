from rest_framework import serializers
from django.contrib.auth.models import User
from officehours_api.models import Queue, Meeting, Attendee


class UserSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'url', 'username', 'email']


class QueueSerializer(serializers.HyperlinkedModelSerializer):
    hosts = UserSerializer(many=True, read_only=True)

    host_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        source='hosts',
        write_only=True,
    )

    class Meta:
        model = Queue
        fields = ['id', 'url', 'name', 'created_at', 'hosts', 'host_ids']

    def validate_host_ids(self, host_ids):
        '''
        Require empty hosts_ids (default to current user) or
        require current user in host_ids
        '''
        if host_ids and self.context['request'].user not in host_ids:
            raise serializers.ValidationError('Must include self as host')
        else:
            return host_ids

    def create(self, validated_data):
        '''
        Set current user as host if not provided
        many-to-many fields cannot be set until the model is instantiated
        '''
        hosts = validated_data.pop('hosts')
        instance = Queue.objects.create(**validated_data)
        if hosts:
            instance.hosts.set(hosts)
        else:
            instance.hosts.set([self.context['request'].user])
        return instance


class MeetingSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Meeting
        fields = ['id', 'url', 'queue']


class AttendeeSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Attendee
        fields = ['id', 'url', 'user', 'meeting']

from rest_framework import serializers
from django.contrib.auth.models import User
from officehours_api.models import Queue, Meeting, Attendee
from officehours_api.nested_serializers import (
    NestedMeetingSerializer, NestedAttendeeSerializer, NestedUserSerializer,
    NestedAttendeeSetSerializer,
)


class UserListSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'url', 'username']


class UserSerializer(serializers.HyperlinkedModelSerializer):
    attendee_set = NestedAttendeeSetSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = ['id', 'url', 'username', 'email', 'first_name', 'last_name', 'attendee_set']


class PublicQueueSerializer(serializers.HyperlinkedModelSerializer):
    hosts = NestedUserSerializer(many=True, read_only=True)
    line_length = serializers.SerializerMethodField(read_only=True)
    line_place = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Queue
        fields = ['id', 'url', 'name', 'created_at', 'hosts', 'line_length', 'line_place']

    def get_line_length(self, obj):
        return obj.meeting_set.count()

    def get_line_place(self, obj):
        i = 0
        in_line = False
        meetings = obj.meeting_set.order_by('id')
        for i in range(0, len(meetings)):
            if self.context['request'].user in meetings[i].attendees.all():
                in_line = True
                break

        if in_line:
            return i
        else:
            return None


class QueueSerializer(serializers.HyperlinkedModelSerializer):
    hosts = NestedUserSerializer(many=True, read_only=True)
    meeting_set = NestedMeetingSerializer(many=True, read_only=True)

    host_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        source='hosts',
        write_only=True,
    )

    class Meta:
        model = Queue
        fields = ['id', 'url', 'name', 'created_at', 'hosts', 'host_ids', 'meeting_set']

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
    attendees = NestedAttendeeSerializer(many=True, source='attendee_set', read_only=True)

    attendee_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        source='attendees',
        write_only=True,
    )

    class Meta:
        model = Meeting
        fields = ['id', 'url', 'queue', 'attendees', 'attendee_ids']


class AttendeeSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Attendee
        fields = ['id', 'url', 'user', 'meeting']

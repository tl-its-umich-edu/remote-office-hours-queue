from rest_framework import serializers
from django.contrib.auth.models import User
from officehours_api.models import Queue, Meeting, Attendee
from officehours_api.nested_serializers import (
    NestedMeetingSerializer, NestedAttendeeSerializer, NestedUserSerializer,
    NestedAttendeeSetSerializer, PublicQueueNestedMeetingSerializer,
)


class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']


class UserSerializer(serializers.ModelSerializer):
    attendee_set = NestedAttendeeSetSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'attendee_set']


class PublicQueueSerializer(serializers.ModelSerializer):
    hosts = NestedUserSerializer(many=True, read_only=True)
    line_length = serializers.SerializerMethodField(read_only=True)
    my_meeting = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Queue
        fields = ['id', 'name', 'created_at', 'hosts', 'line_length', 'my_meeting']

    def get_line_length(self, obj):
        return obj.meeting_set.count()

    def get_my_meeting(self, obj):
        my_meeting = obj.meeting_set.filter(attendees__in=[self.context['request'].user]).first()
        if my_meeting:
            serializer = PublicQueueNestedMeetingSerializer(my_meeting, context={'request': self.context['request']})
            return serializer.data
        else:
            return None


class QueueSerializer(PublicQueueSerializer):
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
        fields = ['id', 'name', 'created_at', 'hosts', 'host_ids', 'meeting_set', 'line_length', 'my_meeting']

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


class MeetingSerializer(serializers.ModelSerializer):
    attendees = NestedAttendeeSerializer(many=True, source='attendee_set', read_only=True)
    attendee_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        source='attendees',
        write_only=True,
    )
    backend_metadata = serializers.JSONField(read_only=True)


    class Meta:
        model = Meeting
        fields = ['id', 'queue', 'attendees', 'attendee_ids', 'backend_type', 'backend_metadata']
        read_only_fields = ['attendees', 'backend_metadata']

    def validate_attendee_ids(self, attendee_ids):
        '''
        Attendees may only be in one meeting at a time.
        '''
        for user in attendee_ids:
            if user.meeting_set.exists():
                raise serializers.ValidationError(f'{user} is already in a meeting.')
        return attendee_ids


class AttendeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendee
        fields = ['id', 'user', 'meeting']

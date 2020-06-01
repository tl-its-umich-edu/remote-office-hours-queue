from rest_framework import serializers
from django.contrib.auth.models import User
from officehours_api.models import Queue, Meeting, Attendee, Profile
from officehours_api.nested_serializers import (
    NestedMeetingSerializer, NestedAttendeeSerializer, NestedUserSerializer,
    NestedMyMeetingSerializer,
)


class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']


class UserSerializer(serializers.ModelSerializer):
    my_queue = serializers.SerializerMethodField(read_only=True)
    phone_number = serializers.CharField(source='profile.phone_number')

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'my_queue', 'phone_number']

    def get_my_queue(self, obj):
        try:
            meeting = obj.meeting_set.get()
        except Meeting.DoesNotExist:
            return None

        serializer = QueueAttendeeSerializer(meeting.queue, context={'request': self.context['request']})
        return serializer.data
    
    def update(self, instance, validated_data):
        print("***SERIALIZER VALIDATED DATA:", validated_data)
        profile = validated_data.pop('profile')
        instance = super().update(instance, validated_data)
        instance.profile.phone_number = profile.get('phone_number', instance.profile.phone_number)
        instance.profile.save()            
        return instance
    
    

class ProfileSerializer(serializers.ModelSerializer):
    user = NestedUserSerializer(required=True)
    #phone_number = serializers.CharField(source='pk')

    class Meta:
        model = Profile
        fields = ['user', 'phone_number']

class QueueAttendeeSerializer(serializers.ModelSerializer):
    '''
    Serializer used when viewing queue as an attendee.
    '''
    hosts = NestedUserSerializer(many=True, read_only=True)
    line_length = serializers.SerializerMethodField(read_only=True)
    my_meeting = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Queue
        fields = ['id', 'name', 'created_at', 'description', 'hosts', 'line_length', 'my_meeting', 'status']

    def get_line_length(self, obj):
        return obj.meeting_set.count()

    def get_my_meeting(self, obj):
        user = self.context['request'].user
        my_meeting = (
            obj.meeting_set.filter(attendees__in=[self.context['request'].user]).first()
            if user.is_authenticated else None
        )
        if not my_meeting:
            return None
        serializer = NestedMyMeetingSerializer(my_meeting, context={'request': self.context['request']})
        return serializer.data


class QueueHostSerializer(QueueAttendeeSerializer):
    '''
    Serializer used when viewing queue as a host.
    '''
    meeting_set = NestedMeetingSerializer(many=True, read_only=True)
    host_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        source='hosts',
        write_only=True,
    )

    class Meta:
        model = Queue
        fields = ['id', 'name', 'created_at', 'description', 'hosts', 'host_ids',
                  'meeting_set', 'line_length', 'my_meeting', 'status']

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
    assignee = NestedUserSerializer(read_only=True)
    assignee_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='assignee',
        write_only=True,
        allow_null=True
    )
    backend_metadata = serializers.JSONField(read_only=True)

    class Meta:
        model = Meeting
        fields = ['id', 'queue', 'attendees', 'attendee_ids', 'assignee', 'assignee_id', 'backend_type', 'backend_metadata', 'created_at']
        read_only_fields = ['attendees', 'backend_metadata']

    def validate_attendee_ids(self, attendee_ids):
        '''
        Attendees may only be in one meeting at a time.
        '''
        instance_id = getattr(self.instance, 'id', None)
        for user in attendee_ids:
            if user.meeting_set.exclude(id=instance_id).exists():
                raise serializers.ValidationError(f'{user} is already in a meeting.')
        return attendee_ids

    def validate_queue(self, queue):
        '''
        Prevent new meeting from being added to a closed queue, unless it's added by a host.
        '''
        if (
            queue.status == 'closed'
            and self.context['request']._request.method == 'POST'
            and self.context['request'].user not in queue.hosts.all()
        ):
            raise serializers.ValidationError(f'Queue {queue} is closed.')
        return queue


class AttendeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendee
        fields = ['id', 'user', 'meeting']

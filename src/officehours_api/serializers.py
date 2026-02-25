from typing import TypedDict, Literal

from django.contrib.auth.models import User
from django.db.models import QuerySet
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from officehours_api.models import Queue, QueueAnnouncement, Meeting, MeetingStatus, Attendee, get_backend_types


class UserContext(TypedDict):
    user: User


class MeetingSerializerContext(UserContext):
    action: Literal['WRITE', 'READ', 'UPDATE', 'DELETE']


class AttendeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendee
        fields = ['id', 'user', 'meeting']


class NestedUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']


class NestedMeetingSerializer(serializers.ModelSerializer):
    attendees = NestedUserSerializer(many=True, read_only=True)
    assignee = NestedUserSerializer(read_only=True)
    backend_metadata = serializers.JSONField(read_only=True)
    status = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Meeting
        fields = [
            'id', 'attendees', 'agenda', 'assignee', 'backend_type', 'backend_metadata', 'created_at',
            'status'
        ]

    @extend_schema_field(serializers.IntegerField)
    def get_status(self, obj):
        return obj.status.value


class NestedMyMeetingSerializer(serializers.ModelSerializer):
    backend_metadata = serializers.JSONField(read_only=True)
    status = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Meeting
        fields = [
            'id', 'line_place', 'agenda', 'assignee', 'backend_type', 'backend_metadata', 'created_at',
            'status'
        ]

    @extend_schema_field(serializers.IntegerField)
    def get_status(self, obj):
        return obj.status.value


class NestedMeetingSetSerializer(serializers.ModelSerializer):
    queue = serializers.ReadOnlyField(source='queue.name')
    backend_metadata = serializers.JSONField(read_only=True)

    class Meta:
        model = Meeting
        fields = ['id', 'queue', 'backend_type', 'backend_metadata', 'created_at']


class NestedAttendeeSerializer(serializers.ModelSerializer):
    user_id = serializers.ReadOnlyField(source='user.id')
    username = serializers.ReadOnlyField(source='user.username')
    first_name = serializers.ReadOnlyField(source='user.first_name')
    last_name = serializers.ReadOnlyField(source='user.last_name')

    class Meta:
        model = Attendee
        fields = ['id', 'user_id', 'username', 'first_name', 'last_name']


class ShallowUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']


class QueueAnnouncementSerializer(serializers.ModelSerializer):
    created_by = NestedUserSerializer(read_only=True)

    class Meta:
        model = QueueAnnouncement
        fields = ['id', 'text', 'created_at', 'created_by', 'active']
        read_only_fields = ['id', 'created_at', 'created_by']


class QueueAttendeeSerializer(serializers.ModelSerializer):
    '''
    Serializer used when viewing queue as an attendee.
    '''
    context: UserContext

    hosts = NestedUserSerializer(many=True, read_only=True)
    line_length = serializers.SerializerMethodField(read_only=True)
    my_meeting = serializers.SerializerMethodField(read_only=True)
    allowed_backends = serializers.ListField(child=serializers.CharField())
    current_announcement = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Queue
        fields = ['id', 'name', 'created_at', 'description', 'hosts', 'line_length', 'my_meeting', 'status',
                  'allowed_backends', 'inperson_location', 'current_announcement']

    @extend_schema_field(serializers.IntegerField)
    def get_line_length(self, obj):
        return len([meeting for meeting in obj.meeting_set.all() if meeting.status != MeetingStatus.STARTED])

    @extend_schema_field(NestedMyMeetingSerializer)
    def get_my_meeting(self, obj):
        user = self.context['user']
        my_meeting = (
            obj.meeting_set.filter(attendees__in=[self.context['user']]).first()
            if user.is_authenticated else None
        )
        if not my_meeting:
            return None
        serializer = NestedMyMeetingSerializer(my_meeting, context=self.context)
        return serializer.data

    @extend_schema_field(QueueAnnouncementSerializer(many=True))
    def get_current_announcement(self, obj):
        user = self.context['user']
        
        # Only authenticated users can see announcements
        if not user.is_authenticated:
            return []
        
        # Get all active announcements
        announcements = list(obj.announcements.filter(active=True).order_by('-created_at'))

        # If user is assigned to a host, sort so that host's announcements are first
        my_meeting = obj.meeting_set.filter(attendees__in=[user]).first()
        assigned_host_id = my_meeting.assignee.id if my_meeting and my_meeting.assignee else None

        if assigned_host_id:
            announcements.sort(
                key=lambda ann: (ann.created_by.id != assigned_host_id, -ann.created_at.timestamp())
            )

        return [QueueAnnouncementSerializer(announcement).data for announcement in announcements]


class MyUserSerializer(serializers.ModelSerializer):
    context: UserContext

    username = serializers.CharField(read_only=True)
    email = serializers.CharField(read_only=True)
    my_queue = serializers.SerializerMethodField(read_only=True)
    hosted_queues = serializers.SerializerMethodField(read_only=True)
    phone_number = serializers.CharField(source='profile.phone_number', allow_blank=True)
    notify_me_attendee = serializers.BooleanField(source='profile.notify_me_attendee')
    notify_me_host = serializers.BooleanField(source='profile.notify_me_host')
    notify_me_announcement = serializers.BooleanField(source='profile.notify_me_announcement')
    authorized_backends = serializers.DictField(source='profile.authorized_backends', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'my_queue', 'hosted_queues',
            'phone_number', 'notify_me_attendee', 'notify_me_host', 'notify_me_announcement', 'authorized_backends',
        ]

    @extend_schema_field(QueueAttendeeSerializer)
    def get_my_queue(self, obj):
        try:
            meeting = obj.meeting_set.get()
        except Meeting.DoesNotExist:
            return None
        serializer = QueueAttendeeSerializer(meeting.queue, context=self.context)
        return serializer.data

    @extend_schema_field(ShallowUserSerializer)
    def get_hosted_queues(self, obj):
        queues_qs: QuerySet = obj.queue_set.all()
        if not queues_qs.exists():
            return []
        serializer = ShallowQueueSerializer(queues_qs, many=True)
        return serializer.data

    def update(self, instance, validated_data):
        profile = validated_data['profile']
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.profile.phone_number = profile.get('phone_number', instance.profile.phone_number)
        instance.profile.notify_me_attendee = profile.get('notify_me_attendee', instance.profile.notify_me_attendee)
        instance.profile.notify_me_host = profile.get('notify_me_host', instance.profile.notify_me_host)
        instance.profile.notify_me_announcement = profile.get('notify_me_announcement', instance.profile.notify_me_announcement)
        instance.profile.save()
        return instance

class PhoneOTPSerializer(serializers.ModelSerializer):
    '''Serializer used for OTP phone verification and updating via Twilio SMS.'''
    context: UserContext

    phone_number = serializers.CharField(source='profile.phone_number', allow_blank=True)
    otp_phone_number = serializers.CharField(source='profile.otp_phone_number', allow_blank=True, required=False)
    otp_token = serializers.CharField(source='profile.otp_token', allow_blank=True, required=False)
    otp_expiration = serializers.DateTimeField(source='profile.otp_expiration', required=False)

    class Meta:
        model = User
        fields = ['phone_number', 'otp_phone_number', 'otp_token', 'otp_expiration']

    def update(self, instance, validated_data):
        profile = validated_data['profile']
        instance.profile.phone_number = profile.get('phone_number', instance.profile.phone_number)
        instance.profile.otp_phone_number = profile.get('otp_phone_number', instance.profile.otp_phone_number)
        instance.profile.otp_token = profile.get('otp_token', instance.profile.otp_token)
        instance.profile.otp_expiration = profile.get('otp_expiration', instance.profile.otp_expiration)
        instance.profile.save()
        return instance

class ShallowQueueSerializer(serializers.ModelSerializer):
    '''
    Serializer used to list Queues (including basic info) related to a user or search
    '''
    class Meta:
        model = Queue
        fields = ['id', 'name', 'status']


class QueueHostSerializer(QueueAttendeeSerializer):
    '''
    Serializer used when viewing queue as a host.
    '''
    context: UserContext

    meeting_set = NestedMeetingSerializer(many=True, read_only=True)
    host_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        source='hosts',
        write_only=True,
    )
    allowed_backends = serializers.ListField(child=serializers.CharField())
    
    @extend_schema_field(QueueAnnouncementSerializer(many=True))
    def get_current_announcement(self, obj):
        # Hosts see all active announcements in chronological order
        announcements = obj.announcements.filter(active=True).order_by('-created_at')
        return [QueueAnnouncementSerializer(announcement).data for announcement in announcements]

    class Meta:
        model = Queue
        fields = ['id', 'name', 'created_at', 'description', 'hosts', 'host_ids',
                 'meeting_set', 'line_length', 'my_meeting', 'status', 'allowed_backends', 'inperson_location', 'current_announcement']

    def validate_host_ids(self, host_ids):
        '''
        Require empty hosts_ids (default to current user) or
        require current user in host_ids
        '''
        if host_ids and self.context['user'] not in host_ids:
            raise serializers.ValidationError('Must include self as host')
        else:
            return host_ids

    def validate_allowed_backends(self, value):
        valid_backends = {backend_type for backend_type, _ in get_backend_types()}
        for backend in value:
            if backend not in valid_backends:
                raise serializers.ValidationError(f'Invalid backend type: {backend}')
        return value

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
            instance.hosts.set([self.context['user']])
        return instance


class MeetingSerializer(serializers.ModelSerializer):
    context: MeetingSerializerContext

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
        fields = ['id', 'queue', 'attendees', 'attendee_ids', 'agenda', 'assignee', 'assignee_id', 'backend_type', 'backend_metadata', 'created_at']
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
            and self.context['action'] == 'WRITE'
            and self.context['user'] not in queue.hosts.all()
        ):
            raise serializers.ValidationError(f'Queue {queue} is closed.')
        return queue

    def validate_backend_type(self, value):
        valid_backends = {backend_type for backend_type, _ in get_backend_types()}
        if value not in valid_backends:
            raise serializers.ValidationError(f'Invalid backend type: {value}')
        return value

    def validate(self, attrs):
        '''
        Ensure the assignee is a host,
        and the meeting's backend type is in the queue's allowed backend type.
        '''
        queue = self.instance.queue if self.instance else attrs["queue"]
        hosts = queue.hosts.all()
        if attrs.get("assignee") and attrs["assignee"] not in hosts:
            raise serializers.ValidationError("Assignee must be a host!")
        if attrs.get("backend_type") and attrs["backend_type"] not in queue.allowed_backends:
            raise serializers.ValidationError(f"{attrs['backend_type']} is not one of the queue's allowed backend types ({queue.allowed_backends})")
        return attrs

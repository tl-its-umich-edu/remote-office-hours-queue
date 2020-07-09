from rest_framework import serializers
from django.contrib.auth.models import User
from officehours_api.models import Meeting, Attendee, Profile


class NestedUserSerializer(serializers.ModelSerializer):
    phone_number = serializers.CharField(source='profile.phone_number')
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'phone_number']

class NestedMeetingSerializer(serializers.ModelSerializer):
    attendees = NestedUserSerializer(many=True, read_only=True)
    assignee = NestedUserSerializer(read_only=True)
    backend_metadata = serializers.JSONField(read_only=True)

    class Meta:
        model = Meeting
        fields = ['id', 'attendees', 'agenda', 'assignee', 'backend_type', 'backend_metadata', 'created_at']


class NestedMyMeetingSerializer(serializers.ModelSerializer):
    line_place = serializers.SerializerMethodField(read_only=True)
    backend_metadata = serializers.JSONField(read_only=True)

    class Meta:
        model = Meeting
        fields = ['id', 'line_place', 'agenda', 'assignee', 'backend_type', 'backend_metadata', 'created_at']

    def get_line_place(self, obj):
        i = 0
        in_line = False
        meetings = obj.queue.meeting_set.order_by('id')
        for i in range(0, len(meetings)):
            if self.context['request'].user in meetings[i].attendees.all():
                in_line = True
                break

        if in_line:
            return i
        else:
            return None


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

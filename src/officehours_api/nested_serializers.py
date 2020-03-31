from rest_framework import serializers
from django.contrib.auth.models import User
from officehours_api.models import Meeting, Attendee


class NestedUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']


class NestedMeetingSerializer(serializers.ModelSerializer):
    attendees = NestedUserSerializer(many=True, read_only=True)
    backend_metadata = serializers.JSONField(read_only=True)

    class Meta:
        model = Meeting
        fields = ['id', 'attendees', 'backend_type', 'backend_metadata']


class NestedMyMeetingSerializer(serializers.ModelSerializer):
    line_place = serializers.SerializerMethodField(read_only=True)
    backend_metadata = serializers.JSONField(read_only=True)

    class Meta:
        model = Meeting
        fields = ['id', 'line_place', 'backend_type', 'backend_metadata']

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
        fields = ['id', 'queue', 'is_active', 'backend_type', 'backend_metadata']


class NestedAttendeeSerializer(serializers.ModelSerializer):
    user_id = serializers.ReadOnlyField(source='user.id')
    username = serializers.ReadOnlyField(source='user.username')
    first_name = serializers.ReadOnlyField(source='user.first_name')
    last_name = serializers.ReadOnlyField(source='user.last_name')

    class Meta:
        model = Attendee
        fields = ['id', 'user_id', 'username', 'first_name', 'last_name']


class NestedAttendeeSetSerializer(serializers.ModelSerializer):
    meeting = NestedMeetingSetSerializer(read_only=True)

    class Meta:
        model = Attendee
        fields = ['id', 'meeting']

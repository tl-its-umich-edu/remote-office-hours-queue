from rest_framework import serializers
from django.contrib.auth.models import User
from officehours_api.models import Meeting, Attendee


class NestedUserSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'url', 'username', 'first_name', 'last_name']


class NestedMeetingSerializer(serializers.HyperlinkedModelSerializer):
    attendees = NestedUserSerializer(many=True, read_only=True)

    class Meta:
        model = Meeting
        fields = ['id', 'url', 'attendees']


class NestedAttendeeSerializer(serializers.HyperlinkedModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    first_name = serializers.ReadOnlyField(source='user.first_name')
    last_name = serializers.ReadOnlyField(source='user.last_name')

    class Meta:
        model = Attendee
        fields = ['url', 'username', 'first_name', 'last_name']


class NestedMeetingSetSerializer(serializers.HyperlinkedModelSerializer):
    queue = serializers.ReadOnlyField(source='queue.name')

    class Meta:
        model = Meeting
        fields = ['url', 'queue', 'is_active']


class NestedAttendeeSetSerializer(serializers.HyperlinkedModelSerializer):
    meeting = NestedMeetingSetSerializer(read_only=True)

    class Meta:
        model = Attendee
        fields = ['url', 'meeting']


# TODO: add backend_metadata
class PublicQueueNestedMeetingSerializer(serializers.HyperlinkedModelSerializer):
    line_place = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Meeting
        fields = ['id', 'url', 'line_place']

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
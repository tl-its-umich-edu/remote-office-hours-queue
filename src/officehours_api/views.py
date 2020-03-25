from django.contrib.auth.models import User
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rest_framework.decorators import api_view
from officehours_api.models import Queue, Meeting, Attendee
from officehours_api.serializers import (
    UserListSerializer, UserSerializer, QueueSerializer, PublicQueueSerializer,
    MeetingSerializer, AttendeeSerializer,
)
from officehours_api.permissions import (
    IsCurrentUser, IsHostOrReadOnly, IsHostOrAttendee,
)


@api_view(['GET'])
def api_root(request, format=None):
    '''
    View available endpoints.
    '''
    return Response({
        'users': reverse('user-list', request=request, format=format),
        'queues': reverse('queue-list', request=request, format=format),
        'meetings': reverse('meeting-list', request=request, format=format),
        'attendees': reverse('attendee-list', request=request, format=format),
    })


class UserList(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserListSerializer


class UserDetail(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = (IsCurrentUser,)


class QueueList(generics.ListCreateAPIView):
    queryset = Queue.objects.all()
    serializer_class = QueueSerializer

    def get_queryset(self):
        user = self.request.user
        return Queue.objects.filter(hosts__in=[user])


class QueueDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Queue.objects.all()
    serializer_class = QueueSerializer
    permission_classes = (IsHostOrReadOnly,)

    def get(self, request, pk, format=None):
        queue = self.get_object()
        if request.user in queue.hosts.all():
            serializer = QueueSerializer(queue, context={'request': request})
        else:
            serializer = PublicQueueSerializer(queue, context={'request': request})
        return Response(serializer.data)


class MeetingList(generics.ListCreateAPIView):
    queryset = Meeting.objects.all()
    serializer_class = MeetingSerializer


class MeetingDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Meeting.objects.all()
    serializer_class = MeetingSerializer
    permission_classes = (IsHostOrAttendee,)


class AttendeeList(generics.ListCreateAPIView):
    queryset = Attendee.objects.all()
    serializer_class = AttendeeSerializer


class AttendeeDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Attendee.objects.all()
    serializer_class = AttendeeSerializer

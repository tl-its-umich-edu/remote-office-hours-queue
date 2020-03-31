from django.conf import settings
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rest_framework.decorators import api_view
from rest_framework.views import APIView
from rest_framework_tracking.mixins import LoggingMixin
from officehours_api.models import Queue, Meeting, Attendee
from officehours_api.serializers import (
    UserListSerializer, UserSerializer, QueueAttendeeSerializer,
    QueueHostSerializer, MeetingSerializer, AttendeeSerializer,
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


class QueueList(LoggingMixin, generics.ListCreateAPIView):
    logging_methods = settings.LOGGING_METHODS
    serializer_class = QueueHostSerializer

    def get_queryset(self):
        user = self.request.user
        return Queue.objects.filter(hosts__in=[user])

class QueueDetail(LoggingMixin, generics.RetrieveUpdateDestroyAPIView):
    logging_methods = settings.LOGGING_METHODS
    queryset = Queue.objects.all()
    serializer_class = QueueHostSerializer
    permission_classes = (IsHostOrReadOnly,)

    def get(self, request, pk, format=None):
        queue = self.get_object()
        if request.user in queue.hosts.all():
            serializer = QueueHostSerializer(queue, context={'request': request})
        else:
            serializer = QueueAttendeeSerializer(queue, context={'request': request})
        return Response(serializer.data)


class QueueHostDetail(LoggingMixin, APIView):
    logging_methods = settings.LOGGING_METHODS

    def check_queue_permission(self, request, queue):
        if request.user not in queue.hosts.all():
            self.permission_denied(request)

    def get(self, request, pk, user_id, format=None):
        queue = get_object_or_404(Queue, pk=pk)
        self.check_queue_permission(request, queue)

        try:
            host = queue.hosts.get(pk=user_id)
        except ObjectDoesNotExist:
            return Response({'detail': 'Host not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = UserListSerializer(host, context={'request': request})
        return Response(serializer.data)

    def post(self, request, pk, user_id, format=None):
        queue = get_object_or_404(Queue, pk=pk)
        self.check_queue_permission(request, queue)
        host = get_object_or_404(User, pk=user_id)
        queue.hosts.add(host)
        serializer = UserListSerializer(host, context={'request': request})
        return Response(serializer.data)

    def delete(self, request, pk, user_id, format=None):
        queue = get_object_or_404(Queue, pk=pk)
        self.check_queue_permission(request, queue)
        host = get_object_or_404(User, pk=user_id)
        queue.hosts.remove(host)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeetingList(LoggingMixin, generics.ListCreateAPIView):
    logging_methods = settings.LOGGING_METHODS
    serializer_class = MeetingSerializer

    def get_queryset(self):
        user = self.request.user
        return Meeting.objects.filter(attendees__in=[user])


class MeetingDetail(LoggingMixin, generics.RetrieveUpdateDestroyAPIView):
    logging_methods = settings.LOGGING_METHODS
    queryset = Meeting.objects.all()
    serializer_class = MeetingSerializer
    permission_classes = (IsHostOrAttendee,)


class AttendeeList(generics.ListAPIView):
    serializer_class = AttendeeSerializer

    def get_queryset(self):
        user = self.request.user
        return Attendee.objects.filter(user=user)


class AttendeeDetail(generics.RetrieveAPIView):
    queryset = Attendee.objects.all()
    serializer_class = AttendeeSerializer

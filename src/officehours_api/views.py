from django.conf import settings
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import generics, status, filters
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rest_framework.decorators import api_view
from rest_framework.views import APIView
from rest_framework_tracking.mixins import LoggingMixin
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from officehours_api.models import Queue, Meeting, Attendee, Profile
from officehours_api.serializers import (
    ShallowUserSerializer, MyUserSerializer, ShallowQueueSerializer, QueueAttendeeSerializer,
    QueueHostSerializer, MeetingSerializer, AttendeeSerializer, ProfileSerializer
)
from officehours_api.permissions import (
    IsHostOrReadOnly, IsHostOrAttendee, is_host, IsCurrentProfile
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


class DecoupledContextMixin:
    """Decouple the context from the view layer."""
    def get_serializer_context(self):
        action = {
            'POST': 'WRITE',
            'GET': 'READ',
            'PUT': 'UPDATE',
        }.get(self.request._request.method, self.request._request.method)
        return {
            'user': self.request.user,
            'action': action,
        }


class UserList(DecoupledContextMixin, generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = ShallowUserSerializer


class UserDetail(DecoupledContextMixin, generics.RetrieveAPIView):
    queryset = User.objects.all()
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        user = self.get_object()
        if user == request.user:
            serializer = MyUserSerializer(user, context={'user': request.user})
        else:
            serializer = ShallowUserSerializer(user, context={'user': request.user})
        return Response(serializer.data)


class UserUniqnameDetail(UserDetail):
    lookup_field = 'username'


class QueueList(DecoupledContextMixin, LoggingMixin, generics.ListCreateAPIView):
    logging_methods = settings.LOGGING_METHODS
    serializer_class = QueueHostSerializer

    def get_queryset(self):
        user = (
            self.request.user
            if self.request.user.is_authenticated else None
        )
        return Queue.objects.filter(hosts__in=list(filter(None, [user])))


class QueueListSearch(DecoupledContextMixin, generics.ListAPIView):
    queryset = Queue.objects.all()
    serializer_class = ShallowQueueSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['name', '=hosts__username']
    filterset_fields = ['status']


class QueueDetail(DecoupledContextMixin, LoggingMixin, generics.RetrieveUpdateDestroyAPIView):
    logging_methods = settings.LOGGING_METHODS
    queryset = Queue.objects.all()
    serializer_class = QueueHostSerializer
    permission_classes = (IsAuthenticated, IsHostOrReadOnly,)

    def get(self, request, pk, format=None):
        queue = self.get_object()
        if is_host(request.user, queue):
            serializer = QueueHostSerializer(queue, context={'user': request.user})
        else:
            serializer = QueueAttendeeSerializer(queue, context={'user': request.user})
        return Response(serializer.data)


class QueueHostDetail(DecoupledContextMixin, LoggingMixin, APIView):
    logging_methods = settings.LOGGING_METHODS

    def check_queue_permission(self, request, queue):
        if not is_host(request.user, queue):
            self.permission_denied(request)

    def get(self, request, pk, user_id, format=None):
        queue = get_object_or_404(Queue, pk=pk)
        self.check_queue_permission(request, queue)

        try:
            host = queue.hosts.get(pk=user_id)
        except ObjectDoesNotExist:
            return Response({'detail': 'Host not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ShallowUserSerializer(host, context={'user': request.user})
        return Response(serializer.data)

    def post(self, request, pk, user_id, format=None):
        queue = get_object_or_404(Queue, pk=pk)
        self.check_queue_permission(request, queue)
        host = get_object_or_404(User, pk=user_id)
        queue.hosts.add(host)
        serializer = ShallowUserSerializer(host, context={'user': request.user})
        return Response(serializer.data)

    def delete(self, request, pk, user_id, format=None):
        queue = get_object_or_404(Queue, pk=pk)
        self.check_queue_permission(request, queue)
        host = get_object_or_404(User, pk=user_id)
        queue.hosts.remove(host)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeetingList(DecoupledContextMixin, LoggingMixin, generics.ListCreateAPIView):
    logging_methods = settings.LOGGING_METHODS
    serializer_class = MeetingSerializer

    def get_queryset(self):
        user = self.request.user
        return Meeting.objects.filter(attendees__in=[user])


class MeetingDetail(DecoupledContextMixin, LoggingMixin, generics.RetrieveUpdateDestroyAPIView):
    logging_methods = settings.LOGGING_METHODS
    queryset = Meeting.objects.all()
    serializer_class = MeetingSerializer
    permission_classes = (IsAuthenticated, IsHostOrAttendee,)


class AttendeeList(DecoupledContextMixin, generics.ListAPIView):
    serializer_class = AttendeeSerializer

    def get_queryset(self):
        user = self.request.user
        return Attendee.objects.filter(user=user)


class AttendeeDetail(DecoupledContextMixin, generics.RetrieveAPIView):
    queryset = Attendee.objects.all()
    serializer_class = AttendeeSerializer


class ProfileDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = (IsAuthenticated, IsCurrentProfile,)

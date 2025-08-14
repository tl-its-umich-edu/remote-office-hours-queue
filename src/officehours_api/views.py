import csv
import logging
from datetime import datetime, timezone, timedelta
from random import randint
from typing import Iterable

from asgiref.sync import async_to_sync
from django.conf import settings
from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
from django.db import connection
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, serializers, status, filters, viewsets
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rest_framework.views import APIView
from rest_framework_tracking.mixins import LoggingMixin

from officehours_api.exceptions import DisabledBackendException, \
    MeetingStartedException, TwilioClientNotInitializedException
from officehours_api.models import Attendee, Meeting, Queue, QueueAnnouncement
from officehours_api.notifications import send_one_time_password
from officehours_api.permissions import (IsAssignee, IsHostOrReadOnly,
                                         IsHostOrAttendee, IsHostOfQueue, is_host)
from officehours_api.serializers import (ShallowUserSerializer,
                                         MyUserSerializer,
                                         ShallowQueueSerializer,
                                         QueueAttendeeSerializer,
                                         QueueHostSerializer,
                                         MeetingSerializer, AttendeeSerializer,
                                         PhoneOTPSerializer, QueueAnnouncementSerializer)

logger = logging.getLogger(__name__)


@extend_schema(
    responses={
        200: inline_serializer('api_root', {
            'users': serializers.CharField(),
            'queues': serializers.CharField(),
            'meetings': serializers.CharField(),
            'attendees': serializers.CharField()
        })
    }
)
@api_view(['GET'])
def api_root(request, format=None):
    """
    View available endpoints.
    """
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


class UserDetail(DecoupledContextMixin, LoggingMixin, generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    permission_classes = (IsAuthenticated,)

    def get_serializer(self, instance=None, data=None, many=None, partial=None):
        ctx = self.get_serializer_context()
        kwargs = {}
        if data:
            kwargs['data'] = data
        return (
            MyUserSerializer(instance, context=ctx, **kwargs)
            if instance == ctx['user']
            else ShallowUserSerializer(instance, context=ctx, **kwargs)
        )

    def check_change_permission(self, request, user):
        if user != request.user:
            self.permission_denied(request)

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        self.check_change_permission(request, user)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        user = self.get_object()
        self.check_change_permission(request, user)
        return super().partial_update(request, *args, **kwargs)

class UserOTP(DecoupledContextMixin, LoggingMixin, generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    permission_classes = (IsAuthenticated,)
    serializer_class = PhoneOTPSerializer

    def check_change_permission(self, request, user):
        if user != request.user:
            self.permission_denied(request)

    def generate_otp(self, request):
        request.data["otp_token"] = randint(1000, 9999)
        request.data["otp_expiration"] = datetime.now(timezone.utc) + timedelta(minutes=5)

    def verify_otp(self, request):
        """Returns True if the OTP is correct, and a string with an error message otherwise"""
        user = self.request.user
        if user.profile.otp_expiration < datetime.now(timezone.utc):
            return "Your verification code has expired. Please request a new one."

        elif user.profile.otp_token != request.data["otp_token"]:
            return "Incorect Verification Code Entered."
        return True

    async def send_otp(self, request, *args, **kwargs):
        """
        Send the OTP to the user's phone number.
        Returns True if the message was sent successfully, Error Response otherwise.
        """
        msg = ''
        self.generate_otp(request)
        try:
            if await send_one_time_password(request.data["otp_phone_number"], request.data["otp_token"]):
                return True
        except Exception as e:
            if isinstance(e, TwilioClientNotInitializedException):
                msg = "Cannot send verification code. Twilio configuration is not set up properly."
            else:
                msg = "Failed to send verification code; please check your phone number and try again."
        return Response({"detail": msg},
                                status=status.HTTP_400_BAD_REQUEST)
    def update(self, request, *args, **kwargs):
        user = self.request.user
        self.check_change_permission(request, user)

        if request.data["action"] == "send":
            otp_sent = async_to_sync(self.send_otp)(request, *args, **kwargs)
            if otp_sent == True:
                return super().update(request, *args, **kwargs)
            else:
                return otp_sent
        elif request.data["action"] == "verify":
            verified = self.verify_otp(request)
            if verified == True:
                request.data["phone_number"] = user.profile.otp_phone_number
                request.data["otp_token"] = ""
                request.data["otp_phone_number"] = ""
                request.data["otp_expiration"] = datetime.now(timezone.utc) - timedelta(minutes=1)
                return super().update(request, *args, **kwargs)
            else:
                return Response({"detail": verified}, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, *args, **kwargs):
        user = self.request.user
        self.check_change_permission(request, user)
        return super().partial_update(request, *args, **kwargs)

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
    search_fields = ['name', '=hosts__username', '=hosts__email']
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

    serializer_class = ShallowUserSerializer  # For DRF Spectacular

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

    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except MeetingStartedException as e:
            return Response({'Meeting Detail': e.message}, status=status.HTTP_400_BAD_REQUEST)


class MeetingStart(DecoupledContextMixin, LoggingMixin, APIView):
    permission_classes = (IsAuthenticated, IsAssignee,)

    serializer_class = MeetingSerializer  # For DRF Spectacular

    def post(self, request, pk):
        m = Meeting.objects.get(pk=pk)
        self.check_object_permissions(request, m)
        try:
            m.start()
        except DisabledBackendException as e:
            return Response({'Start Meeting': e.message}, status=status.HTTP_400_BAD_REQUEST)
        m.save()
        serializer = MeetingSerializer(m)
        return Response(serializer.data)


class AttendeeList(DecoupledContextMixin, generics.ListAPIView):
    serializer_class = AttendeeSerializer

    def get_queryset(self):
        user = self.request.user
        return Attendee.objects.filter(user=user)


class AttendeeDetail(DecoupledContextMixin, generics.RetrieveAPIView):
    queryset = Attendee.objects.all()
    serializer_class = AttendeeSerializer


class QueueAnnouncementViewSet(DecoupledContextMixin, LoggingMixin, viewsets.ModelViewSet):
    serializer_class = QueueAnnouncementSerializer
    permission_classes = [IsAuthenticated, IsHostOfQueue]
    http_method_names = ['get', 'post', 'put', 'patch', 'delete']
    
    def get_queryset(self):
        queue_pk = self.kwargs.get('queue_pk')
        if not queue_pk:
            return QueueAnnouncement.objects.none()
        
        queue = get_object_or_404(Queue, pk=queue_pk)
        if self.action == 'list':
            queryset = queue.announcements.filter(active=True).order_by('-created_at')
            # Support filtering by current user's announcements
            created_by = self.request.query_params.get('created_by')
            if created_by == 'me':
                queryset = queryset.filter(created_by=self.request.user)
            return queryset
        return queue.announcements.all().order_by('-created_at')

    def perform_create(self, serializer):
        queue = get_object_or_404(Queue, pk=self.kwargs['queue_pk'])
        # Deactivate any existing active announcements by this user
        QueueAnnouncement.objects.filter(
            queue=queue, 
            active=True, 
            created_by=self.request.user
        ).update(active=False)
        serializer.save(created_by=self.request.user, queue=queue, active=True)

    def perform_update(self, serializer):
        queue = get_object_or_404(Queue, pk=self.kwargs['queue_pk'])
        # If setting this announcement to active, deactivate other announcements by this user
        if serializer.validated_data.get('active', False):
            QueueAnnouncement.objects.filter(
                queue=queue, 
                active=True, 
                created_by=self.request.user
            ).exclude(pk=serializer.instance.pk).update(active=False)
        serializer.save()


class ExportMeetingStartLogs(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, queue_id=None, format=None):
        username = request.user.username

        # Query from the Queue hosts table to find all the queues the user is a host of, include deleted
        queues_user_is_in = Queue.all_objects.filter(hosts__in=[request.user]).values_list('id', flat=True)

        # If the user isn't in any queues return a 204 error
        if not queues_user_is_in:
            return Response({'detail': 'You are not a host of any queues.'}, status=status.HTTP_204_NO_CONTENT)
        # If they specify a single queue id, check if they're actually in it and return that
        elif queue_id:
            # Security check that they are actually in this queue
            if queue_id not in queues_user_is_in:
                return Response({'detail': 'You are not a host of this queue.'}, status=status.HTTP_403_FORBIDDEN)
            else:
                queues_user_is_in = [queue_id]
                filename = f"meeting_start_logs_{username}_queue_{queue_id}.csv"
        # Otherwise, get all the logs for the queues the user is a host of
        else:
            filename = f"meeting_start_logs_{username}.csv"

        logger.info(f"User {username} requested to export meeting start logs for queues {queues_user_is_in}.")
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        logger.info(f"User {username} successfully exported meeting start logs for queues {repr(queues_user_is_in)}.")
        self.extract_log(queues_user_is_in, response)

        return response

    @staticmethod
    def extract_log(queue_ids: Iterable[int], response: HttpResponse) -> None:
        writer = csv.writer(response)
        with connection.cursor() as cursor:
            cursor.execute('''
                SELECT * FROM meeting_start_logs
                WHERE queue_id = ANY(%s)
                ''', [list(queue_ids)])

            rows = cursor.fetchall()

            column_names = map(lambda λ: λ[0], cursor.description)

            writer.writerows([column_names] + rows)

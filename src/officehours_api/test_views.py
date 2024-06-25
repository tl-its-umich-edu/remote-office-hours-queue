from datetime import datetime, timedelta, timezone
import csv
import io
import json
from unittest import skipIf

from unittest.mock import patch
from django.contrib.auth.models import User
from django.test import Client, TestCase, override_settings
from rest_framework import status
from typing import List

from officehours.settings import ENABLED_BACKENDS
from officehours_api import notifications
from officehours_api.models import Meeting, Queue

class MeetingTestCase(TestCase):

    def create_test_queue(self, queue_name="Test Queue", allowed_backends=['inperson', 'zoom']):
        # Create a single test queue with 2 hosts assigned
        self.queue = Queue.objects.create(
            name=queue_name, allowed_backends=allowed_backends
        )
        self.queue.hosts.set([self.host_one, self.host_two])
        self.queue.save()

        # Create a meeting with the host_two as the assignee to see attendee_one
        self.meeting = Meeting.objects.create(queue=self.queue, backend_type='inperson')
        self.meeting.attendees.set([self.attendee_one])
        self.meeting.assignee = self.host_two
        self.meeting.save()
        self.client = Client()

    def setUp(self):
        # Create one attendee and two hosts
        self.attendee_one = User.objects.create(
            username='attendeeone', email='attendeeone@example.com'
        )
        self.attendee_one.set_password('rohqtest')
        self.attendee_one.save()

        self.host_one = User.objects.create(
            username='hostone', email='hostone@example.com'
        )
        self.host_one.set_password('rohqtest')
        self.host_one.save()
        self.host_two = User.objects.create(
            username='hosttwo', email='hosttwo@example.com'
        )
        self.host_two.set_password('rohqtest')
        self.host_two.save()

        self.create_test_queue()

    def test_can_update_assignee_in_unstarted_meeting(self):
        url = f'/api/meetings/{self.meeting.id}/'
        data = {
            "attendee_ids": [self.attendee_one.id],
            "assignee_id": self.host_one.id
        }
        self.client.login(username='hostone', password='rohqtest')
        response = self.client.put(url, data, content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_cannot_reassign_host_when_meeting_has_started(self):
        self.meeting.start()
        self.meeting.save()

        url = f'/api/meetings/{self.meeting.id}/'
        data = {
            "attendee_ids": [self.attendee_one.id],
            "assignee_id": self.host_one.id
        }
        self.client.login(username='hostone', password='rohqtest')
        response = self.client.put(url, data, content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response_body = json.loads(response.content)
        self.assertEqual(
            response_body['Meeting Detail'],
            "Can't change assignee once meeting is started!"
        )

    @skipIf('zoom' not in ENABLED_BACKENDS, 'Skipping because "zoom" backend type is not enabled')
    def test_cannot_change_backend_type_when_meeting_has_started(self):
        self.meeting.start()
        self.meeting.save()

        url = f'/api/meetings/{self.meeting.id}/'
        data = {
            "attendee_ids": [self.attendee_one.id],
            "assignee_id": self.host_one.id,
            "backend_type": "zoom"
        }
        self.client.login(username='hostone', password='rohqtest')
        response = self.client.put(url, data, content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response_body = json.loads(response.content)
        self.assertEqual(
            response_body['Meeting Detail'],
            "Can't change backend_type once meeting is started!"
        )

    def read_csv_from_response(self, content: bytes) -> List[List[str]]:
        """
        Reads CSV data from the byte content of an HTTP response and returns a List of Lists.

        Parameters:
        - content (bytes): The byte content of the response containing CSV data.

        Returns:
        - List[List[str]]: A list of rows, each row being a list of strings
        """
        # Decode the byte content to a string
        content_str = content.decode('utf-8')  # Adjust 'utf-8' to the appropriate encoding if needed

        # Use StringIO to treat the string as a file-like object
        csv_file = io.StringIO(content_str)

        # Use csv.reader to read as a list of lists
        reader = csv.reader(csv_file)
        return list(reader)

    # This test sets up the export by logging in and starting two queues
    def test_export_setup(self):
        # We need two queues to test this, so we'll login, start the meeting then create another one
        self.client.login(username='hosttwo', password='rohqtest')
        # Start the meeting through the api to generate logs
        response = self.client.post(f'/api/meetings/{self.meeting.id}/start')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.create_test_queue()
        self.client.login(username='hosttwo', password='rohqtest')
        # Start the meeting through the api to generate logs
        response = self.client.post(f'/api/meetings/{self.meeting.id}/start')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_export_meeting_start_logs(self):
        self.test_export_setup()
        self.client.login(username='hostone', password='rohqtest')
        # Start the meeting through the api to generate logs
        response = self.client.get(f'/api/export_meeting_start_logs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_csv = self.read_csv_from_response(response.content)
        # Just check right now that there's a header row and a data row, perhaps do more validation later
        self.assertEqual(len(response_csv), 3)
        self.client.login(username='hosttwo', password='rohqtest')
        # Start the meeting through the api to generate logs
        response = self.client.post(f'/api/meetings/{self.meeting.id}/start')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_export_meeting_start_logs_for_queue(self):
        self.test_export_setup()
        # Now just try on one queue, there should only be one extra row
        response = self.client.get(f'/api/export_meeting_start_logs/{self.queue.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_csv = self.read_csv_from_response(response.content)
        # Just check right now that there's a header row and a data row, perhaps do more validation later
        self.assertEqual(len(response_csv), 2)

    def test_export_meeting_start_logs_for_queue_deleted(self):
        self.test_export_setup()
        # Now delete the queue, it should still export
        self.queue.delete()
        response = self.client.get(f'/api/export_meeting_start_logs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_csv = self.read_csv_from_response(response.content)
        # Just check right now that there's a header row and a data row, perhaps do more validation later
        self.assertEqual(len(response_csv), 3)

@skipIf(notifications.twilio is None, 'Skipping because "twilio" is not configured')
@override_settings(TWILIO_ACCOUNT_SID='fake', TWILIO_AUTH_TOKEN='fake', TWILIO_MESSAGING_SERVICE_SID='fake')
class UserOTPTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create(username='testuser')
        self.user.set_password('testpassword')
        self.user.save()

        self.client = Client()

    @patch("officehours_api.notifications.twilio.messages.create")
    @patch("officehours_api.views.UserOTP.generate_otp")
    def test_send_otp_success(self, mock_generate_otp, mock_send_message):
        otp_token = 1234
        otp_expiration = datetime(1963, 12, 31, 23, 59, 59, tzinfo=timezone.utc) # late December back in '63
        def generate_otp(request):
            request.data["otp_token"] = otp_token
            request.data["otp_expiration"] = otp_expiration
        mock_generate_otp.side_effect = generate_otp # mock the generate_otp method

        url = f'/api/users/{self.user.id}/otp/'
        data = {
            "action": "send",
            "otp_phone_number": "1234567890"
        }
        self.client.login(username='testuser', password='testpassword')
        response = self.client.patch(url, data, content_type='application/json')
        self.user.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK) # status code correct
        self.assertEqual(mock_send_message.call_count, 1) # send_message called once
        self.assertEqual(mock_send_message.call_args[1]['to'], "1234567890") # correct phone number
        self.assertTrue(str(otp_token) in mock_send_message.call_args[1]['body']) # correct message
        self.assertEqual(self.user.profile.otp_phone_number, "1234567890") # otp_phone_number saved
        self.assertEqual(self.user.profile.otp_token, "1234") # otp_token saved
        self.assertEqual(self.user.profile.otp_expiration, otp_expiration) # otp_expiration saved

    @patch("officehours_api.views.send_one_time_password")
    def test_send_otp_failure(self, mock_send_one_time_password):
        mock_send_one_time_password.return_value = False

        url = f'/api/users/{self.user.id}/otp/'
        data = {
            "action": "send",
            "otp_phone_number": "1234567890"
        }
        self.client.login(username='testuser', password='testpassword')
        response = self.client.patch(url, data, content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST) # status code correct
        self.assertEqual(
            response.data['detail'],
            "Failed to send verification code; please check your phone number and try again."
        ) # error message correct
        self.user.refresh_from_db()
        self.assertEqual(self.user.profile.otp_phone_number, "") # otp_phone_number not saved
        self.assertEqual(self.user.profile.otp_token, "") # otp_token not saved

    @patch("officehours_api.notifications.twilio.messages.create")  
    @patch("officehours_api.views.UserOTP.generate_otp")
    def test_verify_otp_expired(self, mock_generate_otp, _):
        otp_token = "1234"
        otp_expiration = datetime.now(timezone.utc) - timedelta(minutes=1)
        def generate_otp(request):
            request.data["otp_token"] = otp_token
            request.data["otp_expiration"] = otp_expiration
        mock_generate_otp.side_effect = generate_otp
        
        url = f'/api/users/{self.user.id}/otp/'
        data_send = {
            "action": "send",
            "otp_phone_number": "1234567890"
        }
        data_verify = {
            "action": "verify",
            "otp_token": "1234"
        }
        self.client.login(username='testuser', password='testpassword')
        self.client.patch(url, data_send, content_type='application/json') # send OTP (mock expired)
        response = self.client.patch(url, data_verify, content_type='application/json') # verify OTP
        self.user.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST) # status code correct
        self.assertEqual(
            response.data['detail'],
            "Your verification code has expired. Please request a new one."
        ) # error message correct

    @patch("officehours_api.notifications.twilio.messages.create")
    @patch("officehours_api.views.UserOTP.generate_otp")
    def test_verify_otp_incorrect(self, mock_generate_otp, _):
        otp_token = "1234"
        otp_expiration = datetime.now(timezone.utc) + timedelta(minutes=5)
        def generate_otp(request):
            request.data["otp_token"] = otp_token
            request.data["otp_expiration"] = otp_expiration
        mock_generate_otp.side_effect = generate_otp

        url = f'/api/users/{self.user.id}/otp/'
        data_send = {
            "action": "send",
            "otp_phone_number": "1234567890"
        }
        data_verify = {
            "action": "verify",
            "otp_token": "0000"
        }
        self.client.login(username='testuser', password='testpassword')
        self.client.patch(url, data_send, content_type='application/json')
        response = self.client.patch(url, data_verify, content_type='application/json')
        self.user.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST) # status code correct
        self.assertEqual(
            response.data['detail'],
            "Incorect Verification Code Entered."
        ) # error message correct

        self.assertEqual(self.user.profile.otp_token, "1234") # otp_token not cleared
        self.assertGreaterEqual(
            self.user.profile.otp_expiration,
            datetime.now(timezone.utc) + timedelta(minutes=4)
        ) # otp_expiration not cleared
        self.assertEqual(self.user.profile.otp_phone_number, "1234567890") # otp_phone_number not cleared
        self.assertEqual(self.user.profile.phone_number, "") # phone_number not changed

    @patch("officehours_api.notifications.twilio.messages.create")
    @patch("officehours_api.views.UserOTP.generate_otp")
    def test_verify_otp_success(self, mock_generate_otp, _):
        otp_token = "1234"
        otp_expiration = datetime.now(timezone.utc) + timedelta(minutes=5)
        def generate_otp(request):
            request.data["otp_token"] = otp_token
            request.data["otp_expiration"] = otp_expiration
        mock_generate_otp.side_effect = generate_otp

        url = f'/api/users/{self.user.id}/otp/'
        data_send = {
            "action": "send",
            "otp_phone_number": "1234567890"
        }
        data_verify = {
            "action": "verify",
            "otp_token": "1234"
        }
        self.client.login(username='testuser', password='testpassword')
        self.client.patch(url, data_send, content_type='application/json')
        response = self.client.patch(url, data_verify, content_type='application/json')
        self.user.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK) # status code correct
        self.assertEqual(self.user.profile.phone_number, "1234567890") # phone_number saved
        self.assertEqual(self.user.profile.otp_token, "") # otp_token cleared
        self.assertEqual(self.user.profile.otp_phone_number, "") # otp_phone_number cleared
        self.assertLessEqual(
            datetime.strptime(response.data['otp_expiration'], "%Y-%m-%dT%H:%M:%S.%f%z"),
            datetime.now(timezone.utc) - timedelta(minutes=1)
        ) # otp_expiration cleared
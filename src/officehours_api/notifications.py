import asyncio
import logging

from django.conf import settings
from django.dispatch import receiver
from django.db.models.signals import pre_delete, post_save
from django.contrib.sites.models import Site
from django.urls import reverse

from twilio.rest import Client as TwilioClient

from officehours_api.models import Queue, Meeting, MeetingStatus

logger = logging.getLogger(__name__)

twilio = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)


# `reverse()` at the module level breaks `/admin`, so defer it by wrapping it in a function.
def build_addendum(domain: str):
    pref_url = f"{domain}{reverse('preferences')}"
    return (
        f"\n\nYou opted in to receive these texts from U-M. "
        f"Opt out at {pref_url}"
    )

async def send_one_time_password(phone_number: str, otp_token: str):
    '''
    Send a one-time password to a phone number.
    Returns True if the message was sent successfully, False otherwise.
    '''
    logger.info("send_one_time_password: %s", phone_number)
    try:
        twilio.messages.create(
            messaging_service_sid=settings.TWILIO_MESSAGING_SERVICE_SID,
            to=phone_number,
            body=(
                f"Your verification code is {otp_token}"
                f"{build_addendum(Site.objects.get_current().domain)}"
            ),
        )
        return True
    except:
        logger.exception(f"Error while sending OTP to {phone_number}")
        return False

def notify_meeting_started(started: Meeting):
    phone_numbers = list(
        u.profile.phone_number for u in
        started.attendees_with_phone_numbers.filter(profile__notify_me_attendee__exact=True)
    )
    queue_path = reverse('queue', kwargs={'queue_id': started.queue.id})
    domain = Site.objects.get_current().domain
    queue_url = f"{domain}{queue_path}"
    for p in phone_numbers:
        try:
            logger.info('notify_meeting_started: %s', p)
            twilio.messages.create(
                messaging_service_sid=settings.TWILIO_MESSAGING_SERVICE_SID,
                to=p,
                body=(
                    f"It's your turn in queue {queue_url}"
                    f"{build_addendum(domain)}"
                ),
            )
        except:
            logger.exception(f"Error while sending attendee notification to {p} for queue {started.queue.id}")


def notify_queue_no_longer_empty(first: Meeting):
    phone_numbers = list(
        h.profile.phone_number for h in
        first.queue.hosts_with_phone_numbers.filter(profile__notify_me_host__exact=True)
    )
    edit_path = reverse('edit', kwargs={'queue_id': first.queue.id})
    domain = Site.objects.get_current().domain
    edit_url = f"{domain}{edit_path}"
    for p in phone_numbers:
        try:
            logger.info('notify_queue_no_longer_empty: %s', p)
            twilio.messages.create(
                messaging_service_sid=settings.TWILIO_MESSAGING_SERVICE_SID,
                to=p,
                body=(
                    f"Someone joined your queue {edit_url}"
                    f"{build_addendum(domain)}"
                ),
            )
        except:
            logger.exception(f"Error while sending host notification to {p} for queue {first.queue.id}")


@receiver(post_save, sender=Meeting)
def trigger_notification_create(sender, instance: Meeting, created, **kwargs):
    if instance.deleted:
        return
    if created and instance.line_place == 0:
        notify_queue_no_longer_empty(instance)
    if (
        instance.saved_status.value < MeetingStatus.STARTED.value
        and instance.status.value >= MeetingStatus.STARTED.value
    ):
        notify_meeting_started(instance)

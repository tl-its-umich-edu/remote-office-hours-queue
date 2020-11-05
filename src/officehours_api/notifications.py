import logging

from django.conf import settings
from django.dispatch import receiver
from django.db.models.signals import pre_delete, post_save
from django.contrib.sites.models import Site
from django.urls import reverse

from twilio.rest import Client as TwilioClient

from officehours_api.models import Queue, Meeting

logger = logging.getLogger(__name__)

twilio = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

DOMAIN = Site.objects.get_current().domain
PREF_URL = f"{DOMAIN}{reverse('preferences')}"
ADDENDUM = (
    f"\n\nYou opted in to receive these messages from U-M. "
    f"Opt out at {PREF_URL}"
)


def notify_next_in_line(next_in_line: Meeting):
    phone_numbers = list(
        u.profile.phone_number for u in
        next_in_line.attendees_with_phone_numbers.filter(profile__notify_me_attendee__exact=True)
    )
    queue_waited_in: Queue = next_in_line.queue
    queue_path = reverse('queue', kwargs={'queue_id': queue_waited_in.id})
    queue_url = f"{DOMAIN}{queue_path}"
    for p in phone_numbers:
        try:
            logger.info('notify_next_in_line: %s', p)
            twilio.messages.create(
                messaging_service_sid=settings.TWILIO_MESSAGING_SERVICE_SID,
                to=p,
                body=(
                    f"It's your turn in queue {queue_url}"
                    f"{ADDENDUM}"
                ),
            )
        except:
            logger.exception(f"Error while sending attendee notification to {p} for queue {next_in_line.queue.id}")


def notify_queue_no_longer_empty(first: Meeting):
    phone_numbers = list(
        h.profile.phone_number for h in
        first.queue.hosts_with_phone_numbers.filter(profile__notify_me_host__exact=True)
    )
    edit_path = reverse('edit', kwargs={'queue_id': first.queue.id})
    edit_url = f"{DOMAIN}{edit_path}"
    for p in phone_numbers:
        try:
            logger.info('notify_queue_no_longer_empty: %s', p)
            twilio.messages.create(
                messaging_service_sid=settings.TWILIO_MESSAGING_SERVICE_SID,
                to=p,
                body=(
                    f"Someone joined your queue {edit_url}"
                    f"{ADDENDUM}"
                ),
            )
        except:
            logger.exception(f"Error while sending host notification to {p} for queue {first.queue.id}")


@receiver(pre_delete, sender=Meeting)
def trigger_notification_delete(sender, instance: Meeting, **kwargs):
    if instance.line_place == 0:
        if instance.queue.meeting_set.count() <= 1:
            return
        next_in_line = instance.queue.meeting_set.order_by('id')[1]
        notify_next_in_line(next_in_line)


@receiver(post_save, sender=Meeting)
def trigger_notification_create(sender, instance: Meeting, created, **kwargs):
    if instance.deleted or not created:
        return
    if instance.line_place == 0:
        notify_queue_no_longer_empty(instance)

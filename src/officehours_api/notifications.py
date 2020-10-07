from django.conf import settings
from django.dispatch import receiver
from django.db.models.signals import pre_delete
from django.contrib.sites.models import Site
from django.urls import reverse

from twilio.rest import Client as TwilioClient

from officehours_api.models import Queue, Meeting


if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_PHONE_FROM:
    def notify_next_in_line(next_in_line: Meeting):
        for phone in (u.profile.phone_number for u in next_in_line.attendees.all() if u.profile.phone_number):
            print(phone)
            client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            domain = Site.objects.get_current().domain
            queue_path = reverse('queue', kwargs={'queue_id': next_in_line.queue.id})
            queue_url = f"https://{domain}{queue_path}"
            message = client.messages.create(
                to=phone,
                from_=settings.TWILIO_PHONE_FROM,
                body=(
                    f"You're next in line! Please visit {queue_url} "
                    f"for instructions to join."
                ),
            )
            print(message.sid)

    @receiver(pre_delete, sender=Meeting)
    def trigger_notification_delete(sender, instance: Meeting, **kwargs):
        print('trigger_notification_delete', instance)
        print('place_in_line', instance.line_place)
        if instance.line_place == 0:
            if instance.queue.meeting_set.count() <= 1:
                return
            next_in_line = instance.queue.meeting_set.order_by('id')[1]
            notify_next_in_line(next_in_line)

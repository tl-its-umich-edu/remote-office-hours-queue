from django.conf import settings
from django.dispatch import receiver
from django.db.models.signals import pre_delete, post_save
from django.contrib.sites.models import Site
from django.urls import reverse

from twilio.rest import Client as TwilioClient

from officehours_api.models import Queue, Meeting


if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_PHONE_FROM:
    twilio = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

    def notify_next_in_line(next_in_line: Meeting):
        phone_numbers = (
            u.profile.phone_number for u in
            next_in_line.attendees
                .exclude(profile__phone_number__isnull=True)
                .exclude(profile__phone_number__exact='')
        )
        for p in phone_numbers:
            print(p)
            domain = Site.objects.get_current().domain
            queue_path = reverse('queue', kwargs={'queue_id': next_in_line.queue.id})
            queue_url = f"https://{domain}{queue_path}"
            message = twilio.messages.create(
                to=p,
                from_=settings.TWILIO_PHONE_FROM,
                body=(
                    f"You're next in line! Please visit {queue_url} "
                    f"for instructions to join."
                ),
            )
            print(message.sid)
    
    def notify_queue_no_longer_empty(first: Meeting):
        print('notify_queue_no_longer_empty', first)
        phone_numbers = (
            h.profile.phone_number for h in
            first.queue.hosts
                .exclude(profile__phone_number__isnull=True)
                .exclude(profile__phone_number__exact='')
        )
        for p in phone_numbers:
            print(p)
            domain = Site.objects.get_current().domain
            edit_path = reverse('edit', kwargs={'queue_id': first.queue.id})
            edit_url = f"https://{domain}{edit_path}"
            message = twilio.messages.create(
                to=p,
                from_=settings.TWILIO_PHONE_FROM,
                body=(
                    f"Someone has joined your queue! Please visit {edit_url} "
                    f"to start a meeting."
                ),
            )
            print(message.sid)

    @receiver(pre_delete, sender=Meeting)
    def trigger_notification_delete(sender, instance: Meeting, **kwargs):
        print('trigger_notification_delete', instance)
        print('line_place', instance.line_place)
        if instance.line_place == 0:
            if instance.queue.meeting_set.count() <= 1:
                return
            next_in_line = instance.queue.meeting_set.order_by('id')[1]
            notify_next_in_line(next_in_line)

    @receiver(post_save, sender=Meeting)
    def trigger_notification_create(sender, instance: Meeting, created, **kwargs):
        print('trigger_notification_create')
        if instance.deleted:
            return
        if not created:
            return
        print('line_place', instance.line_place)
        if instance.line_place == 0:
            notify_queue_no_longer_empty(instance)

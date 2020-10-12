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
        print('notify_next_in_line', next_in_line.attendees.all())
        print('with phones:', next_in_line.attendees_with_phone_numbers)
        for a in next_in_line.attendees.all():
            print(a)
            print(a.profile.phone_number)
        phone_numbers = list(
            u.profile.phone_number for u in
            next_in_line.attendees_with_phone_numbers
        )
        if not phone_numbers:
            print('no phone numbers to notify')
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
            print('sid', message.sid)

    def notify_queue_no_longer_empty(first: Meeting):
        print('notify_queue_no_longer_empty', first)
        print('with phones:', first.queue.hosts_with_phone_numbers)
        phone_numbers = list(
            h.profile.phone_number for h in
            first.queue.hosts_with_phone_numbers
        )
        if not len(list(phone_numbers)): print('no phone numbers to notify')
        for p in phone_numbers:
            print(p)
            domain = Site.objects.get_current().domain
            edit_path = reverse('edit', kwargs={'queue_id': first.queue.id})
            edit_url = f"https://{domain}{edit_path}"
            message = twilio.messages.create(
                to=p,
                from_=settings.TWILIO_PHONE_FROM,
                body=(
                    f"Someone has joined your queue, {first.queue.name}! "
                    f"Please visit {edit_url} "
                    f"to start a meeting."
                ),
            )
            print('sid', message.sid)

    @receiver(pre_delete, sender=Meeting)
    def trigger_notification_delete(sender, instance: Meeting, **kwargs):
        print('trigger_notification_delete', instance)
        print('line_place', instance.line_place)
        if instance.line_place == 0:
            print('meetings:', instance.queue.meeting_set.all())
            if instance.queue.meeting_set.count() <= 1:
                print('this was the last queue so there is no next_in_line')
                return
            next_in_line = instance.queue.meeting_set.order_by('id')[1]
            print('next_in_line', next_in_line)
            notify_next_in_line(next_in_line)

    @receiver(post_save, sender=Meeting)
    def trigger_notification_create(sender, instance: Meeting, created, **kwargs):
        print('trigger_notification_create')
        if instance.deleted or not created:
            return
        print('line_place', instance.line_place)
        if instance.line_place == 0:
            notify_queue_no_longer_empty(instance)

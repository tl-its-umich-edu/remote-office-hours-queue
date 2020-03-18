from django.core.management.base import BaseCommand, CommandError
from bluejeans_queue.models import BluejeansMeeting


class Command(BaseCommand):
    help = 'List all active queues'

    def handle(self, *args, **options):
        meetings = BluejeansMeeting.objects.filter(is_active=True)
        for meeting in meetings.order_by('owner').distinct('owner'):
            queue_details = {
                'owner': meeting.owner.username,
                'in_line': meeting.owner.owner.filter(is_active=True).count(),
            }
            self.stdout.write(str(queue_details))

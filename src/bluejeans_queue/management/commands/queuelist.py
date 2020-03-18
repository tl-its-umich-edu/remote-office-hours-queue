from django.core.management.base import BaseCommand, CommandError
from bluejeans_queue.models import BluejeansMeeting

class Command(BaseCommand):
    help = 'List all active queues'

    def handle(self, *args, **options):
        #self.stdout.write(str(BluejeansMeeting.objects.filter(is_active=True)))
        for meeting in BluejeansMeeting.objects.filter(is_active=True):
            self.stdout.write(str(meeting))

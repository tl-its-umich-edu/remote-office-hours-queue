from django.core.management.base import BaseCommand
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'List all active queues'

    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='get all active and inactive queues',
        )

    def handle(self, *args, **options):
        if options['all']:
            owners = User.objects.filter(owner__isnull=False).distinct()
        else:
            owners = User.objects.filter(owner__is_active=True).distinct()

        for owner in owners:
            queue_details = {
                'owner': owner.email,
                'in_line': owner.owner.filter(is_active=True).count(),
            }
            self.stdout.write(str(queue_details))

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from officehours_api.models import Queue


class Command(BaseCommand):
    help = (
        'Create a queue for each user in a list of uniqnames that '
        'is not already a host of a queue.'
    )

    def add_arguments(self, parser):
        parser.add_argument('uniqnames', nargs='+')

    def handle(self, *args, **options):
        for uniqname in options['uniqnames']:

            # Skip the user if they don't exist
            try:
                user = User.objects.get(username=uniqname)
            except User.DoesNotExist:
                self.stdout.write(f'User {uniqname} does not exist.')
                continue

            # Create the queue if user is not already a host
            queue = Queue.objects.filter(hosts__in=[user])
            if queue:
                self.stdout.write(f'{user} is already a host.')
            else:
                queue = Queue.objects.create(name=uniqname)
                queue.hosts.set([user])
                self.stdout.write(f'Created queue for host {user}')

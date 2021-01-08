from typing import Set

from django.conf import settings
from django.core.management.base import BaseCommand

from officehours_api.backends.backend_phaser import BackendPhaser


class Command(BaseCommand):
    help = (
        'phase_out_backends identifies implemented backends that are not enabled '
        '(i.e. that lack configuration variables) '
        'and modifies Queue and Meeting objects that use those disabled backends'
        'according to the options passed as flags.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--remove-as-allowed',
            dest='remove_as_allowed',
            action='store_true',
            help='Remove disabled backends as allowed backends for queues.'
        )
        parser.add_argument(
            '--set-unstarted-to-default',
            dest='set_unstarted_to_default',
            action='store_true',
            help='Change meetings using disabled backends to use the default backend type.'
        )
        parser.add_argument(
            '--delete-started',
            dest='delete_started',
            action='store_true',
            help='Delete started meetings with disabled backends.'
        )

    def handle(self, *args, **options):
        old_backends: Set[settings.IMPLEMENTED_BACKEND] = settings.IMPLEMENTED_BACKENDS - settings.ENABLED_BACKENDS
        self.stdout.write('Identified one or more old backends: ' + ', '.join(list(old_backends)))

        for old_backend in old_backends:
            phaser = BackendPhaser(old_backend)
            phaser.phase_out(
                options['remove_as_allowed'],
                options['set_unstarted_to_default'],
                options['delete_started']
            )

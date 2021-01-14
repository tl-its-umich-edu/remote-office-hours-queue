from typing import Set

from django.conf import settings
from django.core.management.base import BaseCommand

from officehours_api.backends import __all__ as IMPLEMENTED_BACKEND_NAMES
from officehours_api.backends.backend_phaser import BackendPhaser
from officehours_api.backends.types import IMPLEMENTED_BACKEND_NAME


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
            '--set-unstarted-to-other',
            dest='set_unstarted_to_other',
            action='store_true',
            help='Change meetings using disabled backends to use another allowed backend type.'
        )
        parser.add_argument(
            '--delete-started',
            dest='delete_started',
            action='store_true',
            help='Delete started meetings with disabled backends.'
        )

    def handle(self, *args, **options):
        old_backend_names: Set[IMPLEMENTED_BACKEND_NAME] = set(IMPLEMENTED_BACKEND_NAMES) - settings.ENABLED_BACKENDS
        self.stdout.write('Identified one or more old backends: ' + ', '.join(list(old_backend_names)))

        for old_backend_name in old_backend_names:
            phaser = BackendPhaser(old_backend_name)
            phaser.phase_out(
                options['remove_as_allowed'],
                options['set_unstarted_to_other'],
                options['delete_started']
            )

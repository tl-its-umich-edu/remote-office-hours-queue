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
            '--replace-allowed-and-unstarted',
            dest='replace_allowed_and_unstarted',
            action='store_true',
            help=(
                'Remove disabled backends as allowed backends for queues '
                'and change meetings using disabled backends to use another allowed backend type.'
            )
        )
        parser.add_argument(
            '--delete-started',
            dest='delete_started',
            action='store_true',
            help='Delete started meetings with disabled backends.'
        )
        parser.add_argument(
            '--dry-run',
            dest='dry_run',
            action='store_true',
            help='Do not save changes made (helps to assess impact of operations).'
        )

    def handle(self, *args, **options):
        disabled_backend_names: Set[IMPLEMENTED_BACKEND_NAME] = set(IMPLEMENTED_BACKEND_NAMES) - settings.ENABLED_BACKENDS
        self.stdout.write('Identified one or more disabled backends: ' + ', '.join(list(disabled_backend_names)))

        for disabled_backend_name in disabled_backend_names:
            phaser = BackendPhaser(disabled_backend_name)
            phaser.phase_out(
                options['replace_allowed_and_unstarted'],
                options['delete_started'],
                options['dry_run']
            )

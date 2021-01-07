from typing import List, Optional, Set

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db.models import QuerySet

from officehours_api.models import Meeting, MeetingStatus, Queue


class Command(BaseCommand):
    help = (
        'phase_out_backends identifies implemented backends that are not enabled '
        '(i.e. that lack configuration variables) '
        'and modifies Queue and Meeting objects that use those disabled backends.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--delete-started',
            dest='delete-started',
            action='store_true',
            help='Optionally delete started meetings with disabled backends.'
        )

    def phase_out_backend(self, old_backend: settings.IMPLEMENTED_BACKEND, delete_started_meetings: bool):
        self.stdout.write(f'Old backend: {old_backend}')
        queues_allowing_old_backend = Queue.objects.filter(allowed_backends__contains=[old_backend])
        self.stdout.write(f'Number of queues allowing {old_backend}: {len(queues_allowing_old_backend)}')
        for queue in queues_allowing_old_backend:
            queue.remove_allowed_backend(old_backend)
            self.stdout.write(f'Removed {old_backend} as an allowed backend from queue {queue.id}')

            meetings_with_old_backend: QuerySet = queue.meeting_set.filter(backend_type=old_backend)
            unstarted_meetings_with_old_backend: List[Meeting] = [
                meeting for meeting in meetings_with_old_backend if meeting.status != MeetingStatus.STARTED
            ]
            for meeting in unstarted_meetings_with_old_backend:
                meeting.change_backend_type()  # Set to default
            self.stdout.write(
                f'Set the backend_type for {len(unstarted_meetings_with_old_backend)} meetings '
                f'from queue {queue.id} to the default.'
            )

            if delete_started_meetings:
                self.stdout.write(f'Deleting started meetings with {old_backend} as backend_type...')
                started_meeting_with_old_backend: List[Meeting] = [
                    meeting for meeting in meetings_with_old_backend
                    if meeting.status == MeetingStatus.STARTED
                ]
                for started_meeting in started_meeting_with_old_backend:
                    started_meeting.delete()
                self.stdout.write(
                    f'Deleted {len(unstarted_meetings_with_old_backend)} started meetings '
                    f'with backend_type {old_backend} from queue {queue.id}.'
                )

    def handle(self, *args, **options):
        old_backends: Set[settings.IMPLEMENTED_BACKEND] = settings.IMPLEMENTED_BACKENDS - settings.ENABLED_BACKENDS
        self.stdout.write('Identified one or more old backends: ' + ', '.join(list(old_backends)))

        for old_backend in old_backends:
            self.phase_out_backend(old_backend, options.get('delete-started'))

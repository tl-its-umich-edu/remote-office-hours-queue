import logging
from typing import List

from django.conf import settings

from officehours_api.models import Meeting, MeetingStatus, Queue
from officehours_api.backends.types import IMPLEMENTED_BACKEND_NAME


logger = logging.getLogger(__name__)


class BackendPhaser:
    """
    Class for managing queries and operations related to the phasing out of backends.
    """

    def __init__(self, old_backend_name: IMPLEMENTED_BACKEND_NAME):
        self.backend_name: IMPLEMENTED_BACKEND_NAME = old_backend_name

    def get_queues_allowing_backend(self) -> List[Queue]:
        return list(Queue.objects.filter(allowed_backends__contains=[self.backend_name]))

    def get_meetings_with_backend(self) -> List[Meeting]:
        return list(Meeting.objects.filter(backend_type=self.backend_name))

    def remove_backend_from_queue_allowed_backends(self):
        logger.info(f'Removing {self.backend_name} from allowed_backends when present in queues...')
        queues_allowing_backend = self.get_queues_allowing_backend()
        logger.info(f'Number of queues allowing {self.backend_name}: {len(queues_allowing_backend)}')
        for queue in queues_allowing_backend:
            queue.remove_allowed_backend(self.backend_name)
        Queue.objects.bulk_update(queues_allowing_backend, fields=['allowed_backends'])
        logger.info(
            f'Removed {self.backend_name} as an allowed backend '
            f'from {len(queues_allowing_backend)} queues.'
        )

    def set_unstarted_meetings_to_default_backend(self):
        logger.info('Setting backend_type of unstarted meetings to use the default backend...')
        meetings_with_backend = self.get_meetings_with_backend()
        unstarted_meetings_with_backend: List[Meeting] = [
            meeting for meeting in meetings_with_backend if meeting.status != MeetingStatus.STARTED
        ]
        for meeting in unstarted_meetings_with_backend:
            meeting.change_backend_type()
        Meeting.objects.bulk_update(unstarted_meetings_with_backend, fields=['backend_type'])
        logger.info(
            f'Set the backend_type for {len(unstarted_meetings_with_backend)} meeting(s) '
            f'to the default {settings.DEFAULT_BACKEND}.'
        )

    def delete_started_meetings(self):
        logger.info(f'Deleting started meetings with {self.backend_name} as backend_type...')
        meetings_with_backend = self.get_meetings_with_backend()
        started_meetings_with_backend: List[Meeting] = [
            meeting for meeting in meetings_with_backend if meeting.status == MeetingStatus.STARTED
        ]
        for started_meeting in started_meetings_with_backend:
            started_meeting.delete()
        logger.info(
            f'Deleted {len(started_meetings_with_backend)} '
            f'started meeting(s) with backend_type {self.backend_name}.'
        )

    def phase_out(self, remove_as_allowed: bool, set_unstarted_to_default: bool, delete_started: bool):
        logger.info(f'Old backend: {self.backend_name}')
        if remove_as_allowed:
            self.remove_backend_from_queue_allowed_backends()
        if set_unstarted_to_default:
            self.set_unstarted_meetings_to_default_backend()
        if delete_started:
            self.delete_started_meetings()

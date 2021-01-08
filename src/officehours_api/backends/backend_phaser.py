import logging
from typing import List

from django.conf import settings
from django.db.models import QuerySet

from officehours_api.models import Meeting, MeetingStatus, Queue


logger = logging.getLogger(__name__)


class BackendPhaser:
    """
    Class for managing queries and operations related to the phasing out of backends.
    """

    def __init__(self, old_backend: settings.IMPLEMENTED_BACKEND):
        self.old_backend: settings.IMPLEMENTED_BACKEND = old_backend

    def get_queues_allowing_backend(self) -> QuerySet:
        return Queue.objects.filter(allowed_backends__contains=[self.old_backend])

    def get_meetings_with_backend(self) -> QuerySet:
        return Meeting.objects.filter(backend_type=self.old_backend)

    def remove_backend_from_queue_allowed_backends(self):
        queues_allowing_backend = self.get_queues_allowing_backend()
        logger.info(f'Number of queues allowing {self.old_backend}: {len(queues_allowing_backend)}')
        for queue in queues_allowing_backend:
            queue.remove_allowed_backend(self.old_backend)
            logger.info(f'Removed {self.old_backend} as an allowed backend from queue {queue.id}')

    def set_unstarted_meetings_to_default_backend(self):
        logger.info('Setting backend_type of unstarted meetings to use the default backend...')
        meetings_with_backend = self.get_meetings_with_backend()
        unstarted_meetings_with_old_backend: List[Meeting] = [
            meeting for meeting in meetings_with_backend if meeting.status != MeetingStatus.STARTED
        ]
        for meeting in unstarted_meetings_with_old_backend:
            meeting.change_backend_type()
        logger.info(
            f'Set the backend_type for {len(unstarted_meetings_with_old_backend)} meeting(s) '
            f'to the default {settings.DEFAULT_BACKEND}.'
        )

    def delete_started_meetings(self):
        logger.info(f'Deleting started meetings with {self.old_backend} as backend_type...')
        meetings_with_backend = self.get_meetings_with_backend()
        started_meetings_with_old_backend: List[Meeting] = [
            meeting for meeting in meetings_with_backend if meeting.status == MeetingStatus.STARTED
        ]
        for started_meeting in started_meetings_with_old_backend:
            started_meeting.delete()
        logger.info(
            f'Deleted {len(started_meetings_with_old_backend)} '
            f'started meeting(s) with backend_type {self.old_backend}.'
        )

    def phase_out(self, remove_as_allowed: bool, set_unstarted_to_default: bool, delete_started: bool):
        logger.info(f'Old backend: {self.old_backend}')
        if remove_as_allowed:
            self.remove_backend_from_queue_allowed_backends()
        if set_unstarted_to_default:
            self.set_unstarted_meetings_to_default_backend()
        if delete_started:
            self.delete_started_meetings()

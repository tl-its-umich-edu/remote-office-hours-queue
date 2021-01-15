import logging
from typing import List

from officehours_api.backends.types import IMPLEMENTED_BACKEND_NAME
from officehours_api.models import Meeting, MeetingStatus, Queue


logger = logging.getLogger(__name__)


class BackendPhaser:
    """
    Class for managing queries and operations related to the phasing out of backends.
    """

    def __init__(self, disabled_backend_name: IMPLEMENTED_BACKEND_NAME):
        self.backend_name: IMPLEMENTED_BACKEND_NAME = disabled_backend_name

    def get_queues_allowing_backend(self) -> List[Queue]:
        return list(Queue.objects.filter(allowed_backends__contains=[self.backend_name]))

    def get_all_meetings_with_backend(self) -> List[Meeting]:
        return list(Meeting.objects.filter(backend_type=self.backend_name))

    def get_meetings_with_backend_through_queues(self, queues: List[Queue]) -> List[Meeting]:
        meetings_with_backend = []
        for queue in queues:
            meetings_with_backend += list(queue.meeting_set.filter(backend_type=self.backend_name))
        return meetings_with_backend

    def remove_backend_from_queue_allowed_backends(self, queues_allowing_backend: List[Queue]) -> List[Queue]:
        for queue in queues_allowing_backend:
            queue.remove_allowed_backend(self.backend_name)
        return queues_allowing_backend

    @staticmethod
    def set_unstarted_meetings_to_other_backend(meetings_with_backend: List[Meeting]) -> List[Meeting]:
        unstarted_meetings_with_backend: List[Meeting] = [
            meeting for meeting in meetings_with_backend if meeting.status != MeetingStatus.STARTED
        ]
        for meeting in unstarted_meetings_with_backend:
            meeting.change_backend_type()  # Set to default backend or other enabled backend if applicable
        return unstarted_meetings_with_backend

    @staticmethod
    def get_started_meetings_to_delete(meetings_with_backend: List[Meeting]) -> List[Meeting]:
        started_meetings_with_backend: List[Meeting] = [
            meeting for meeting in meetings_with_backend if meeting.status == MeetingStatus.STARTED
        ]
        return started_meetings_with_backend

    def phase_out(self, remove_as_allowed_and_replace_unstarted: bool, delete_started: bool, dry_run: bool):
        logger.info(f'Disabled backend: {self.backend_name}')
        if dry_run:
            logger.info('This is a dry run. No changes will be saved, and no records will be deleted.')

        if remove_as_allowed_and_replace_unstarted:
            queues_allowing_backend = self.get_queues_allowing_backend()

            logger.info(f'Removing {self.backend_name} from allowed_backends when present in queues...')
            modified_queues = self.remove_backend_from_queue_allowed_backends(queues_allowing_backend)
            logger.info(
                f'Removed {self.backend_name} as an allowed backend '
                f'from {len(modified_queues)} queue(s).'
            )
            logger.info(f'Modified queue ID(s): {[queue.id for queue in modified_queues]}')
            if not dry_run:
                Queue.objects.bulk_update(modified_queues, fields=['allowed_backends'])
                logger.info('Persisted changes to queues to the database.')

            logger.info('Replacing backend_type of unstarted meetings from the modified queues with another backend...')
            meetings_with_backend = self.get_meetings_with_backend_through_queues(modified_queues)
            modified_meetings = self.set_unstarted_meetings_to_other_backend(meetings_with_backend)
            logger.info(
                f'Set the backend_type for {len(modified_meetings)} meeting(s) '
                f'to other allowed backends.'
            )
            logger.info(f'Modified meeting ID(s): {[meeting.id for meeting in modified_meetings]}')
            if not dry_run:
                Meeting.objects.bulk_update(modified_meetings, fields=['backend_type'])
                logger.info('Persisted changes to unstarted meetings to the database.')

        if delete_started:
            logger.info(f'Finding started meetings with {self.backend_name} as backend_type...')
            meetings_with_backend = self.get_all_meetings_with_backend()
            started_meetings_to_delete = self.get_started_meetings_to_delete(meetings_with_backend)
            logger.info(
                f'Will delete {len(started_meetings_to_delete)} '
                f'started meeting(s) with backend_type {self.backend_name}.'
            )
            logger.info(
                f'ID(s) of meetings staged for deletion: {[meeting.id for meeting in started_meetings_to_delete]}'
            )
            if not dry_run:
                for meeting_to_delete in started_meetings_to_delete:
                    meeting_to_delete.delete()
                logger.info('Deleted started meeting(s) with disabled backend_type.')

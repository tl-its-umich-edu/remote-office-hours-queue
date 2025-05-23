## Changelog

### Admin UI Filter Improvements

**Task:** Improve filter usability in the Django admin interface by limiting filter options to only relevant entries.

**Changes:**

- Implemented `ActualHostsFilter` to replace the default "By hosts" filter on the Queues admin page. The new filter displays only users who are actual hosts of at least one queue. This improves performance and usability when handling large datasets.

- Implemented `ActualQueuesFilter` to replace the default "By queues" filter on the Meetings admin page. The new filter displays only queues that are associated with at least one meeting.

- Created a new file, `admin_filters.py`, to contain reusable Django `SimpleListFilter` subclasses. These custom filters encapsulate filtering logic for host and queue relationships.

- Updated `admin.py`:
  - Modified `QueueAdmin` to use `ActualHostsFilter` instead of the default all-users host filter.
  - Modified `MeetingAdmin` to use `ActualQueuesFilter` to display only active queues with meetings.

### Testing

**New Test Suite:**

- Created `test_admin_filters.py` to verify the correctness of both custom filters.
- Added unit tests to confirm that:
  - Only actual hosts appear in the "By hosts" filter.
  - Filtering by a selected host only returns the queues they are assigned to.
  - Only queues associated with at least one meeting appear in the "By queues" filter.
  - Filtering by a selected queue returns the correct meetings.

### Manual Validation

- Manually tested admin filter behavior using the Django development server.
- Verified that filters do not appear when no applicable data exists.
- Confirmed that filters appear and behave correctly after creating relevant queue and meeting entries.

### Additional Fixes

- Adjusted verbose titles in filters to prevent UI issues (e.g., removed duplicated "by" in the "By hosts" label).
- Cleaned up previous compatibility fixes to ensure filters function correctly with SQLite and local testing environments.

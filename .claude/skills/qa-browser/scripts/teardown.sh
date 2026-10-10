#!/usr/bin/env bash
# Always-runs teardown. Safe to invoke multiple times. Never errors out.
# Deletes qa_host, qa_attendee, qa_smoke_queue and closes agent-browser sessions.
# Leaves artifacts/ in place for the user to inspect.

set +e

docker compose exec -T web python manage.py shell <<'PY'
from django.contrib.auth.models import User
from officehours_api.models import Queue
Queue.objects.filter(name='qa_smoke_queue').delete()
User.objects.filter(username__in=['qa_host','qa_attendee']).delete()
print('teardown complete')
PY

agent-browser --session host close 2>/dev/null
agent-browser --session attendee close 2>/dev/null
agent-browser close --all 2>/dev/null

exit 0

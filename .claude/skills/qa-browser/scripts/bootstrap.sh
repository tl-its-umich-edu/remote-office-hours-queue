#!/usr/bin/env bash
# Idempotent: creates qa_host, qa_attendee, qa_smoke_queue.
# Prints the queue ID (digits only) on stdout. Django output goes to stderr.
# Usage: export QUEUE_ID=$(.claude/skills/qa-browser/scripts/bootstrap.sh)

set -euo pipefail

OUT=$(docker compose exec -T web python manage.py shell 2>&1 <<'PY'
from django.contrib.auth.models import User
from officehours_api.models import Queue
host, _     = User.objects.get_or_create(username='qa_host', defaults={'email':'qa_host@example.com'})
host.set_password('qa_host_pw'); host.is_staff = True; host.save()
attendee, _ = User.objects.get_or_create(username='qa_attendee', defaults={'email':'qa_attendee@example.com'})
attendee.set_password('qa_attendee_pw'); attendee.is_staff = True; attendee.save()
q, _ = Queue.objects.get_or_create(name='qa_smoke_queue')
q.hosts.set([host])
print(f'QUEUE_ID={q.id}')
PY
)

echo "$OUT" >&2
echo "$OUT" | grep -oE 'QUEUE_ID=[0-9]+' | head -1 | cut -d= -f2

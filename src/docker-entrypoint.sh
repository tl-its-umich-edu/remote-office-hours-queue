#!/usr/bin/env bash

set -e

# Load in git version information
source /etc/git.version

echo "Loaded Git information: ${GIT_REPO} ${GIT_BRANCH} ${GIT_COMMIT}"

python manage.py collectstatic --noinput
python manage.py migrate

exec "${@}"

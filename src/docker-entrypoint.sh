#!/usr/bin/env bash

set -e

python manage.py collectstatic --noinput
python manage.py migrate

exec "${@}"

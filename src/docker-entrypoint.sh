#!/usr/bin/env bash

set -e

python3 src/manage.py collectstatic --noinput
python3 src/manage.py migrate

exec "${@}"

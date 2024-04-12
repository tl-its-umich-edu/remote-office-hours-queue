#!/usr/bin/env bash

set -e

# I don't know why, but the following line is necessary to avoid a "ModuleNotFoundError: No module named 'pyzoom'" error
# Simply adding 'pyzoom' to the requirements.txt file doesn't work
python -m pip install --no-cache-dir --upgrade pyzoom

python manage.py collectstatic --noinput
python manage.py migrate

exec "${@}"

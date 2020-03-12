FROM python:3.8-slim

ENV PYTHONUNBUFFERED=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
EXPOSE 8000
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ENV GUNICORN_WORKERS=2
ENV GUNICORN_THREADS=4

RUN pip install gunicorn psycopg2-binary
COPY src/requirements.txt /tmp
RUN pip install -r /tmp/requirements.txt

ENTRYPOINT ["/usr/src/app/docker-entrypoint.sh"]
CMD ["sh", "-c", "gunicorn --bind=0.0.0.0:8000 --workers=${GUNICORN_WORKERS} --threads=${GUNICORN_THREADS} --access-logfile=- --log-file=- officehours.wsgi"]

COPY . /usr/src/app

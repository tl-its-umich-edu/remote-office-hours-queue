# Remote Office Hours Queue

The Remote Office Hours Queue application allows users to schedule office hours through BlueJeans sessions.

## Getting Started

```
docker-compose up
docker-compose run --entrypoint="" web python manage.py createsuperuser
```

Visit `localhost:8003/admin` in your browser and log in with your admin credentials, then visit `localhost:8003` to see the app!

## Architectural Overview

We use Django 3 as a backend and React+TypeScript in the frontend. The frontend is served through [django-webpack-loader](https://github.com/owais/django-webpack-loader) and integrates with the backend via [DRF](https://www.django-rest-framework.org/) REST endpoints and [Django Channels](https://channels.readthedocs.io/en/latest/) websockets. Authentication is handled with OIDC via [mozilla-django-oidc](https://github.com/mozilla/mozilla-django-oidc).

### Backends

Remote Office Hours Queue currently supports meetings in-person or via BlueJeans. These meeting providers -- `inperson` and `bluejeans` -- are considered *backends*.

To use or develop with BlueJeans, set `BLUEJEANS_CLIENT_ID` and `BLUEJEANS_CLIENT_SECRET` as environment variables.

### Notifications

SMS notifications for hosts and attendees are provided via [Twilio](https://www.twilio.com/).

To use or develop with SMS notifications, set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_FROM` as environment variables. Twilio provides free trial accounts with limited credit. You can use special [test credentials](https://www.twilio.com/docs/iam/test-credentials) to not be charged. You can also test notifications via unit tests, where Twilio is mocked: 
```
docker-compose run web python manage.py test officehours_api.tests.NotificationTestCase
```

## Migrations

If you need to create migrations in the course of development, do it like so:
```
docker-compose run web python manage.py makemigrations --settings=officehours.makemigrations_settings
```

This will generate the migrations with all backends enabled as choices.

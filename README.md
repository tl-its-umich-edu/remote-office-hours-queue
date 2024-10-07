# Remote Office Hours Queue

The Remote Office Hours Queue application helps users to manage and participate in drop-in office hours virtually or in-person.
The application can schedule and link to Zoom video-conferencing meetings.
More information about how the tool works is available on the [U-M ITS documentation site](https://documentation.its.umich.edu/office-hours).

## Getting Started

```
docker-compose up
docker-compose run --entrypoint="" web python manage.py createsuperuser
```

Visit `localhost:8003/admin` in your browser and log in with your admin credentials, then visit `localhost:8003` to see the app!

## Architectural Overview

We use Django 3 as a backend and React plus TypeScript in the frontend.
The frontend is served through [django-webpack-loader](https://github.com/owais/django-webpack-loader) and integrates with the backend via
[DRF](https://www.django-rest-framework.org/) REST endpoints and [Django Channels](https://channels.readthedocs.io/en/latest/) websockets.
Authentication is handled with OIDC via [mozilla-django-oidc](https://github.com/mozilla/mozilla-django-oidc).
The user interface leverages [Bootstrap 4](https://getbootstrap.com/docs/4.1/getting-started/introduction/) and
a React implementation of Bootstrap, [react-bootstrap](https://react-bootstrap.github.io/).

## Development

### Backends

Remote Office Hours Queue currently supports meetings in-person or via Zoom.
These meeting providers -- `inperson`, and `zoom` -- are considered *backends*.

To use or develop with Zoom, set `ZOOM_CLIENT_ID` and `ZOOM_CLIENT_SECRET` as environment variables.

### Notifications

SMS notifications for hosts and attendees are provided via [Twilio](https://www.twilio.com/).

To use or develop with SMS notifications,
set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_MESSAGING_SERVICE_SID` as environment variables.
Twilio provides free trial accounts with limited credit.
You can use special [test credentials](https://www.twilio.com/docs/iam/test-credentials) to not be charged.
You can also test notifications via unit tests, where Twilio is mocked:
```
docker-compose run web python manage.py test officehours_api.tests.NotificationTestCase
```

### Migrations

If you need to create migrations in the course of development, do it like so:
```
docker-compose run web python manage.py makemigrations --settings=officehours.makemigrations_settings
```

This will generate the migrations with all backends enabled as choices.

### Using OpenAPI and Swagger

The backend uses the [Django REST Framework](https://www.django-rest-framework.org/) to build out a REST API.
When `DEBUG` is set to `True` in Django settings, the application leverages the
[drf-spectacular](https://drf-spectacular.readthedocs.io/en/latest/index.html) library to document existing endpoints
and provide for API testing using Swagger.

The Swagger UI can be accessed by navigating to [`api/schema/swagger-ui`](http://localhost:8003/api/schema/swagger-ui).
Once on the page, requests can be made against the API using the "Try it out" functionality.
The OpenAPI schema can be downloaded as a YAML file from [`/api/schema`](http://localhost:8003/api/schema).

### Google Analytics

This application is capable of being configured to use Google Analytics 4.
In order to send events, the environment variable `GA_TRACKING_ID` needs to be set to
your application's [measurement ID](https://support.google.com/analytics/answer/9539598#find-G-ID)
and the `DEBUG` environment variable and Django setting need to be off or `False`.
Thus, a deployment environment is currently the simplest place for testing.

### Local Database

The local PostgreSQL database is exposed with the port 5432. You can connect to it on localhost with the 
```
user: admin
password: admin_pw
```
Make sure you don't have anything else running on this port. The credentials above are default and defined in `docker-compose.yml`
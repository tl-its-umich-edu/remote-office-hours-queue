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

# build react components for production mode
FROM node:18-alpine AS node-webpack
WORKDIR /usr/src/app

# NOTE: package.json and webpack.config.js not likely to change between dev builds
COPY package.json package-lock.json webpack.config.js tsconfig.json /usr/src/app/
RUN npm install

# NOTE: assets/ likely to change between dev builds
COPY assets /usr/src/app/assets
RUN npm run prod

#####################################################################

FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
EXPOSE 8000
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ENV WEB_CONCURRENCY=5

RUN apt-get update
RUN apt-get -y install gcc libpq-dev
RUN pip install \
    'gunicorn==20.1.0' \
    'uvicorn[standard]==0.22.0' \
    'psycopg2~=2.9.5'
COPY requirements.txt /tmp
RUN pip install -r /tmp/requirements.txt

ENTRYPOINT ["/usr/src/app/docker-entrypoint.sh"]
CMD ["sh", "-c", "gunicorn officehours.asgi:application --bind=0.0.0.0:8001 -k uvicorn.workers.UvicornWorker"]

COPY --from=node-webpack /usr/src/app/package-lock.json package-lock.json
COPY --from=node-webpack /usr/src/app/webpack-stats.json webpack-stats.json
COPY --from=node-webpack /usr/src/app/assets assets
COPY --from=node-webpack /usr/src/app/node_modules node_modules

COPY . /usr/src/app
RUN chmod -R g+rw /usr/src/app

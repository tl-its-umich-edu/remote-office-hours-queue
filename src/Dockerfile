# build react components for production mode
FROM node:20-alpine AS node-webpack
WORKDIR /usr/src/app

# NOTE: package.json and webpack.config.js not likely to change between dev builds
COPY src/package.json src/package-lock.json src/webpack.config.js src/tsconfig.json /usr/src/app/
RUN npm install

# NOTE: assets/ likely to change between dev builds
COPY src/assets /usr/src/app/assets
RUN npm run prod

#####################################################################

FROM python:3.13-slim-bookworm

ENV PYTHONUNBUFFERED=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
EXPOSE 8000
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ENV WEB_CONCURRENCY=5

RUN apt-get update && \
    apt-get -y install gcc libpq-dev git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY src/requirements.txt /tmp
RUN pip install -r /tmp/requirements.txt --no-cache-dir

ENTRYPOINT ["/usr/src/app/docker-entrypoint.sh"]
CMD ["sh", "-c", "gunicorn officehours.asgi:application --bind=0.0.0.0:8001 -k uvicorn.workers.UvicornWorker"]

COPY --from=node-webpack /usr/src/app/package-lock.json package-lock.json
COPY --from=node-webpack /usr/src/app/webpack-stats.json webpack-stats.json
COPY --from=node-webpack /usr/src/app/assets assets
COPY --from=node-webpack /usr/src/app/node_modules node_modules

COPY src /usr/src/app
RUN chmod -R g+rw /usr/src/app

# Used to retrieve the git information in the build
COPY .git /usr/src/app/.git
RUN scripts/git_version_info.sh

# Remove .git folder
RUN rm -rf /usr/src/app/.git

# Clean up unused packages
RUN apt-get remove -y git && apt-get autoremove -y
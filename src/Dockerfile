# build react components for production mode
FROM node:12-alpine AS node-webpack
WORKDIR /usr/src/app

# NOTE: package.json and webpack.config.js not likely to change between dev builds
COPY package.json webpack.config.js /usr/src/app/
RUN npm install

# NOTE: assets/ likely to change between dev builds
COPY assets /usr/src/app/assets
RUN npm run prod 

# This is to find and remove symlinks that break some Docker builds.
# We need these later we'll just uncompress them 
# Put them in node_modules as this directory isn't masked by docker-compose
# Also remove src and the symlinks afterward
RUN apk --update add tar && \ 
    find node_modules -type l -print0 | tar -zcvf node_modules/all_symlinks.tgz --remove-files --null -T - && \
    rm -rf /usr/src/app/assets/src

#####################################################################

# build node libraries for production mode
FROM node:12-alpine AS node-prod-deps

COPY --from=node-webpack /usr/src/app /usr/src/app
RUN npm prune --production && \
    # This is needed to clean up the examples files as these cause collectstatic to fail (and take up extra space)
    find /usr/src/app/node_modules -type d -name "examples" -print0 | xargs -0 rm -rf

#####################################################################

FROM python:3.8-slim

ENV PYTHONUNBUFFERED=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
EXPOSE 8000
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ENV GUNICORN_WORKERS=2
ENV GUNICORN_THREADS=4

RUN pip install gunicorn psycopg2-binary
COPY requirements.txt /tmp
RUN pip install -r /tmp/requirements.txt

ENTRYPOINT ["/usr/src/app/docker-entrypoint.sh"]
CMD ["sh", "-c", "gunicorn --bind=0.0.0.0:8001 --workers=${GUNICORN_WORKERS} --threads=${GUNICORN_THREADS} --access-logfile=- --log-file=- officehours.wsgi"]

COPY --from=node-prod-deps /usr/src/app/package-lock.json package-lock.json
COPY --from=node-prod-deps /usr/src/app/webpack-stats.json webpack-stats.json
COPY --from=node-prod-deps /usr/src/app/assets assets
COPY --from=node-prod-deps /usr/src/app/node_modules node_modules

COPY . /usr/src/app
RUN chmod -R g+rw /usr/src/app

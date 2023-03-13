#!/bin/bash
set -e

# Login with `oc login ...` before running.
oc project officehours-dev
docker login -u `oc whoami` -p `oc whoami -t` docker-registry.webplatformsunpublished.umich.edu
docker build --platform linux/amd64 -t docker-registry.webplatformsunpublished.umich.edu/officehours-dev/officehours .
docker push docker-registry.webplatformsunpublished.umich.edu/officehours-dev/officehours

#!/bin/bash
set -e

# Login with `oc login ...` before running.
oc project officehours
docker login -u `oc whoami` -p `oc whoami -t` docker-registry.webplatformsunpublished.umich.edu
docker build -t docker-registry.webplatformsunpublished.umich.edu/officehours/officehours .
docker push docker-registry.webplatformsunpublished.umich.edu/officehours/officehours

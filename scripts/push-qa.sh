#!/bin/bash
set -e

# Login with `oc login ...` before running.
oc project officehours-qa
docker login -u `oc whoami` -p `oc whoami -t` docker-registry.webplatformsunpublished.umich.edu
docker build -t docker-registry.webplatformsunpublished.umich.edu/officehours-qa/officehours .
docker push docker-registry.webplatformsunpublished.umich.edu/officehours-qa/officehours

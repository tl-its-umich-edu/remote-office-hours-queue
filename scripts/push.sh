#!/bin/bash
set -e

docker login -u `oc whoami` -p `oc whoami -t` docker-registry.webplatformsunpublished.umich.edu
docker build -t docker-registry.webplatformsunpublished.umich.edu/officehours-dev/officehours .
docker push docker-registry.webplatformsunpublished.umich.edu/officehours-dev/officehours
oc patch deployment officehours-web-dev -p \
  "{\"spec\":{\"template\":{\"metadata\":{\"annotations\":{\"date\":\"`date +'%s'`\"}}}}}"

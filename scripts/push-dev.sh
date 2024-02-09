#!/bin/bash
set -e

# Login with `oc login ...` before running.
oc project officehours-dev
docker login -u `oc whoami` -p `oc whoami -t` registry.aws.web.umich.edu
docker build --platform linux/amd64 -t registry.aws.web.umich.edu/officehours-dev/officehours .
docker push registry.aws.web.umich.edu/officehours-dev/officehours

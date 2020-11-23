# Scripts

## Push Scripts

The push scripts in this directory will build an image locally and push it to OpenShift's registry.
They should only be used if remote builds in OpenShift are failing. 

Login with `oc login ...` before running them from the `src` directory. For example:
```
oc login ...
cd src
../scripts/push-dev.sh
```

# OpenShift configuration with Kustomize

Resource configuration and secret consumption for OpenShift projects are managed
using [`kustomize`](https://kubectl.docs.kubernetes.io/guides/introduction/kustomize/).

## Setup

1. Populate `service/secrets/*`.

    Sensitive values and files are located in the
    [Office Hours Secrets](https://www.dropbox.com/sh/n1igrgdsm4rt4uf/AAAXLbZOT7tpVk8XZEQj5E0ca?dl=0)
    Dropbox folder. Merge the `base` and `overlays` directories with their equivalents in the `service`
    directory in your local repository.

2. Install `kustomize`.

    You can install Kustomize using homebrew or using the command from the
    [website](https://kubectl.docs.kubernetes.io/installation/kustomize/binaries/),
    and adding version 5.1.0 (what is tested/supported for now) as an argument.
    ```
    curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh"  | bash -s 5.1.0
    ```

## Updating a project

1. Login and select the desired project using `oc`.
    ```
    oc login ...
    oc project officehours-dev
    ```

2. Fron the `service` directory, use `kustomize build` on an overlay directory 
and pipe the result to `oc apply`.
    ```
    kustomize build overlays/dev | oc apply -f - --validate
    ```

To make changes to a project's ingress (e.g. updating certificates),
you may need to first delete the ingress before running `kustomize build`.
```
oc delete ingress some-ingress-name
```

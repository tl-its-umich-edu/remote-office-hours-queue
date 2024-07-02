# OpenShift configuration with Kustomize

Resource configuration and secret consumption for OpenShift projects are managed
using [`kustomize`](https://kubectl.docs.kubernetes.io/guides/introduction/kustomize/).

## Important note

`officehours-qa` was renamed to `officehours-test` during the migration process to ROSA. Not everything has been renamed yet, including the domain names and some of the directory names here. Just know that these instances are currently identical. 

## Setup

1. Populate `service/base/secret/*` and `service/overlays/*/secret/*`.

    Sensitive values and files are located in the
    "[ROHQ - Remote Office Hours Queue](https://www.dropbox.com/scl/fo/lzw5ttjkofjqidrv3vncp/h?rlkey=76068m9ngi7o52kijtff7zj84&dl=0)"
    Dropbox folder. Merge the `base` and `overlays` directories with their equivalents in the `service`
    directory in your local repository.

    1. Download `base.zip`: https://www.dropbox.com/scl/fo/ibafd6hctx55ezcaa5dof/h?rlkey=qv53e05fu1z9w0h8vire7cqjk&dl=1
       
       This link downloads the contents of the Dropbox `base` folder as a ZIP file.
    1. Extract `base.zip`: `(cd service/base; unzip base.zip)`
    1. Download `overlays.zip`: https://www.dropbox.com/scl/fo/9q8mvuezmvmw7524veshx/h?rlkey=gds439f8vb2531gkih221giqh&dl=1

       This link downloads the contents of the Dropbox `overlays` folder as a ZIP file.
    1. Extract `overlays.zip`: `(cd service/overlays; unzip overlays.zip)`

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

## Split kustomize output into files

For debugging purposes, it may be helpful to get the output from `kustomize`
as individual files, one for each artifact.  This can be done by splitting the
output into files and then giving those files meaningful names.

If using `csplit` included with macOS, it may be necessary to adjust the
number of splits (7)…

```sh
kustomize build overlays/prod | csplit -s - /^---$/ '{7}'
```

Using `gcsplit`, installed via Homebrew `coreutils` package, an asterisk
indicates splitting as many times as necessary

```sh
kustomize build overlays/prod | gcsplit -s - /^---$/ '{*}'
```

Finally, rename the `xx` files created by `csplit` with meaningful names.  In
this case, name the files for the kind of artifact and its internal name.  Use
`yq` (may be installed via Homebrew) to query values from YAML files…

```sh
for i in xx*; do sed '/^---$/,1d' $i > $(yq '.kind + "-" + .metadata.name + ".yaml"' $i); done; rm xx*
```

## Updating secrets in Dropbox

When downloading `base.zip` and `overlays.zip` in the steps above, the links are to Dropbox folders with the names `base` and `overlays`.  The format of the URLs in the links specify that Dropbox should create a ZIP file of each directory's contents and download it to the local computer.

To update (change or add) values in the ZIP files, go to the appropriate folder in Dropbox and make the updates there. 

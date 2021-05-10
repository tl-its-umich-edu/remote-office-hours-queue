Populate `service/secret/*` from the [Office Hours Secrets](https://www.dropbox.com/sh/n1igrgdsm4rt4uf/AAAXLbZOT7tpVk8XZEQj5E0ca?dl=0) Dropbox folder.

To build & apply resources, use Kustomize:
```
kustomize build overlays/dev | oc apply -f - --validate
```

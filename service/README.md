Populate `service/secret/*` from the [Office Hours Secrets](https://umich.app.box.com/folder/106830639490) M|Box folder.

To build & apply resources, use Kustomize:
```
kustomize build overlays/dev | oc apply -f - --validate
```

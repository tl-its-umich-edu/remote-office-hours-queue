Populate `service/secret/*` from the NetBox ETL Secrets M|Box folder.

To build & apply resources, use Kustomize:
```
kustomize build . | oc apply -f - --validate
```

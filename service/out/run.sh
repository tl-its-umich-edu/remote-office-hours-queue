#!/bin/sh --

# gcsplit installed via `brew install coreutils`
(cd ..; kustomize build overlays/prod) | gcsplit -s - /^---$/ '{*}'
# optional: use csplit instead of gcsplit, but update the count (7) as needed
# (cd ..; kustomize build overlays/prod) | csplit -s - '/^---$/' '{7}'
for i in xx*; do
  sed '/^---$/,1d' $i > $(yq '.kind + "-" + .metadata.name + ".yaml"' $i)
done
rm xx*

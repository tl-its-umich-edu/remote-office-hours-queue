#!/bin/sh --

# gcsplit may be installed via `brew install coreutils`
splitter='gcsplit'
repeat='{*}'
# use `csplit` if default splitter is not available
if ! command -v ${splitter} > /dev/null; then
  splitter='csplit'
  repeat='{7}'
fi

(cd ..; kustomize build overlays/prod) | $splitter -s - /^---$/ $repeat

for i in xx*; do
  sed '/^---$/,1d' $i > $(yq '.kind + "-" + .metadata.name + ".yaml"' $i)
done
rm xx*

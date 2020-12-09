#!/bin/bash
set -eu

###
#
# Publishes all *.tgz files to npm
#
# Usage: ./publish [DIR]
#
# DIR: directory where npm tarballs are found (default is `dist/js`).
#
# NPM_TOKEN (required): registry authentication token (either from npmjs or a GitHub personal access token)
# NPM_REGISTRY (optional): the registry URL (defaults to "registry.npmjs.org")
#
###

dir="${1:-"dist/js"}"

if [ -z "${NPM_TOKEN:-}" ]; then
  echo "NPM_TOKEN is required"
  exit 1
fi

NPM_REGISTRY=${NPM_REGISTRY:-"registry.npmjs.org"}
echo "//${NPM_REGISTRY%%/}/:_authToken=${NPM_TOKEN}" > ~/.npmrc

# this overrides any registry configuration defined externally. For example, yarn sets the registry to the yarn proxy
# which requires `yarn login`. but since we are logging in through ~/.npmrc, we must make sure we publish directly to npm.
export NPM_CONFIG_REGISTRY="https://${NPM_REGISTRY}"

# dist-tags
tag=""
if [ -n "${NPM_DIST_TAG:-}" ]; then
  tag="--tag ${NPM_DIST_TAG}"
  echo "Publishing under the following dist-tag: ${NPM_DIST_TAG}"
fi

log=$(mktemp -d)/npmlog.txt

for file in ${dir}/**.tgz; do
  npm publish ${tag} ${file} 2>&1 | tee ${log}
  exit_code="${PIPESTATUS[0]}"

  if [ ${exit_code} -ne 0 ]; then

    # error returned from npmjs
    if cat ${log} | grep -q "You cannot publish over the previously published versions"; then
      echo "SKIPPING: already published"
      continue
    fi

    # error returned from github packages
    if cat ${log} | grep -q "Cannot publish over existing version"; then
      echo "SKIPPING: already published"
      continue
    fi

    echo "ERROR"
    exit 1
  fi
done

echo "SUCCESS"

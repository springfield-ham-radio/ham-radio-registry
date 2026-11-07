#!/bin/sh
set -eu

cd "$(dirname "$0")"

# Node.js 26 does not bundle Corepack.
npm install --global corepack@0.36.0
corepack enable
yarn install
yarn prepare


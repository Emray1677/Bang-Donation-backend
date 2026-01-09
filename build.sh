#!/usr/bin/env bash
set -o errexit
set -o nounset

echo "Enabling corepack..."
corepack enable

echo "Preparing yarn version..."
corepack prepare yarn@4.12.0 --activate

echo "Installing dependencies..."
yarn install --frozen-lockfile

echo "Building project..."
yarn build

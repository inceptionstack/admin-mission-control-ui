#!/bin/sh
# Setup git-secrets hooks for this repository
# Run once after cloning: ./scripts/setup-git-hooks.sh

set -e

if ! command -v git-secrets >/dev/null 2>&1; then
  echo "Installing git-secrets..."
  if command -v brew >/dev/null 2>&1; then
    brew install git-secrets
  else
    cd /tmp && git clone https://github.com/awslabs/git-secrets.git
    cd git-secrets && sudo make install
    cd /tmp && rm -rf git-secrets
  fi
fi

git secrets --install -f
git secrets --register-aws
echo "✅ git-secrets hooks installed"

#!/bin/sh
set -e

# Generate runtime config from environment variables
/docker/generate-config.sh

# Start nginx in foreground
exec nginx -g 'daemon off;'

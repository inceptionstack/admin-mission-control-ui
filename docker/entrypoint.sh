#!/bin/sh
set -e

# Generate runtime config from environment variables
/docker/generate-config.sh

# Substitute env vars in nginx config template
envsubst '${API_UPSTREAM}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Start nginx in foreground
exec nginx -g 'daemon off;'

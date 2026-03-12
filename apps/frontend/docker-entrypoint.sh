#!/bin/sh
set -e
# Substitute BACKEND_HOST (default: backend) into nginx config
BACKEND_HOST="${BACKEND_HOST:-backend}"
envsubst '${BACKEND_HOST}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'

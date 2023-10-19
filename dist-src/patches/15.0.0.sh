#!/bin/bash

echo "Applying patch: 15.0.0"

sed -i "s#VERSION=.*#VERSION=15.0.0" .env

echo "FILE_SERVICE_ENABLED=true" >> .env
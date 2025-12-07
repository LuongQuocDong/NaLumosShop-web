#!/bin/bash
# Build script for Railway deployment
export NODE_OPTIONS="--openssl-legacy-provider"
ng build --configuration production


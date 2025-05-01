#!/bin/bash

# Script to set environment variables for code signing
# Run this before packaging with: source scripts/sign-env.sh

echo "Enter your Apple ID email:"
read APPLE_ID
export APPLE_ID=$APPLE_ID

echo "Environment variables set for code signing."
echo "Apple ID: $APPLE_ID"
echo "Team ID: 2H4LMN3ZLG" 
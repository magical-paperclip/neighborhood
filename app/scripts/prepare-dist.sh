#!/bin/bash

# Script to prepare app for distribution without notarization
# This is useful when you just want to test the app locally

set -e  # Exit on any error

APP_PATH=${1:-"out/Neighborhood-darwin-arm64/Neighborhood.app"}

# Ensure the app exists
if [ ! -d "$APP_PATH" ]; then
  echo "❌ ERROR: App not found at $APP_PATH"
  echo "❌ Run 'npm run package-unsigned' first to create the app"
  exit 1
fi

echo "🔑 Finding available certificates..."
DEVELOPER_ID=$(security find-identity -v -p codesigning | grep "Developer ID Application" | head -1 | awk -F '"' '{print $2}')
DEV_CERT=$(security find-identity -v -p codesigning | grep "Apple Development" | head -1 | awk -F '"' '{print $2}')

# Choose the best available certificate
if [ -n "$DEVELOPER_ID" ]; then
  IDENTITY="$DEVELOPER_ID"
  echo "✅ Using Developer ID certificate: $IDENTITY"
elif [ -n "$DEV_CERT" ]; then
  IDENTITY="$DEV_CERT"
  echo "⚠️ Using Development certificate: $IDENTITY"
else
  IDENTITY="-"
  echo "⚠️ No certificates found. Using ad-hoc signing."
  echo "⚠️ You'll need to right-click and choose Open"
fi

# Use the minimal entitlements file to avoid keychain prompts
ENTITLEMENTS="entitlements-minimal.plist"

echo "📝 Removing extended attributes that might interfere with signing..."
# Use find to recursively clear extended attributes, avoiding the -r option
find "$APP_PATH" -type f -exec xattr -c {} \;
find "$APP_PATH" -type d -exec xattr -c {} \;

echo "🔒 Signing app..."
# Adding --no-strict to avoid keychain access prompts
codesign --force --options runtime --deep --no-strict --sign "$IDENTITY" --entitlements "$ENTITLEMENTS" "$APP_PATH"

echo "✅ Verifying signature..."
codesign --verify --verbose "$APP_PATH"

echo "✅ App is ready for testing"
echo "📝 To open the app, right-click and choose Open"
echo "📝 App location: $APP_PATH"

# Create a DMG for easier distribution
DMG_PATH="${APP_PATH%.*}.dmg"
echo "📦 Creating DMG for distribution: $DMG_PATH"
hdiutil create -volname "Neighborhood" -srcfolder "$(dirname "$APP_PATH")" -ov -format UDZO "$DMG_PATH"

echo "✅ DMG created at: $DMG_PATH"
echo "📝 You can distribute this DMG file" 
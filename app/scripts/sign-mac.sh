#!/bin/bash

# Enhanced macOS app signing script with debugging
# This script properly signs all frameworks and executables in the app bundle

set -e  # Exit on any error

APP_PATH=${1:-"out/Neighborhood-darwin-arm64/Neighborhood.app"}

# Ensure the app exists
if [ ! -d "$APP_PATH" ]; then
  echo "❌ ERROR: App not found at $APP_PATH"
  exit 1
fi

# Display available signing certificates
echo "🔍 Available signing certificates:"
security find-identity -v -p codesigning | grep -E 'Developer ID Application|Apple Development'

# Try to find a Developer ID certificate (preferred for distribution)
DEVELOPER_ID=$(security find-identity -v -p codesigning | grep "Developer ID Application" | head -1 | awk -F '"' '{print $2}')

# If no Developer ID, try to find a Development certificate
if [ -z "$DEVELOPER_ID" ]; then
  DEV_CERT=$(security find-identity -v -p codesigning | grep "Apple Development" | head -1 | awk -F '"' '{print $2}')
  
  if [ -z "$DEV_CERT" ]; then
    echo "⚠️ WARNING: No valid certificates found. Using ad-hoc signing."
    echo "⚠️ The app will NOT be trusted by macOS unless you right-click and open manually."
    IDENTITY="-"
  else
    echo "⚠️ WARNING: Using Apple Development certificate. App will work only on your Mac or provisioned devices."
    echo "⚠️ The app will NOT be trusted on other Macs without right-click and open."
    IDENTITY="$DEV_CERT"
  fi
else
  echo "✅ Using Developer ID certificate. This is optimal for distribution."
  IDENTITY="$DEVELOPER_ID"
fi

ENTITLEMENTS="entitlements.plist"
echo "📋 Using entitlements from: $ENTITLEMENTS"

if [ ! -f "$ENTITLEMENTS" ]; then
  echo "❌ ERROR: Entitlements file not found at $ENTITLEMENTS"
  exit 1
fi

echo "🔑 Using certificate: $IDENTITY"
echo "📦 Signing app at: $APP_PATH"

# First, remove any existing signatures
echo "🧹 Removing existing signatures..."
codesign --remove-signature "$APP_PATH" || echo "⚠️ No existing signature found or couldn't remove"

# Sign all the frameworks and libraries
echo "🔒 Signing frameworks and libraries..."
find "$APP_PATH/Contents/Frameworks" -type f -name "*.dylib" | while read -r file; do
  echo "📝 Signing $file"
  codesign --force --options runtime --timestamp --sign "$IDENTITY" "$file" || echo "⚠️ Failed to sign $file"
done

find "$APP_PATH/Contents/Frameworks" -name "*.framework" | while read -r framework; do
  echo "📝 Signing $framework"
  codesign --force --options runtime --timestamp --sign "$IDENTITY" --entitlements "$ENTITLEMENTS" "$framework" || echo "⚠️ Failed to sign $framework"
done

# Sign helper apps
if [ -d "$APP_PATH/Contents/Helpers" ]; then
  echo "🔒 Signing helper apps..."
  find "$APP_PATH/Contents/Helpers" -type f -perm +111 | while read -r helper; do
    echo "📝 Signing $helper"
    codesign --force --options runtime --timestamp --sign "$IDENTITY" --entitlements "$ENTITLEMENTS" "$helper" || echo "⚠️ Failed to sign $helper"
  done
fi

# Sign executables in MacOS folder
echo "🔒 Signing executables in MacOS folder..."
find "$APP_PATH/Contents/MacOS" -type f -perm +111 | while read -r exe; do
  echo "📝 Signing $exe"
  codesign --force --options runtime --timestamp --sign "$IDENTITY" --entitlements "$ENTITLEMENTS" "$exe" || echo "⚠️ Failed to sign $exe"
done

# Finally sign the main app
echo "🔒 Signing main app executable..."
codesign --force --options runtime --timestamp --deep --sign "$IDENTITY" --entitlements "$ENTITLEMENTS" "$APP_PATH" || {
  echo "❌ ERROR: Failed to sign main app"
  exit 1
}

echo "✅ Verifying signature..."
codesign --verify --verbose=4 "$APP_PATH"

echo "📊 Signature details:"
codesign -dvv "$APP_PATH"

# Check if the app is ad-hoc signed or has a valid certificate
if [ "$IDENTITY" == "-" ]; then
  echo "⚠️ App is ad-hoc signed and won't be trusted by macOS Gatekeeper."
  echo "⚠️ Users will need to right-click and choose Open to bypass Gatekeeper."
elif [[ "$IDENTITY" == *"Apple Development"* ]]; then
  echo "ℹ️ App is signed with a development certificate."
  echo "ℹ️ It will only be trusted on your Mac or provisioned devices."
  echo "ℹ️ For distribution, you should use a Developer ID certificate."
elif [[ "$IDENTITY" == *"Developer ID"* ]]; then
  echo "✅ App is signed with a Developer ID certificate."
  echo "ℹ️ For complete trust, the app should also be notarized with Apple."
  echo "ℹ️ Run: xcrun notarytool submit \"$APP_PATH\" --apple-id YOUR_APPLE_ID --password YOUR_APP_SPECIFIC_PASSWORD --team-id P6PV2R9443"
fi

echo "✅ App signing complete" 
#!/bin/bash

# Directory to save screenshots
SCREENSHOT_DIR=".gemini/screenshots"
FILENAME="screenshot.png"
FILEPATH="$SCREENSHOT_DIR/$FILENAME"

# Ensure the directory exists
mkdir -p "$SCREENSHOT_DIR"

echo "Bringing Google Chrome to the front and switching to tab 2..."

# Use AppleScript to control Google Chrome
osascript <<EOD
tell application "Google Chrome"
    activate
    tell front window
        set active tab to tab 2
    end tell
end tell
EOD

# Wait for the tab to potentially render
sleep 1

echo "Taking screenshot..."

# Capture the main screen
screencapture -T 0 "$FILEPATH"

if [ -f "$FILEPATH" ]; then
    echo "Screenshot saved to $FILEPATH"
else
    echo "Error: Screenshot failed."
fi

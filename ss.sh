#!/bin/bash

# Directory to save screenshots
SCREENSHOT_DIR=".gemini/screenshots"
FILENAME="screenshot.png"
FILEPATH="$SCREENSHOT_DIR/$FILENAME"

# Ensure the directory exists
mkdir -p "$SCREENSHOT_DIR"

echo "Bringing Google Chrome to the front and switching to the app tab..."

# Use AppleScript to control Google Chrome
osascript <<EOD
tell application "Google Chrome"
    activate
    set appTabFound to false

    repeat with theWindow in every window
        set tabIndex to 0
        repeat with theTab in every tab of theWindow
            set tabIndex to tabIndex + 1
            if (URL of theTab starts with "http://localhost:5174") or (URL of theTab starts with "https://localhost:5174") then
                set active tab index of theWindow to tabIndex
                set index of theWindow to 1
                set appTabFound to true
                exit repeat
            end if
        end repeat

        if appTabFound then
            exit repeat
        end if
    end repeat

    if not appTabFound then
        error "Could not find a Chrome tab with the local app open."
    end if
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

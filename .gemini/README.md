#Gemini Agent Project Context

This document provides the necessary context for the Gemini agent to work effectively on this repository.

## The Plan

The purpose of this file is to store essential project information so that the Gemini agent can quickly get up to speed in future sessions. Instead of the user providing context repeatedly, the user can simply ask the agent to read this file.

## Gemini Agent Workflow

When a UI requirement is given, the agent will:
1. Take a screenshot using the `ss.sh` script.
2. Always Explicitly read and analyze the screenshot located at `.gemini/screenshots/screenshot.png`.
3. If an error message is present in the screenshot, explicitly output it.
4. Formulate a plan to implement the given UI requirement based on the analysis.
4. When using the `replace` or `write_file` tools, explicitly read and verify the tool's output to confirm that changes were successfully made to the file. If no changes are detected when expected, re-evaluate the `old_string` or `new_string` parameters.
5. When attempts are running low, explicitly read and understand error messages from screenshots to diagnose issues effectively.
6. Limit attempts to fix/implement a specific issue to 5. On each attempt, at least one line of code must be changed. After 5 attempts, the agent will give up and wait for user intervention to prevent rate limit issues.

### UI Screenshots

The `ss.sh` script in the root directory can be used to take screenshots of the UI from Chrome.

## Project Overview

This is a monorepo for a German learning application, managed with pnpm workspaces.

- **`/` (root):** The root contains the pnpm workspace configuration (`pnpm-workspace.yaml`).
- **`/client`:** A React application built with Vite. This is the primary frontend for the project.

## Client (`/client`) Details

- **Framework:** React with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **UI Components:** Framer Motion is used for animations.
- **Package Manager:** pnpm

### Key Files

- `client/src/App.tsx`: Main application component.
- `client/src/main.tsx`: Application entry point.
- `client/vite.config.ts`: Vite configuration.
- `client/tailwind.config.js` (assumed): Tailwind CSS configuration.
- `client/package.json`: Frontend dependencies and scripts.

### Common Commands

All commands should be run from the `/client` directory.

- DO NOT RUN THE dev command, if you do not think the vite server is running at the port 5173, then ask the user to do so for you.
- **`npm run build`**: Builds the application for production.
- **`npm run lint`**: Lints the codebase.

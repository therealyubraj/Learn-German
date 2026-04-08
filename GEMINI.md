#Gemini Agent Project Context

This document provides the necessary context for the Gemini agent to work effectively on this repository.

## The Plan

The purpose of this file is to store essential project information so that the Gemini agent can quickly get up to speed in future sessions. Instead of the user providing context repeatedly, the user can simply ask the agent to read this file.

## Gemini Agent Workflow

**At the beginning of each session, always provide a summary of this entire GEMINI.md file to assure the user that the workflow and general guidelines are understood.**

**Always ask the user for the next step. Do not perform any actions without explicit user approval.**

When a UI requirement is given, the agent will mostly be writing the frontend code with skeletons for you to fill out to handle the logic behind the UI. Your job is to create good skeletons of code which are easily readable. **Do not leave comments most of the time, unless they are absolutely necessary to explain uncommon usage of syntax.** The agent will also: **never think for too long or try many things at once. Instead, try small, verifiable changes that can be easily tested.**
**Do not change or write code without explicit user instruction.**
4. Formulate a plan to implement the given UI requirement based on the analysis.
5. When using the `replace` or `write_file` tools, explicitly read and verify the tool's output to confirm that changes were successfully made to the file. If no changes are detected when expected, re-evaluate the `old_string` or `new_string` parameters.
6. When attempts are running low, explicitly read and understand error messages from error messages to diagnose issues effectively.
7. Limit attempts to fix/implement a specific issue to 5. On each attempt, at least one line of code must be changed. After 5 attempts, the agent will give up and wait for user intervention to prevent rate limit issues.

## Project Overview

This is a monorepo for a German learning application, managed with pnpm workspaces.

- **`/` (root):** The root contains the pnpm workspace configuration (`pnpm-workspace.yaml`).
- **`/client`:** A React application built with Vite. This is the primary frontend for the project.

## New Project Version Plan

The user intends to create a new, updated version of this German learning application. The existing codebase (excluding core configurations like Vite, Tailwind CSS, etc.) will be discarded, and development will proceed from a clean slate.

### Overall Goal

To improve the application's overall design, functionality, and user experience by rebuilding and refactoring.

### Key Features to Implement

1.  **Word List Management Feature**:
    *   **Goal:** Allow users to create and manage their own custom word lists, moving away from hardcoded data. Initially, users will only be able to create new lists by providing JSON input, without immediate functionality for editing or deleting existing lists.
    *   **User Interface:** A dedicated screen will be developed for word list management, enabling users to create, view, edit, delete, and combine their word lists. The initial focus is on the creation aspect via JSON input.
    *   **Storage:** User-created word lists will be stored using the Origin Private File System (OPFS). Each word list will be stored as a single JSON file containing all its data (id, name, words, checksum).
    *   **Quiz Integration:** Users will be able to select and combine their saved word lists for learning new words.
    *   **Statistics:** The checksum of the combined and sorted word list will be used as a unique identifier for storing and tracking learning statistics.

2.  **User Settings**:
    *   **VIM Mode Toggle:** A setting to enable/disable VIM mode for text input fields.
    *   **TTS Voice Selection:** A setting to allow users to choose their preferred Text-to-Speech voice.

### High-Level Implementation Strategy

Development will proceed incrementally, focusing on foundational setup, then core data structures, storage, and utilities, followed by UI implementation for word list management and settings, and finally integrating these features into the quiz flow. Comprehensive testing will be performed at each stage.

#### Word List Management - User Input Details

This section outlines the detailed plan for implementing the user input and storage of word lists.

**Feature Scope:**
*   Allow users to input a new word list via JSON.
*   No functionality for editing or deleting individual word lists in the initial phase.

**Data Structure (`client/src/types.ts`):**
*   **Note:** Use `type` aliases instead of `interfaces` as a general guideline.
*   **`Word` type:**
    ```typescript
    export type Word = {
      LHS: string;
      RHS: string;
    }
    ```
*   **`WordList` type:**
    ```typescript
    export type WordList = {
      id: string; // Unique identifier for the list (e.g., UUID)
      name: string;
      words: Word[];
      checksum: string; // Checksum of the sorted word list for statistics
    }
    ```

**Checksum Generation:**
*   A single checksum will be computed for the *entire* `WordList`.
*   **Process:**
    1.  Sort the `words` array based on `LHS` then `RHS` alphabetically.
    2.  Concatenate all `LHS` and `RHS` values (e.g., `LHS1|RHS1|LHS2|RHS2...`).
    3.  Hash the resulting string (e.g., using SHA-256) to generate the `checksum`.
*   **Note:** No individual checksums will be computed for each `Word` object at this time.

**OPFS Storage Strategy:**
*   Each `WordList` will be stored as a single JSON file in the Origin Private File System (OPFS).
*   **File Path:** `wordlists/<wordlist_id>.json`
*   This file will contain the complete `WordList` object (including `id`, `name`, `words`, and `checksum`).

**`WordListEditor.tsx` (Initial UI/Logic):**
*   **Inputs:**
    *   A `textarea` for users to paste a JSON array of `Array<{ LHS: string; RHS: string }>`.
    *   A text input for the `name` of the word list.
*   **"Save" Action Logic:**
    1.  **Validation:**
        *   Ensure the `name` field is not empty.
        *   Attempt to parse the `textarea` content as JSON. If parsing fails, display an error.
        *   Validate the parsed JSON: it must be an array, and each object within the array must contain `LHS` and `RHS` string properties. If validation fails, display an error.
    2.  **Data Generation:**
        *   Generate a unique `id` for the word list (e.g., using `crypto.randomUUID()`).
        *   Calculate the `checksum` for the word list as described above.
        *   Construct the complete `WordList` object.
    3.  **Storage:**
        *   Convert the `WordList` object to a JSON string.
        *   Save this JSON string to OPFS at `wordlists/<wordlist_id>.json`.

**Initial Implementation Steps (for agent):**
1.  Update `client/src/types.ts` with the new `Word` and `WordList` interfaces. (Completed)
2.  Create a skeleton `client/src/components/WordListEditor.tsx` with the specified input fields and a "Save" button. (Completed)
3.  Implement basic routing in `client/src/App.tsx` to access the `WordListEditor`. (Completed)
4.  Set up the necessary OPFS utility functions for saving files (to be elaborated). (Completed)
5.  Implement the checksum calculation logic. (Completed)
6.  Begin implementing the TTS Voice Selection and Behavior Details.

#### Vim-like Input Behavior Details

This section outlines the detailed plan for implementing a modal, Vim-like input system.

**Core Concept:**
*   The application will have two primary modes: `Insert Mode` for normal text input and `Normal Mode` for single-keystroke commands.
*   This will be managed by a global `VimModeContext` React context that provides the current mode and a function to change it. The context provider will wrap the entire application in `App.tsx`.

**Implementation Logic:**
1.  **Global Key Listener:**
    *   A `useEffect` hook in the `VimModeContext` provider will attach a `keydown` event listener to the `document`.
2.  **Mode Switching:**
    *   **`Insert` -> `Normal`:** Pressing `Escape` will switch the mode to `normal` and blur the active input field.
    *   **`Normal` -> `Insert`:** Pressing `i` will switch the mode to `insert` and can optionally focus the primary input on the page.
3.  **Normal Mode Commands:**
    *   Actionable elements (like buttons) will be marked with a `data-vim-key` attribute (e.g., `<button data-vim-key="z">Give Up</button>`).
    *   When a key is pressed in `Normal Mode`, the global listener will find the corresponding element and programmatically trigger a `.click()` event on it.

**Handling Multiple Key Presses (Debouncing):**
*   To prevent duplicate actions from rapid key presses (e.g., giving up twice on the same word), a state management flag (`isActionInProgress`) will be used within the `VimModeContext`.
*   **Flow:**
    1.  When a command key is pressed in Normal Mode, the listener checks if `isActionInProgress` is `true`. If so, the event is ignored.
    2.  If `false`, the listener immediately sets `isActionInProgress` to `true` and triggers the action (e.g., button click).
    3.  The component logic responsible for handling the action (e.g., `handleGiveUp`) will execute.
    4.  After the action is complete and the application state has transitioned (e.g., the next word is displayed), the component logic **must** call a function to reset `isActionInProgress` back to `false`. This "unlocks" the system for the next command.

**Settings & Persistence:**
*   A `Settings.tsx` component will contain a toggle switch to enable or disable the Vim-like input behavior.
*   The user's preference will be saved to a persistent storage location (e.g., OPFS or Local Storage) to be remembered across sessions.

**User Feedback:**
*   A simple, unobtrusive visual indicator will be displayed on the screen (e.g., in a corner) to show the current mode (`-- NORMAL --` or `-- INSERT --`).

#### Quiz Flow and TTS Integration Details

This section outlines the user-controlled flow of the quiz and its integration with TTS.

**Core Principle:**
*   The user is in full control of advancing to the next question. The application will not automatically move forward after an answer is submitted or revealed.

**Quiz Cycle:**
1.  **Initial State:** A new word is presented. The application is waiting for user input. The `isActionInProgress` flag (from the Vim-like input context) is `false`.
2.  **User Action (Submit/Give Up):**
    *   The user either submits an answer or chooses to "give up".
    *   The `isActionInProgress` flag is immediately set to `true`, locking the state for the current word and preventing any further actions (e.g., duplicate submissions).
    *   The correct answer is displayed visually.
    *   The TTS engine is triggered to speak the correct answer aloud.
3.  **User Learning Phase:**
    *   The application now waits indefinitely. The user can review the answer and listen to the pronunciation as needed. All inputs except "Next Question" are disabled due to the `isActionInProgress` flag.
4.  **Advancing to Next Question:**
    *   When the user is ready, they explicitly trigger the "Next Question" action.
    *   The application transitions to the next word.
    *   As part of this transition, the `isActionInProgress` flag is reset to `false`, unlocking the state for the new word.

This ensures a deliberate, user-paced learning experience and leverages the debouncing mechanism to maintain a clean application state.

This ensures a deliberate, user-paced learning experience and leverages the debouncing mechanism to maintain a clean application state.

#### TTS Voice Selection and Behavior Details

This section outlines the detailed plan for implementing user-configurable Text-to-Speech (TTS) settings.

**TTS Engine:**
*   The primary TTS engine will be the browser's built-in Web Speech API (`SpeechSynthesis`).

**Data Structure for Settings (`client/src/types.ts`):**
```typescript
export interface TTSSettings {
  voiceName: string | null; // The `name` property of the chosen SpeechSynthesisVoice
  rate: number;             // Speech speed (0.1 to 10, default 1)
  pitch: number;            // Speech pitch (0 to 2, default 1)
  volume: number;           // Speech volume (0 to 0.1, default 1)
}
```

**TTS Service Module (`client/src/tts/service.ts`):**
*   Will encapsulate all `SpeechSynthesis` API interactions.
*   **Functions:**
    *   `getVoices(): SpeechSynthesisVoice[]`: Retrieves and filters available German voices (e.g., `voice.lang === 'de-DE'`). Handles `speechSynthesis.onvoiceschanged`.
    *   `speak(text: string, settings: TTSSettings, voices: SpeechSynthesisVoice[])`: Speaks the given text using the provided settings and available voices. Selects the voice by `settings.voiceName` or defaults to the first German voice.

**Global State (`TTSContext`):**
*   A React Context (`TTSContext`) will manage:
    *   The list of available German voices (`SpeechSynthesisVoice[]`).
    *   The currently active `TTSSettings` object.
    *   A function to update the `TTSSettings`.
*   The context will load available voices on initialization.

**`Settings.tsx` - User Interface:**
*   A dedicated "Voice Settings" section will include:
    *   **Voice Selection:** A dropdown (`<select>`) populated with `voice.name` from available German voices.
    *   **Rate Slider:** `<input type="range">` for speech speed. (Min: 0.5, Max: 2, Step: 0.1, Default: 1).
    *   **Pitch Slider:** `<input type="range">` for speech pitch. (Min: 0.5, Max: 2, Step: 0.1, Default: 1).
    *   **Volume Slider:** `<input type="range">` for speech volume. (Min: 0, Max: 1, Step: 0.1, Default: 1).
    *   **Preview Button:** A "Preview" button that speaks a sample German phrase using the current slider and dropdown settings.

**Persistence (Local Storage):**
*   **Storage Key:** `german-app-tts-settings`.
*   **Saving:** Changes to any TTS setting in `Settings.tsx` will trigger an update in `TTSContext`, which will then serialize the `TTSSettings` object to Local Storage.
*   **Loading:** On `TTSContext` initialization, it will attempt to load `TTSSettings` from Local Storage. If not found or invalid, it will use default values (`{ voiceName: null, rate: 1, pitch: 1, volume: 1 }`).

**Integration with `Quiz.tsx`:**
*   The `Quiz.tsx` component will consume the `TTSContext`.
*   When an answer needs to be spoken, it will call `ttsService.speak()` with the answer text and the `TTSSettings` from the context.

## Development Status

The foundational work for the application is largely complete. This includes:
- **OPFS Integration**: A robust service for file system operations is in place.
- **Settings Management**: User settings for TTS and VIM mode are implemented with persistence in OPFS.
- **Word List Management**: Users can import and manage word lists, which are saved via OPFS.
- **VIM Mode**: A global, decoupled VIM mode for keyboard navigation is now fully implemented and synchronized with the UI.
- **Basic Quiz UI**: The main components for the quiz interface (`QuizView`, `QuizControls`) are built and functional, though the word selection logic is currently random.

### Recent UI and Flow Updates

- **Default Starter List Seeded on First Load**: A built-in starter word list now gets written into OPFS automatically when no user word lists exist yet. This preserves the existing file-based word list flow while reducing first-use friction.
- **Starter List Direction Updated**: The default seeded list currently uses simple English-to-German verb pairs intended to make the first quiz session approachable.
- **Landing Page Reworked**: The home page has been rewritten into a more portfolio-friendly entry screen with a terminal-inspired dark theme, clearer CTA hierarchy, and copy that mentions VIM support.
- **Shared Interaction Styles Updated**: Old Vite default hover/focus styles were removed from the global CSS and replaced with interaction states that better match the current terminal palette.
- **Screenshot Workflow Improved**: The local screenshot helper script (`ss.sh`) now finds the app tab by URL instead of assuming a fixed Chrome tab index, making UI inspection more reliable during design work.
- **Screenshot Review Assumption**: When reviewing UI screenshots for CSS fixes, always assume the browser is at 100% zoom. Do not blame zoom level as the cause of spacing, sizing, or layout issues.
- **Quiz Selection Screen In Progress**: The quiz selection page has been partially redesigned to be more understandable for new users, but layout polish is still ongoing. The current direction is a more vertical flow with clearer separation between selected lists, adding more lists, and starting the quiz.

## Next Steps

With the core infrastructure and UI behavior in place, the project's primary focus shifts to the learning logic itself:

1.  **Implement Spaced Repetition Algorithm**: The current quiz engine selects words randomly. This will be replaced with the spaced repetition algorithm detailed below to create an intelligent learning queue that prioritizes words the user struggles with and schedules reviews for mastered words at increasing intervals.

2.  **Integrate VIM Mode in Quiz Controls (Completed)**: The VIM mode context and functionality now exist and are fully integrated, handling focus and state changes globally without coupling with UI components.

3.  **Finish Quiz Selection UI Polish**: The selection screen still needs final spacing, hierarchy, and action-placement refinement so that the first-run word-list selection flow feels clear and intentional.

4.  **Revisit Home-to-Quiz Flow After Selection Screen Polish**: Once the selection screen is stable, the full home-to-quiz path should be tested again to confirm the onboarding flow is suitable for showcasing on a CV.

For a detailed explanation of the spaced repetition algorithm, including data structures, review intervals, and step-by-step logic for managing the active pool and updating word statistics, please refer to [algorith.txt](algorith.txt).

**Persistence:**
*   After every word stat update, the entire `WordStatsMap` will be saved back to its corresponding OPFS JSON file (`stats/<wordlist_checksum>.json`) to ensure data is never lost.

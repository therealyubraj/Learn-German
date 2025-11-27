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

Most UI/UX features, including Word List Management (creation via JSON), User Settings (VIM Mode, TTS Voice Selection with dirty check), and basic Quiz Flow with TTS integration, have been largely completed.

Next immediate focus is on implementing the 'Next Question Selection Algorithm' (spaced repetition).

#### Next Question Selection Algorithm Details

This section outlines the detailed plan for the spaced repetition algorithm used to select words for the quiz, ensuring a balanced approach to learning new vocabulary and reviewing mastered terms.

**Core Concepts:**
*   **Word Stats:** Each word in a word list will have its individual learning statistics tracked.
*   **Mastery Levels (Buckets):** Words are assigned a `level` (e.g., 1 to 8), indicating the user's mastery. New words start at Level 1, and higher levels indicate better retention.
*   **Active Pool:** The quiz will present words drawn from a small, manageable `active pool` of words, intelligently constructed to focus user effort.
*   **Review Intervals:** Words will be scheduled for review based on their `level`, with progressively longer intervals for higher mastery levels.

**Data Structure for Word Statistics (`client/src/types.ts`):**
```typescript
export interface WordStats {
  level: number;       // Mastery level, e.g., 1-8
  lastReviewedAt: number; // Timestamp of the last review (milliseconds since epoch)
  nextReviewAt: number;   // Timestamp for the next scheduled review (milliseconds since epoch)
  createdAt: number;     // Timestamp when the word was first introduced (milliseconds since epoch)
}

export type WordStatsMap = {
  [wordIdentifier: string]: WordStats; // `wordIdentifier` is LHS + '|' + RHS
};
```
*   The `WordStatsMap` will be stored as a single JSON file in OPFS: `stats/<wordlist_checksum>.json`.

**Review Intervals:**
*   The `level` dictates the time until the next review. These intervals are configurable:
    | Level | Next Review Interval |
    | :---- | :------------------- |
    | 1     | 4 Hours              |
    | 2     | 8 Hours              |
    | 3     | 1 Day                |
    | 4     | 3 Days               |
    | 5     | 1 Week               |
    | 6     | 2 Weeks              |
    | 7     | 1 Month              |
    | 8     | 4 Months             |

**Algorithm Steps:**

**A. Building/Maintaining the Active Pool (Target Size: e.g., 20 words):**
*   This process runs whenever the active pool needs words.
1.  **Find "Due" Words:** Identify all words in the `WordStatsMap` where `nextReviewAt <= Date.now()`.
2.  **Prioritize:** Sort these "due" words, prioritizing those with the **lowest `level`** first. This ensures struggling words are addressed.
3.  **Fill the Pool:** Add the highest-priority "due" words to the active pool until it reaches its target size.

**B. Selecting the Next Question *from* the Pool:**
*   A word will be chosen **randomly** from the current active pool to present to the user. This keeps the quiz unpredictable and engaging.

**C. Updating Word Stats After Each Answer:**

*   **If the answer is CORRECT:**
    1.  Increment `word.level` by 1 (up to a maximum of 8).
    2.  Set `word.lastReviewedAt = Date.now()`.
    3.  Calculate `word.nextReviewAt = Date.now() + intervalForLevel(word.level)`.
    4.  The word is **removed from the active pool** as it is no longer immediately "due".

*   **If the answer is INCORRECT:**
    1.  **Penalty:** Decrease `word.level` by 2 (with a minimum level of 1). This reschedules the word for earlier review.
    2.  Set `word.lastReviewedAt = Date.now()`.
    3.  Calculate `word.nextReviewAt = Date.now() + intervalForLevel(word.level)` (based on the new, lower level).
    4.  The word **remains in the active pool** since it requires further attention.

**D. How New Words are Introduced:**
*   When a word is encountered for the first time (no existing `WordStats` entry):
    *   A new `WordStats` entry is created with:
        *   `level: 1`
        *   `lastReviewedAt: Date.now()`
        *   `nextReviewAt: Date.now()` (making it immediately eligible for the pool)
        *   `createdAt: Date.now()`
*   This new word will then be eligible to fill slots in the active pool.

**Persistence:**
*   After every word stat update, the entire `WordStatsMap` will be saved back to its corresponding OPFS JSON file (`stats/<wordlist_checksum>.json`) to ensure data is never lost.
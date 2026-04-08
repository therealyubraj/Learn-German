# Learn-German

Trying to build a Deutsch learning quiz app using Gemini agent.

## Current Focus

The current work is on the quiz setup / word set selection UI in
[`client/src/components/QuizSelectionScreen.tsx`](client/src/components/QuizSelectionScreen.tsx).

The intended direction is:

- keep the existing terminal-like dark theme used by the home page
- use a centered single-column layout
- use a searchable multi-select dropdown with tick marks
- keep selection behavior simple: clicking an item selects or deselects it in place, with no sorting or pinning
- show selected sets as chips below the dropdown
- keep `Start Quiz` as the primary action and `Import a new word set` as the secondary action

## Current Problem

The remaining issue is CSS layout polish, especially visible spacing and alignment:

- the vertical spacing between the title block and the main card still needs work
- the overall page centering and spacing rhythm still need visual tuning
- screenshot-driven CSS tweaks should be based on what is actually visible in the rendered UI

## Screenshot Review Rule

When reviewing UI screenshots for CSS fixes, always assume the browser is at 100% zoom.
Do not blame zoom level for spacing, sizing, or layout issues.

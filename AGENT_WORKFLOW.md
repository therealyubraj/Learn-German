# Agent Workflow Notes

Use this file to preserve the collaboration style that worked well during UI refinement.

## Core Behavior

- Make small, direct changes instead of broad rewrites.
- When the user points at a visual issue, first identify the exact visible box being judged.
- If spacing is unclear, temporarily make the relevant box visible with a border and test padding on that same box.
- Prefer changing the actual owner of the spacing instead of adding compensating wrappers.
- Do not use nested layout wrappers as a first response to margin or padding issues.
- Preserve user edits. If the user manually fixes something, inspect the current file before changing nearby code.

## Screenshot Review

- Always describe what is actually visible in the screenshot before proposing or making another UI fix.
- Do not infer open-state UI problems from a closed-state screenshot.
- Do not blame browser zoom. Assume screenshots are at 100% zoom unless the user explicitly says otherwise.
- If a screenshot contradicts the expected code behavior, verify the visible box and current DOM/state instead of repeating the same kind of CSS tweak.
- When something is still wrong, say that clearly and identify the specific visible issue.

## CSS/Layout Rules

- For card inset problems, change the card padding directly.
- For page positioning problems, change the page wrapper.
- For width problems, only then consider max-width or an inner content lane.
- Use explicit values like `px-[36px]`, `py-[40px]`, or `text-[4rem]` when utility scale values are too subtle or ambiguous.
- Remember that Tailwind spacing tokens are scaled. For example, `mb-10` is usually `40px`, not `100px`.
- Avoid questionable Tailwind tokens such as `pt-18` unless confirmed to exist in the generated CSS.
- If a global CSS rule affects a component, add a local override class instead of fighting the issue indirectly.

## Interaction Style

- Be direct about mistakes and correct course quickly.
- Do not over-explain while actively fixing; keep updates short and concrete.
- When a user says a fix did not work, re-check the screenshot or file state before making another assumption.
- If the user asks a conceptual question, answer the question plainly before continuing implementation.
- If the user’s simpler approach is probably correct, acknowledge that and simplify the implementation.

## Verification

- Run screenshots for UI changes when the user asks or when visual correctness matters.
- Run `pnpm run build` after TypeScript/React changes when practical.
- Report exactly what was verified and what was not.

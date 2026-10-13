# Browser Testing & Interaction Policy

- **Do NOT open the browser** or invoke browser subagents/browser tools automatically.
- **Do NOT run automated browser UI tests or make changes via the browser** unless explicitly requested by the user.
- Verify changes using build checks, linters, or code inspections in terminal, and leave visual/manual browser inspection to the user unless they ask for browser QA.

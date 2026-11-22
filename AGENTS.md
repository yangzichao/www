# AGENTS.md

## Hard rule: no code comments

Code in this repo has no comments. This applies to every file you write or edit: `.ts`, `.mjs`, `.astro`, `.css`, `.yml`, config files. Article markdown under `src/content/` is prose, not code, and is exempt.

Make the code explain itself instead: descriptive names, small extracted functions, types, and constants. If a piece of code needs a comment to be understood, rename, extract, or restructure it until it doesn't.

Only these comments are allowed:

- Legal or license headers.
- Non-obvious behavior forced by an external dependency, platform, vendor, or protocol we cannot change. Surprises in our own code are not an excuse; reshape the code.
- `// prettier-ignore`, and lint suppressions whose rule is faulty, pedantic, or style-only. Never suppress a rule that protects correctness or safety; fix the code.
- Doc comments that define a public API contract.
- Issue or RFC links that explain a constraint the code cannot express.

Not allowed: narration of what the code does, section banners, commented-out code, TODOs, history notes ("moved to X", "used to be Y"), and justifications for workarounds. Delete them when you touch a file.

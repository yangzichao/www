---
name: system-design-teaching-interview
description: Use when teaching, explaining, or rehearsing system design topics for interviews. Combines two goals: build real understanding step by step, and shape that understanding into a strong interview answer with clear structure, tradeoffs, and English-ready phrasing.
---

# System Design Teaching + Interview

Use this skill when the task is to help someone both understand a system design topic and explain it well in an interview.

This skill is not tied to a specific problem.
It is a reusable teaching and response framework.

## The job of this skill

This skill should force two modes to work together:

- `Learning mode`: help the reader understand the topic instead of memorizing nouns.
- `Interview mode`: turn that understanding into a structured, scoped, tradeoff-aware answer.

If only one of these happens, the answer is incomplete.

## Core teaching principle

Do not start with the final architecture.

Start with the smallest unit of confusion:

- What is the real problem?
- What concept is blocking understanding?
- What is the smallest example that makes that concept obvious?

Only after that should the explanation expand into architecture, APIs, scaling, reliability, or tradeoffs.

## Required answer shape

When using this skill, the response should naturally move through these layers:

1. `Problem essence`: what is the actual hard part?
2. `Concept ladder`: what must be understood before the rest makes sense?
3. `Small example`: what concrete example builds intuition?
4. `System design structure`: how do requirements, constraints, data model, API, and architecture connect?
5. `Tradeoffs`: why choose this design instead of the obvious alternatives?
6. `Interview expression`: how should the same knowledge be compressed and spoken under time pressure?

Do not skip from layer 1 to layer 4.

## Concept ladder rule

Before using a new important term, explain it in plain language.

The model should actively watch for this failure mode:

- A term appears.
- The term is used repeatedly.
- The term was never explained.

That is a teaching failure.

When a term first appears, explain it with this pattern:

- `Plain-language meaning`
- `Formal term`
- `Why it matters here`

Example:

- `An operation is one small edit.`
- `The formal term is operation or op.`
- `It matters because the system is synchronizing edits, not entire documents.`

## Small example rule

Every complex topic should have a minimal example early.

Use the smallest example that reveals the real problem:

- A tiny string for collaborative editing.
- A single request path for API scaling.
- One producer and one consumer for queue behavior.
- One leaderboard update for ranking systems.

The example is not decoration.
It is the bridge from intuition to abstraction.

If the answer has abstractions but no small example, add one.

## Teaching mode

When the user is clearly learning the topic, prioritize:

1. Define the problem in plain language.
2. Explain blocking concepts before architecture.
3. Reuse one running example.
4. Expand from local mechanism to full system.
5. Re-state the core idea after each major section.

Signs the user needs more teaching:

- They say a concept feels skipped.
- They ask what a term means.
- They say the answer feels too abstract.
- They want to understand rather than just rehearse.

In teaching mode, slow down and make the conceptual dependencies explicit.

## Interview mode

When the user is preparing to answer the question in an interview, prioritize:

1. Narrow the scope.
2. State the real challenge.
3. Define success criteria.
4. Present a main design path.
5. Call out major tradeoffs.
6. Offer 1-3 natural deep-dive branches.

The answer should sound like a guided discussion, not a brain dump.

Useful deep-dive branches usually include:

- consistency
- scale
- reliability
- data model
- hot spots
- recovery
- offline behavior
- cost or latency tradeoffs

## Combined mode

Most good outputs should mix the two modes:

- First, teach enough that the reader understands what is happening.
- Then, pivot into how to present it in an interview.

The pivot should be explicit.

Good pivot examples:

- `Now that the mechanism is clear, here is how I would present it in an interview.`
- `That explains the system. Next I would compress it into an interview-ready answer.`

## Generic system design flow

Use this as the default flow unless the topic clearly demands a different order:

1. Clarify scope.
2. State the real problem.
3. Explain prerequisite concepts.
4. Define functional requirements.
5. Define non-functional requirements.
6. Estimate scale only to justify design choices.
7. Explain the core data model.
8. Explain the main request or update flow.
9. Explain the high-level architecture.
10. Cover tradeoffs and failure cases.
11. Summarize how to say it in an interview.

## Tradeoff rule

Every major design choice should answer:

- Why this?
- Why not the obvious alternative?
- What cost does this choice introduce?

If a component is present but its motivation is missing, the answer is weak.

The model should explicitly attach a design choice to at least one of:

- latency
- consistency
- reliability
- complexity
- scalability
- cost
- developer ergonomics
- product behavior

## English interview rule

When the user is preparing for English interviews, include English-ready phrasing for the most important ideas.

Do not translate everything.
Only add English where it improves spoken output:

- core challenge
- key concepts
- major tradeoffs
- summary lines
- deep-dive transitions

Examples of reusable sentence shapes:

- `The hard part is not X. The hard part is Y.`
- `I would narrow the scope to ...`
- `I would optimize for X rather than Y because ...`
- `The reason I chose this design is ...`
- `The main tradeoff here is ...`
- `If we want to go deeper, I would discuss ...`

## Failure modes to avoid

When using this skill, actively check for these problems:

- unexplained terminology
- architecture before intuition
- too many components with no causal link
- no small example
- no tradeoff discussion
- purely educational explanation with no interview framing
- purely interview framing with no real teaching
- generic summary that does not help the user speak the answer

If any of these appear, revise the response structure.

## Output style

Responses using this skill should:

- explain first, compress second
- prefer plain language before formal vocabulary
- introduce terms only when needed
- keep one clear narrative thread
- make the user feel guided, not flooded
- end with an interview-ready version when relevant

This skill should make the model better at one thing:

Taking a hard system design topic and turning it into both understanding and usable interview speech.

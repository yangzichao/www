---
title: AI review patterns
date: 2026-05-12
description: Notes on the characteristic shape of AI code reviews — what they catch, where their fixes stop short, and the angles that close the gap.
tags: [ai, review]
---

Most of the time I ask an AI to review a change, it catches real issues. But the way it frames its findings — and the fixes it proposes — has its own characteristic shape, and over time I've started noticing the shape repeat. These are the patterns I keep running into.

## Reviewing one function at a time

The first thing I noticed is how *local* AI reviews tend to be. Hand it a diff and it'll move file by file, function by function, checking each one against general best practices. It rarely follows a piece of data across the system — from the point where it enters, through the transformations in the middle, to the place where it's finally consumed.

But most of the bugs I actually care about live in the connections, not in the individual functions. A field that's optional in one layer and assumed-present three layers down. A timestamp that's parsed as UTC on the way in and rendered as local on the way out. A cursor that's valid when the page loads but stale by the time the user clicks "next." None of those show up if you only ever look at one function at a time, because each function is internally consistent — the inconsistency lives in the seam between them.

So now, when I ask an AI to review, I explicitly tell it to trace the data path end-to-end. The findings change quality the moment I do.

## Catching the exception instead of fixing the cause

The second pattern is more subtle, and the one that prompted me to start writing this down.

I was watching an AI self-review a paginated list it had just built. The review found an edge case: if a cursor pointed to a page that no longer existed, the request would throw. A real catch. Its proposed fix was to wrap the call in try/catch, surface a "page unavailable" message to the user, and stop.

Technically, that fixes the crash. The program won't fall over. But it leaves the user staring at an error on a page they should never have been able to reach in the first place. The actual problem isn't that the request throws — it's that the UI offered the user a "next" link to a page that doesn't exist. The exception is a symptom, not the bug.

The right fix is upstream. Don't render the "next" link when there is no next page. Invalidate stale cursors when the underlying list changes. Make it impossible for the user to land in the broken state at all, rather than catching the exception once they're already there.

This is the difference between *defensive code* and *correct design*. Defensive code is about the program not crashing. Correct design is about the user never reaching the broken state to begin with. AI self-review tends to stop at the first and call it done, because in its training distribution, "wrap in try/catch" is the high-frequency response to "this can throw." It treats errors at the point where they *manifest*, not at the point where they *originate* — and the diff looks like a fix either way.

The review angle I've adopted: whenever a finding sounds like "guard against X / show an error," I stop and ask whether X should be reachable by the user at all. If the answer is no, the catch is the wrong layer to fix it.

<!-- more patterns to come -->

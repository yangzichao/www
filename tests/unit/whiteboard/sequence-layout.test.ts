import { describe, expect, it } from 'vitest';
import { layoutSequence } from '../../../src/markdown/whiteboard/sequence/layout-sequence';
import { parseSequence } from '../../../src/markdown/whiteboard/sequence/parse-sequence';

const SOURCE = [
  'sequenceDiagram',
  '  participant A as Alice client',
  '  participant S as Room',
  '  participant L as Log',
  '  A->>A: optimistic apply',
  '  A->>S: a fairly long message label that needs room',
  '  S->>L: ',
  '  Note over S: single',
  '  Note over A,L: spanning note',
  '  Note left of S: left side',
  '  Note right of L: right side',
  '  L->>L: ',
].join('\n');

describe('layoutSequence', () => {
  const layout = layoutSequence(parseSequence(SOURCE));
  const centerOf = (id: string) => layout.participants.find(({ participant }) => participant.id === id)?.centerX ?? NaN;

  it('spaces columns so every message label fits between its lifelines', () => {
    const [selfMessage, longMessage] = layout.messages;

    expect(longMessage?.labelBox?.width).toBeLessThan(centerOf('S') - centerOf('A'));
    expect(selfMessage?.labelBox?.x).toBeGreaterThan(centerOf('A'));
    expect((selfMessage?.labelBox?.x ?? 0) + (selfMessage?.labelBox?.width ?? 0)).toBeLessThan(centerOf('S'));
  });

  it('draws self messages as a loop back to the same lifeline and skips empty labels', () => {
    const selfLoop = layout.messages[0]?.points ?? [];
    const unlabeledSelfLoop = layout.messages.at(-1);

    expect(selfLoop).toHaveLength(4);
    expect(selfLoop[0]?.x).toBe(centerOf('A'));
    expect(selfLoop[3]?.x).toBe(centerOf('A'));
    expect(unlabeledSelfLoop?.labelBox).toBeNull();
    expect(layout.messages[2]?.labelBox).toBeNull();
  });

  it('places notes over, across, left of and right of lifelines', () => {
    const [single, spanning, left, right] = layout.notes.map(({ box }) => box);

    expect((single?.x ?? 0) + (single?.width ?? 0) / 2).toBeCloseTo(centerOf('S'), 6);
    expect(spanning?.x).toBeLessThan(centerOf('A'));
    expect((spanning?.x ?? 0) + (spanning?.width ?? 0)).toBeGreaterThan(centerOf('L'));
    expect((left?.x ?? 0) + (left?.width ?? 0)).toBeLessThan(centerOf('S'));
    expect(right?.x).toBeGreaterThan(centerOf('L'));
  });

  it('stacks every step below the previous one and runs lifelines past the last step', () => {
    const tops = [...layout.messages.map(({ points }) => points[0]?.y ?? 0), ...layout.notes.map(({ box }) => box.y)];

    expect(new Set(tops).size).toBe(tops.length);
    expect(Math.max(...tops)).toBeLessThan(layout.lifelineBottom);
    expect(Math.min(...tops)).toBeGreaterThan(layout.lifelineTop);
  });
});

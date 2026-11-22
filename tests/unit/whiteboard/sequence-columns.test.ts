import { describe, expect, it } from 'vitest';
import { columnCenters } from '../../../src/markdown/whiteboard/sequence/sequence-columns';

describe('columnCenters', () => {
  it('packs columns by width with a fixed gap when no rule needs more room', () => {
    expect(columnCenters([100, 60, 80], [])).toStrictEqual([50, 178, 296]);
  });

  it('widens the narrowest spans first and pushes every later column along', () => {
    const centers = columnCenters(
      [100, 100, 100],
      [
        { leftIndex: 0, rightIndex: 2, minimumDistance: 500 },
        { leftIndex: 0, rightIndex: 1, minimumDistance: 300 },
      ],
    );

    expect(centers).toStrictEqual([50, 350, 550]);
  });

  it('orders equal spans by their left column and ignores rules that point past the edges', () => {
    const centers = columnCenters(
      [100, 100, 100],
      [
        { leftIndex: 1, rightIndex: 2, minimumDistance: 200 },
        { leftIndex: 0, rightIndex: 1, minimumDistance: 200 },
        { leftIndex: 2, rightIndex: 3, minimumDistance: 900 },
        { leftIndex: -1, rightIndex: 0, minimumDistance: 900 },
      ],
    );

    expect(centers).toStrictEqual([50, 250, 450]);
  });
});

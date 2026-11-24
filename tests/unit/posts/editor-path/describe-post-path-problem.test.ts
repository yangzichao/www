import { describe, expect, it } from 'vitest';
import { describePostPathProblem } from '../../../../src/features/posts/editor/path/describe-post-path-problem';

describe('describePostPathProblem', () => {
  it('accepts a valid path and names what is missing or wrong', () => {
    expect(describePostPathProblem('physics/eft')).toBeNull();
    expect(describePostPathProblem('')).toBe('Pick a category before saving.');
    expect(describePostPathProblem('/eft')).toBe('Pick a category before saving.');
    expect(describePostPathProblem('physics/')).toBe('Add a URL slug before saving.');
    expect(describePostPathProblem('Physics/eft')).toBe(
      'Category and slug can only use lowercase letters, numbers, and single dashes.',
    );
  });
});

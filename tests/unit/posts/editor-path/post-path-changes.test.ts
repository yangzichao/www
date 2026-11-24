import { describe, expect, it } from 'vitest';
import {
  pathFollowingTitle,
  pathWithCategory,
  pathWithSlug,
} from '../../../../src/features/posts/editor/path/post-path-changes';

describe('post path changes', () => {
  it('replaces one part of the path and keeps the other', () => {
    expect(pathWithCategory('physics/eft', 'ai')).toBe('ai/eft');
    expect(pathWithCategory('', 'ai')).toBe('ai/');
    expect(pathWithCategory('ai/', '')).toBe('');
    expect(pathWithSlug('physics/eft', 'qcd')).toBe('physics/qcd');
    expect(pathWithSlug('', 'qcd')).toBe('/qcd');
  });

  it('derives the slug from the title', () => {
    expect(pathFollowingTitle('physics/old', 'New Idea')).toBe('physics/new-idea');
    expect(pathFollowingTitle('', 'New Idea')).toBe('/new-idea');
    expect(pathFollowingTitle('/new-idea', '')).toBe('');
  });
});

import { describe, expect, it } from 'vitest';
import { slugifyPostTitle } from '../../../../src/features/posts/editor/path/slugify-post-title';

describe('slugifyPostTitle', () => {
  it('turns a title into lowercase dashed words', () => {
    expect(slugifyPostTitle('  Why SQL beats NoSQL, sometimes! ')).toBe('why-sql-beats-nosql-sometimes');
    expect(slugifyPostTitle('Café — naïve résumé')).toBe('cafe-naive-resume');
    expect(slugifyPostTitle('β-delayed ¹¹Be')).toBe('delayed-11be');
    expect(slugifyPostTitle('中文标题')).toBe('');
  });

  it('keeps slugs short without a trailing dash', () => {
    const slug = slugifyPostTitle(`${'a'.repeat(79)} tail`);

    expect(slug).toBe('a'.repeat(79));
  });
});

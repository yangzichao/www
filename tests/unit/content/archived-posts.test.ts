import { describe, expect, it } from 'vitest';
import { getArchivedPosts, postsInSection, type Post } from '../../../src/lib/posts';
import { ARCHIVE_SECTION, categoryUrl, postUrl, WRITING_SECTION } from '../../../src/lib/post-sections';
import { setCollectionEntries } from '../../support/astro-content-stub';

function entry(collection: Post['collection'], id: string, date: string, draft = false): Post {
  return { id, collection, data: { title: id, date: new Date(date), draft, tags: [] } };
}

describe('post sections', () => {
  it('builds post and category URLs under each section', () => {
    expect(postUrl(WRITING_SECTION, 'physics/note')).toBe('/blog/physics/note/');
    expect(postUrl(ARCHIVE_SECTION, 'system-design/kv-store')).toBe('/archive/blog/system-design/kv-store/');
    expect(categoryUrl(ARCHIVE_SECTION, 'system-design')).toBe('/archive/blog/#system-design');
  });

  it('keeps only the writing section public', () => {
    expect([WRITING_SECTION.isPublic, ARCHIVE_SECTION.isPublic]).toStrictEqual([true, false]);
  });
});

describe('archived posts', () => {
  it('lists every archived post newest first, drafts included', async () => {
    setCollectionEntries('archive', [
      entry('archive', 'system-design/old', '2026-01-01'),
      entry('archive', 'system-design/draft', '2026-03-01', true),
      entry('archive', 'system-design/new', '2026-02-01'),
    ]);

    await expect(getArchivedPosts().then((posts) => posts.map((post) => post.id))).resolves.toStrictEqual([
      'system-design/draft',
      'system-design/new',
      'system-design/old',
    ]);
  });

  it('reads each section from its own collection', async () => {
    setCollectionEntries('blog', [
      entry('blog', 'physics/live', '2026-01-01'),
      entry('blog', 'physics/wip', '2026-01-02', true),
    ]);
    setCollectionEntries('archive', [entry('archive', 'system-design/retired', '2026-01-01')]);

    const ids = async (section: typeof WRITING_SECTION) => (await postsInSection(section)).map((post) => post.id);

    await expect(ids(WRITING_SECTION)).resolves.toStrictEqual(['physics/live']);
    await expect(ids(ARCHIVE_SECTION)).resolves.toStrictEqual(['system-design/retired']);
  });
});

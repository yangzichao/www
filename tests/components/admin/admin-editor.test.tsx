import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminEditor from '../../../src/features/admin/components/AdminEditor';
import { stubBrowserFetch } from '../support/browser-fetch';

const SIGN_IN_URL = '/auth/github/login?intent=admin&return_to=%2Fadmin%2F';
const HALO_PATH = 'src/content/blog/physics/halo-nuclei.md';
const HALO_MARKDOWN = '---\ntitle: "Halo nuclei"\n---\n\nβ-delayed proton emission.\n';

const POSTS = [
  { path: 'src/content/blog/ai/agents.md', category: 'ai', slug: 'agents' },
  { path: HALO_PATH, category: 'physics', slug: 'halo-nuclei' },
];

function savedResponse(path: string) {
  return Response.json({
    path,
    sha: 'new-blob-sha',
    commitSha: 'abcdef1234567',
    commitUrl: 'https://github.com/yangzichao/www/commit/abcdef1234567',
  });
}

function editorRoutes() {
  return {
    'GET /api/admin/posts': () => Response.json({ posts: POSTS }),
    'GET /api/admin/posts/file': () => Response.json({ path: HALO_PATH, content: HALO_MARKDOWN, sha: 'blob-sha' }),
    'PUT /api/admin/posts/file': () => savedResponse(HALO_PATH),
  };
}

async function openHaloPost(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'halo-nuclei' }));
  return screen.findByRole('textbox', { name: 'Post markdown' });
}

describe('AdminEditor', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-22T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lists posts grouped by category', async () => {
    stubBrowserFetch(editorRoutes());
    render(<AdminEditor signInUrl={SIGN_IN_URL} />);
    const postList = await screen.findByRole('navigation', { name: 'Posts' });

    expect(
      within(postList)
        .getAllByRole('heading')
        .map((heading) => heading.textContent),
    ).toStrictEqual(['ai', 'physics']);
    await expect(within(postList).findByRole('button', { name: 'agents' })).resolves.toBeInTheDocument();
  });

  it('opens a post with a live link and a default commit message', async () => {
    const requests = stubBrowserFetch(editorRoutes());
    const user = userEvent.setup();
    render(<AdminEditor signInUrl={SIGN_IN_URL} />);
    const editor = await openHaloPost(user);

    expect(editor).toHaveValue(HALO_MARKDOWN);
    expect(screen.getByRole('textbox', { name: 'Commit message' })).toHaveValue('Edit physics/halo-nuclei');
    expect(screen.getByRole('link', { name: 'View live ↗' })).toHaveAttribute('href', '/blog/physics/halo-nuclei/');
    expect(screen.getByRole('button', { name: 'Commit (⌘S)' })).toBeDisabled();
    expect(requests.at(-1)?.pathWithQuery).toBe(`/api/admin/posts/file?path=${encodeURIComponent(HALO_PATH)}`);
  });

  it('commits an edit with ⌘S and reports the commit', async () => {
    const requests = stubBrowserFetch(editorRoutes());
    const user = userEvent.setup();
    render(<AdminEditor signInUrl={SIGN_IN_URL} />);
    const editor = await openHaloPost(user);
    await user.type(editor, 'More.');
    await user.keyboard('{Meta>}s{/Meta}');

    await expect(
      screen.findByText('Committed abcdef1. The site redeploys in about a minute.'),
    ).resolves.toBeInTheDocument();
    expect(requests.at(-1)).toStrictEqual({
      method: 'PUT',
      pathWithQuery: '/api/admin/posts/file',
      body: {
        path: HALO_PATH,
        content: `${HALO_MARKDOWN}More.`,
        sha: 'blob-sha',
        commitMessage: 'Edit physics/halo-nuclei',
      },
    });
    expect(screen.getByRole('button', { name: 'Commit (⌘S)' })).toBeDisabled();
  });

  it('shows the error when a commit fails', async () => {
    stubBrowserFetch({
      ...editorRoutes(),
      'PUT /api/admin/posts/file': () => Response.json({ error: 'is at abc but expected def' }, { status: 409 }),
    });
    const user = userEvent.setup();
    render(<AdminEditor signInUrl={SIGN_IN_URL} />);
    await user.type(await openHaloPost(user), 'x');
    await user.click(screen.getByRole('button', { name: 'Commit (⌘S)' }));

    await expect(screen.findByText('is at abc but expected def')).resolves.toBeInTheDocument();
  });

  it('asks before discarding unsaved changes', async () => {
    stubBrowserFetch(editorRoutes());
    const confirmDiscard = vi.fn<typeof window.confirm>().mockReturnValue(false);
    vi.stubGlobal('confirm', confirmDiscard);
    const user = userEvent.setup();
    render(<AdminEditor signInUrl={SIGN_IN_URL} />);
    await user.type(await openHaloPost(user), 'unsaved');
    await user.click(screen.getByRole('button', { name: 'New post' }));

    expect(confirmDiscard).toHaveBeenCalledWith('Discard unsaved changes?');
    expect(screen.getByRole('textbox', { name: 'Post markdown' })).toHaveValue(`${HALO_MARKDOWN}unsaved`);
  });

  it('creates a new draft and adds it to the list once committed', async () => {
    const requests = stubBrowserFetch({
      ...editorRoutes(),
      'PUT /api/admin/posts/file': () => savedResponse('src/content/blog/physics/fresh-idea.md'),
    });
    const user = userEvent.setup();
    render(<AdminEditor signInUrl={SIGN_IN_URL} />);
    await screen.findByRole('button', { name: 'agents' });
    await user.click(screen.getByRole('button', { name: 'New post' }));
    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Fresh Idea');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'physics');
    await user.click(screen.getByRole('button', { name: 'Create draft' }));

    expect(screen.getByRole('textbox', { name: 'Commit message' })).toHaveValue('Add physics/fresh-idea');
    expect(screen.queryByRole('link', { name: 'View live ↗' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Commit (⌘S)' }));

    await expect(screen.findByRole('button', { name: 'fresh-idea' })).resolves.toBeInTheDocument();
    expect(requests.at(-1)?.body).toMatchObject({
      path: 'src/content/blog/physics/fresh-idea.md',
      sha: null,
      content: '---\ntitle: "Fresh Idea"\ndate: 2026-11-22\ndescription: ""\ntags: []\ndraft: true\n---\n\n',
    });
  });

  it('asks the owner to sign in again when the session lacks repository access', async () => {
    stubBrowserFetch({ 'GET /api/admin/posts': () => Response.json({ error: 'Sign in again.' }, { status: 401 }) });
    render(<AdminEditor signInUrl={SIGN_IN_URL} />);

    await expect(screen.findByRole('link', { name: 'Sign in with GitHub' })).resolves.toHaveAttribute(
      'href',
      SIGN_IN_URL,
    );
  });
});

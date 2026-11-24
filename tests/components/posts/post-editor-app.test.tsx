import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PostEditorApp from '../../../src/features/posts/editor/PostEditorApp';
import { renderMarkdownInBrowser } from '../../../src/features/posts/editor/load-post-renderer';
import { navigateTo } from '../../../src/features/posts/editor/navigate-to';
import type { EditablePost } from '../../../src/features/posts/editor/post-draft';
import { buildPost } from '../../support/post-fixtures';
import { stubBrowserFetch } from '../support/browser-fetch';
import { appendToMarkdownEditor, findMarkdownEditorView } from '../support/live-markdown-editor';

vi.mock(import('../../../src/features/posts/editor/navigate-to'), () => ({ navigateTo: vi.fn() }));
vi.mock(import('../../../src/features/posts/editor/load-post-renderer'), () => ({
  renderMarkdownInBrowser: vi.fn(),
}));

const SAVED_POST: EditablePost = {
  id: 'post 1',
  path: 'physics/first-post',
  title: 'First post',
  description: 'About it.',
  venue: null,
  tags: ['physics', 'eft'],
  bodyMarkdown: 'Hello.',
  isPublic: false,
  createdAt: '2026-11-22T21:30:00.000Z',
  updatedAt: null,
};

function renderEditor(initialPost: EditablePost | null) {
  render(<PostEditorApp initialPost={initialPost} />);
  return { user: userEvent.setup() };
}

function wasLeavingBlocked(): boolean {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

describe('PostEditorApp', () => {
  beforeEach(() => {
    vi.mocked(renderMarkdownInBrowser).mockImplementation((markdown) =>
      Promise.resolve({ html: `<p>${markdown}</p>`, headings: [{ depth: 2, slug: 'intro', text: 'Intro' }] }),
    );
  });

  it('creates a new post from every field and opens its edit page', async () => {
    const observed = stubBrowserFetch({
      'POST /api/posts': () => Response.json({ post: buildPost({ id: 'new id' }) }, { status: 201 }),
    });
    const { user } = renderEditor(null);

    expect(screen.getByText('New post, not saved yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();

    expect(screen.getByText('Private · no path yet')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Title' }), ' Fresh ');
    await user.type(screen.getByRole('textbox', { name: 'Path' }), 'physics/fresh');
    await user.type(screen.getByRole('textbox', { name: 'Tags' }), 'eft, #nuclear');
    await user.type(screen.getByRole('textbox', { name: 'Venue' }), 'PRC');
    await user.type(screen.getByRole('textbox', { name: 'Description' }), '  ');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Visibility' }), 'Public');
    appendToMarkdownEditor('Body');

    expect(screen.getByText('Public · physics/fresh · 2 tags')).toBeInTheDocument();

    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    expect(wasLeavingBlocked()).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(navigateTo).toHaveBeenCalledExactlyOnceWith('/admin/posts/new%20id/');
    });

    expect(observed).toStrictEqual([
      {
        method: 'POST',
        pathWithQuery: '/api/posts',
        body: {
          path: 'physics/fresh',
          title: 'Fresh',
          description: null,
          venue: 'PRC',
          tags: ['eft', 'nuclear'],
          bodyMarkdown: 'Body',
          bodyHtml: '<p>Body</p>',
          headings: [{ depth: 2, slug: 'intro', text: 'Intro' }],
          isPublic: true,
        },
      },
    ]);
    expect(wasLeavingBlocked()).toBe(false);
  });

  it('saves an existing post with the keyboard shortcut and shows the edit time', async () => {
    const observed = stubBrowserFetch({
      'PATCH /api/posts/post%201': () =>
        Response.json({ post: buildPost({ ...SAVED_POST, title: 'Renamed', updatedAt: '2026-11-23T08:00:00.000Z' }) }),
    });
    const { user } = renderEditor(SAVED_POST);

    expect(screen.getByRole('textbox', { name: 'Tags' })).toHaveValue('physics, eft');
    expect(screen.getByRole('textbox', { name: 'Venue' })).toHaveValue('');
    expect(screen.getByText('Created Nov 22, 2026, 4:30 PM')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View post ↗' })).toHaveAttribute('href', '/blog/physics/first-post/');
    expect(wasLeavingBlocked()).toBe(false);

    const titleInput = screen.getByRole('textbox', { name: 'Title' });
    await user.clear(titleInput);
    await user.type(titleInput, 'Renamed');
    fireEvent.keyDown(window, { key: 'x', metaKey: true });
    fireEvent.keyDown(window, { key: 's' });

    expect(observed).toStrictEqual([]);

    fireEvent.keyDown(window, { key: 'S', ctrlKey: true });

    await expect(
      screen.findByText('Created Nov 22, 2026, 4:30 PM · Edited Nov 23, 2026, 3:00 AM'),
    ).resolves.toBeInTheDocument();
    expect(observed).toMatchObject([
      { method: 'PATCH', body: { title: 'Renamed', description: 'About it.', isPublic: false } },
    ]);
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('shows why a save failed and keeps the draft', async () => {
    stubBrowserFetch({
      'PATCH /api/posts/post%201': () =>
        Response.json({ error: 'Another post already uses the path.' }, { status: 409 }),
    });
    const { user } = renderEditor(SAVED_POST);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await expect(screen.findByRole('alert')).resolves.toHaveTextContent('Another post already uses the path.');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('falls back to a generic message when rendering throws something odd', async () => {
    vi.mocked(renderMarkdownInBrowser).mockRejectedValue('boom');
    stubBrowserFetch({});
    const { user } = renderEditor(SAVED_POST);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await expect(screen.findByText('Could not save this post.')).resolves.toBeInTheDocument();
  });

  it('asks for a second click before deleting, then returns to the admin home', async () => {
    const observed = stubBrowserFetch({ 'DELETE /api/posts/post%201': () => Response.json({ deleted: true }) });
    const { user } = renderEditor(SAVED_POST);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('textbox', { name: 'Title' }));

    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Click again to delete' }));

    await waitFor(() => {
      expect(navigateTo).toHaveBeenCalledExactlyOnceWith('/admin/');
    });

    expect(observed).toMatchObject([{ method: 'DELETE', pathWithQuery: '/api/posts/post%201' }]);
  });

  it('shows why a delete failed', async () => {
    stubBrowserFetch({
      'DELETE /api/posts/post%201': () => Response.json({ error: 'Post not found.' }, { status: 404 }),
    });
    const { user } = renderEditor(SAVED_POST);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Click again to delete' }));

    await expect(screen.findByRole('alert')).resolves.toHaveTextContent('Post not found.');
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it('keeps settings folded for a saved post and loads its body into the live editor', async () => {
    const { user } = renderEditor(SAVED_POST);
    const settings = screen.getByText('Post settings').closest('details');

    expect(settings).not.toHaveAttribute('open');
    expect(screen.getByText('Private · physics/first-post · 2 tags')).toBeInTheDocument();
    expect(findMarkdownEditorView().state.doc.toString()).toBe('Hello.');

    await user.click(screen.getByText('Post settings'));

    expect(settings).toHaveAttribute('open');
  });

  it('switches to an exact preview and back without losing the draft', async () => {
    const { user } = renderEditor(SAVED_POST);
    appendToMarkdownEditor(' More.');

    await user.click(screen.getByRole('button', { name: 'Preview' }));
    const preview = screen.getByRole('region', { name: 'Preview' });

    expect(within(preview).getByRole('heading', { name: 'First post' })).toBeInTheDocument();
    await expect(within(preview).findByText('Hello. More.')).resolves.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.queryByRole('region', { name: 'Preview' })).not.toBeInTheDocument();
    expect(findMarkdownEditorView().state.doc.toString()).toBe('Hello. More.');
  });

  it('previews the rendered markdown under the title', async () => {
    const { user } = renderEditor(SAVED_POST);
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    const preview = screen.getByRole('region', { name: 'Preview' });

    expect(within(preview).getByRole('heading', { name: 'First post' })).toBeInTheDocument();
    await expect(within(preview).findByText('Hello.')).resolves.toBeInTheDocument();
    expect(preview).toHaveAttribute('data-preview-state', 'rendered');
  });

  it('explains a preview that failed to render', async () => {
    vi.mocked(renderMarkdownInBrowser).mockRejectedValue(new Error('Bad diagram'));
    const { user } = renderEditor(null);
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    const preview = screen.getByRole('region', { name: 'Preview' });

    expect(within(preview).getByRole('heading', { name: 'Untitled' })).toBeInTheDocument();
    await expect(within(preview).findByRole('alert')).resolves.toHaveTextContent('Bad diagram');
  });
});

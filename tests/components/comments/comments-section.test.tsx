import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CommentsSection from '../../../src/features/comments/components/CommentsSection';
import { loadTurnstile } from '../../../src/features/comments/components/turnstile-script';
import { stubBrowserFetch } from '../support/browser-fetch';
import { ADMIN_VIEWER, PAGE_PATH, publicComment, VISITOR_VIEWER } from '../support/comment-fixtures';
import { createFakeTurnstile } from '../support/fake-turnstile';

vi.mock(import('../../../src/features/comments/components/turnstile-script'), async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, loadTurnstile: vi.fn(actual.loadTurnstile) };
});

const THREAD_ROUTE = `GET /api/comments?path=${encodeURIComponent(PAGE_PATH)}`;

function threadRoute(thread: { comments: ReturnType<typeof publicComment>[]; viewer: typeof VISITOR_VIEWER | null }) {
  return { [THREAD_ROUTE]: () => Response.json(thread) };
}

async function renderSection() {
  render(<CommentsSection pagePath={PAGE_PATH} />);
  return screen.findByRole('textbox', { name: 'Comment' });
}

describe('CommentsSection for anonymous readers', () => {
  beforeEach(() => {
    delete window.turnstile;
  });

  it('shows the empty state, a GitHub sign-in link, and requires Turnstile before posting', async () => {
    createFakeTurnstile();
    stubBrowserFetch(threadRoute({ comments: [], viewer: null }));
    const user = userEvent.setup();
    await renderSection();

    expect(screen.getByText('No comments yet. Be the first.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in with GitHub' })).toHaveAttribute(
      'href',
      `/auth/github/login?intent=comment&return_to=${encodeURIComponent(`${PAGE_PATH}#comments`)}`,
    );

    await user.type(screen.getByRole('textbox', { name: 'Comment' }), 'Hello');

    expect(screen.getByRole('button', { name: 'Post comment' })).toBeDisabled();
  });

  it('submits an anonymous comment for review and resets the challenge', async () => {
    const turnstile = createFakeTurnstile();
    const requests = stubBrowserFetch({
      ...threadRoute({ comments: [], viewer: null }),
      'POST /api/comments': () =>
        Response.json({ comment: publicComment({ authorKind: 'anonymous', status: 'pending' }) }, { status: 201 }),
    });
    const user = userEvent.setup();
    await renderSection();

    await user.type(screen.getByRole('textbox', { name: 'Name (optional)' }), 'Ada');
    await user.type(screen.getByRole('textbox', { name: 'Comment' }), 'First!');
    turnstile.solve('solved-token');
    await user.click(await screen.findByRole('button', { name: 'Post comment' }));

    await expect(screen.findByText('Thanks! Your comment will appear after review.')).resolves.toBeInTheDocument();
    expect(requests.at(-1)?.body).toStrictEqual({
      pagePath: PAGE_PATH,
      body: 'First!',
      authorName: 'Ada',
      turnstileToken: 'solved-token',
    });
    expect(screen.queryByText('Lovely explanation.')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Comment' })).toHaveValue('');
    expect(turnstile.reset).toHaveBeenCalledWith('widget-1');
  });

  it('disables posting again when the challenge expires', async () => {
    const turnstile = createFakeTurnstile();
    stubBrowserFetch(threadRoute({ comments: [], viewer: null }));
    const user = userEvent.setup();
    await renderSection();
    await user.type(screen.getByRole('textbox', { name: 'Comment' }), 'Hello');
    turnstile.solve('token');

    await expect(screen.findByRole('button', { name: 'Post comment' })).resolves.toBeEnabled();

    turnstile.expire();

    await expect(screen.findByRole('button', { name: 'Post comment' })).resolves.toBeDisabled();
  });

  it('explains when human verification cannot load', async () => {
    vi.mocked(loadTurnstile).mockRejectedValueOnce(new Error('blocked'));
    stubBrowserFetch(threadRoute({ comments: [], viewer: null }));
    await renderSection();

    await expect(
      screen.findByText('Human verification could not load. Please try again later.'),
    ).resolves.toBeInTheDocument();
  });

  it('shows a load error when the thread cannot be fetched', async () => {
    createFakeTurnstile();
    stubBrowserFetch({ [THREAD_ROUTE]: () => Response.json({ error: 'Database unavailable' }, { status: 503 }) });
    render(<CommentsSection pagePath={PAGE_PATH} />);

    await expect(screen.findByText('Comments could not be loaded: Database unavailable')).resolves.toBeInTheDocument();
    expect(screen.queryByText('No comments yet. Be the first.')).not.toBeInTheDocument();
  });
});

describe('CommentsSection for signed-in visitors', () => {
  it('lists published comments with a sized avatar and GitHub profile link', async () => {
    stubBrowserFetch(threadRoute({ comments: [publicComment()], viewer: VISITOR_VIEWER }));
    await renderSection();
    const item = screen.getByRole('listitem');

    expect(within(item).getByText('Lovely explanation.')).toBeInTheDocument();
    expect(within(item).getByRole('link', { name: '@octo' })).toHaveAttribute('href', 'https://github.com/octo');
    expect(within(item).getByRole('presentation')).toHaveAttribute(
      'src',
      'https://avatars.githubusercontent.com/u/7?v=4&s=64',
    );
    expect(within(item).getByText('Nov 20, 2026')).toHaveAttribute('datetime', '2026-11-20T10:00:00.000Z');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Comments1');
    expect(within(item).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('publishes a comment straight into the thread without Turnstile', async () => {
    const requests = stubBrowserFetch({
      ...threadRoute({ comments: [], viewer: VISITOR_VIEWER }),
      'POST /api/comments': () =>
        Response.json({ comment: publicComment({ id: 'new', body: 'Thanks!' }) }, { status: 201 }),
    });
    const user = userEvent.setup();
    await renderSection();

    expect(screen.getByText('@friendly-visitor')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Name (optional)' })).not.toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Comment' }), 'Thanks!');
    await user.click(screen.getByRole('button', { name: 'Post comment' }));

    await expect(screen.findByText('Thanks!')).resolves.toBeInTheDocument();
    expect(requests.at(-1)?.body).toMatchObject({ body: 'Thanks!', turnstileToken: null });
  });

  it('shows the server error when posting fails and keeps the draft', async () => {
    stubBrowserFetch({
      ...threadRoute({ comments: [], viewer: VISITOR_VIEWER }),
      'POST /api/comments': () => Response.json({ error: 'Comment cannot be empty.' }, { status: 400 }),
    });
    const user = userEvent.setup();
    await renderSection();
    await user.type(screen.getByRole('textbox', { name: 'Comment' }), 'Draft');
    await user.click(screen.getByRole('button', { name: 'Post comment' }));

    await expect(screen.findByText('Comment cannot be empty.')).resolves.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Comment' })).toHaveValue('Draft');
  });

  it('signs out back to the anonymous form', async () => {
    createFakeTurnstile();
    stubBrowserFetch({
      ...threadRoute({ comments: [], viewer: VISITOR_VIEWER }),
      'POST /auth/logout': () => Response.json({ signedOut: true }),
    });
    const user = userEvent.setup();
    await renderSection();
    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    await expect(screen.findByRole('link', { name: 'Sign in with GitHub' })).resolves.toBeInTheDocument();
  });
});

describe('CommentsSection for the admin', () => {
  it('approves a pending comment in place', async () => {
    const requests = stubBrowserFetch({
      ...threadRoute({ comments: [publicComment({ status: 'pending' })], viewer: ADMIN_VIEWER }),
      'POST /api/comments/comment-1/approve': () => Response.json({ approved: true }),
    });
    const user = userEvent.setup();
    await renderSection();

    expect(screen.getByText('Pending review')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Approve' }));

    expect(screen.queryByText('Pending review')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(requests.at(-1)?.method).toBe('POST');
  });

  it('deletes a comment', async () => {
    stubBrowserFetch({
      ...threadRoute({ comments: [publicComment()], viewer: ADMIN_VIEWER }),
      'DELETE /api/comments/comment-1': () => Response.json({ deleted: true }),
    });
    const user = userEvent.setup();
    await renderSection();
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await expect(screen.findByText('No comments yet. Be the first.')).resolves.toBeInTheDocument();
  });

  it('reports a failed moderation action instead of failing silently', async () => {
    stubBrowserFetch({
      ...threadRoute({ comments: [publicComment()], viewer: ADMIN_VIEWER }),
      'DELETE /api/comments/comment-1': () => Response.json({ error: 'Admin only.' }, { status: 403 }),
    });
    const user = userEvent.setup();
    await renderSection();
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await expect(screen.findByRole('alert')).resolves.toHaveTextContent('Admin only.');
    expect(screen.getByText('Lovely explanation.')).toBeInTheDocument();
  });
});

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ModerationQueue from '../../../src/features/admin/components/ModerationQueue';
import { stubBrowserFetch } from '../support/browser-fetch';
import { publicComment } from '../support/comment-fixtures';

const PENDING = publicComment({
  id: 'pending-1',
  body: 'Please approve me',
  authorKind: 'anonymous',
  status: 'pending',
});
const PUBLISHED = publicComment({ id: 'published-1', body: 'Already live' });

function queueRoute() {
  return { 'GET /api/admin/comments': () => Response.json({ pending: [PENDING], recent: [PUBLISHED] }) };
}

function group(name: string) {
  const heading = screen.getByRole('heading', { name: new RegExp(`^${name}`) });
  const section = heading.closest('section');
  if (!section) throw new Error(`No section for ${name}`);
  return within(section);
}

describe('ModerationQueue', () => {
  it('lists pending and recent comments with links to their pages', async () => {
    stubBrowserFetch(queueRoute());
    render(<ModerationQueue />);

    await expect(screen.findByText('Please approve me')).resolves.toBeInTheDocument();
    expect(group('Pending review').getByRole('link', { name: PENDING.pagePath })).toHaveAttribute(
      'href',
      `${PENDING.pagePath}#comments`,
    );
    expect(group('Recently published').getByText('Already live')).toBeInTheDocument();
  });

  it('moves an approved comment to the published list', async () => {
    stubBrowserFetch({
      ...queueRoute(),
      'POST /api/comments/pending-1/approve': () => Response.json({ approved: true }),
    });
    const user = userEvent.setup();
    render(<ModerationQueue />);
    await user.click(await screen.findByRole('button', { name: 'Approve' }));

    expect(group('Pending review').getByText('Nothing here.')).toBeInTheDocument();
    expect(group('Recently published').getByText('Please approve me')).toBeInTheDocument();
  });

  it('removes a deleted comment from every list', async () => {
    stubBrowserFetch({
      ...queueRoute(),
      'DELETE /api/comments/published-1': () => Response.json({ deleted: true }),
    });
    const user = userEvent.setup();
    render(<ModerationQueue />);
    await screen.findByText('Already live');
    await user.click(group('Recently published').getByRole('button', { name: 'Delete' }));

    expect(group('Recently published').getByText('Nothing here.')).toBeInTheDocument();
  });

  it('surfaces a failed action', async () => {
    stubBrowserFetch({
      ...queueRoute(),
      'POST /api/comments/pending-1/approve': () =>
        Response.json({ error: 'Pending comment not found.' }, { status: 404 }),
    });
    const user = userEvent.setup();
    render(<ModerationQueue />);
    await user.click(await screen.findByRole('button', { name: 'Approve' }));

    await expect(screen.findByRole('alert')).resolves.toHaveTextContent('Pending comment not found.');
    expect(group('Pending review').getByText('Please approve me')).toBeInTheDocument();
  });

  it('shows why the queue could not load', async () => {
    stubBrowserFetch({
      'GET /api/admin/comments': () => Response.json({ error: 'Sign in required.' }, { status: 401 }),
    });
    render(<ModerationQueue />);

    await expect(screen.findByText('Sign in required.')).resolves.toBeInTheDocument();
  });
});

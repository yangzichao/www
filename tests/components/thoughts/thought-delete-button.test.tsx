import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ThoughtDeleteButton from '../../../src/features/thoughts/components/ThoughtDeleteButton';
import { reloadPage } from '../../../src/features/thoughts/components/reload-page';
import { stubBrowserFetch } from '../support/browser-fetch';

vi.mock(import('../../../src/features/thoughts/components/reload-page'), () => ({ reloadPage: vi.fn() }));

function renderButton() {
  render(<ThoughtDeleteButton thoughtId="thought 1" />);
  return { user: userEvent.setup() };
}

describe('ThoughtDeleteButton', () => {
  it('asks for a second click before deleting, then reloads', async () => {
    const observed = stubBrowserFetch({
      'DELETE /api/thoughts/thought%201': () => Response.json({ deleted: true }),
    });
    const { user } = renderButton();

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(observed).toStrictEqual([]);

    await user.click(screen.getByRole('button', { name: 'Click again to delete' }));

    expect(observed).toStrictEqual([{ method: 'DELETE', pathWithQuery: '/api/thoughts/thought%201', body: null }]);
    expect(reloadPage).toHaveBeenCalledExactlyOnceWith();
  });

  it('backs out of the confirmation when focus leaves', async () => {
    const { user } = renderButton();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.tab();

    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('keeps the idle label when focus leaves without confirming', async () => {
    const { user } = renderButton();
    await user.tab();
    await user.tab();

    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('shows the error and resets when the delete fails', async () => {
    stubBrowserFetch({
      'DELETE /api/thoughts/thought%201': () => Response.json({ error: 'Thought not found.' }, { status: 404 }),
    });
    const { user } = renderButton();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Click again to delete' }));

    await expect(screen.findByRole('alert')).resolves.toHaveTextContent('Thought not found.');
    expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled();
    expect(reloadPage).not.toHaveBeenCalled();
  });

  it('falls back to a generic message when the failure is not an Error', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue('network down'));
    const { user } = renderButton();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Click again to delete' }));

    await expect(screen.findByRole('alert')).resolves.toHaveTextContent('Could not delete this thought.');
  });
});

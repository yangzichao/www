import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ThoughtAdminControls from '../../../src/features/thoughts/components/ThoughtAdminControls';
import { reloadPage } from '../../../src/features/thoughts/components/reload-page';
import { stubBrowserFetch } from '../support/browser-fetch';

vi.mock(import('../../../src/features/thoughts/components/reload-page'), () => ({ reloadPage: vi.fn() }));

const SAVED_THOUGHT = {
  id: 'thought 1',
  body: 'First take.',
  tags: ['ai', 'life'],
  createdAt: '2026-11-22T21:30:00.000Z',
  updatedAt: '2026-11-23T08:00:00.000Z',
  timestampPrecision: 'exact',
  isPublic: false,
};

function renderControls() {
  render(<ThoughtAdminControls thoughtId="thought 1" body="First take." tags={['ai', 'life']} isPublic />);
  return { user: userEvent.setup() };
}

describe('ThoughtAdminControls', () => {
  it('opens an editor filled with the saved thought', async () => {
    const { user } = renderControls();

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByRole('textbox', { name: 'Edit thought' })).toHaveValue('First take.');
    expect(screen.getByRole('textbox', { name: 'Tags' })).toHaveValue('ai, life');
    expect(screen.getByRole('combobox', { name: 'Visibility' })).toHaveValue('public');
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('saves the edit with PATCH and reloads', async () => {
    const observed = stubBrowserFetch({
      'PATCH /api/thoughts/thought%201': () => Response.json({ thought: SAVED_THOUGHT }),
    });
    const { user } = renderControls();
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const bodyInput = screen.getByRole('textbox', { name: 'Edit thought' });
    await user.clear(bodyInput);
    await user.type(bodyInput, 'Second take.');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Visibility' }), 'Private');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(observed).toStrictEqual([
      {
        method: 'PATCH',
        pathWithQuery: '/api/thoughts/thought%201',
        body: { body: 'Second take.', tags: ['ai', 'life'], isPublic: false },
      },
    ]);
    expect(reloadPage).toHaveBeenCalledExactlyOnceWith();
  });

  it('discards the draft on cancel', async () => {
    const observed = stubBrowserFetch({});
    const { user } = renderControls();
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.type(screen.getByRole('textbox', { name: 'Edit thought' }), ' scratch');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(observed).toStrictEqual([]);
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByRole('textbox', { name: 'Edit thought' })).toHaveValue('First take.');
  });

  it('keeps the editor open with the server error when saving fails', async () => {
    stubBrowserFetch({
      'PATCH /api/thoughts/thought%201': () => Response.json({ error: 'Thought not found.' }, { status: 404 }),
    });
    const { user } = renderControls();
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await expect(screen.findByRole('alert')).resolves.toHaveTextContent('Thought not found.');
    expect(screen.getByRole('textbox', { name: 'Edit thought' })).toHaveValue('First take.');
    expect(reloadPage).not.toHaveBeenCalled();
  });
});

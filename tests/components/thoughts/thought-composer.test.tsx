import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ThoughtComposer from '../../../src/features/thoughts/components/ThoughtComposer';
import { reloadPage } from '../../../src/features/thoughts/components/reload-page';
import { stubBrowserFetch } from '../support/browser-fetch';

vi.mock(import('../../../src/features/thoughts/components/reload-page'), () => ({ reloadPage: vi.fn() }));

const CREATED_THOUGHT = {
  id: 'thought-1',
  body: 'Ship small.',
  tags: ['work'],
  createdAt: '2026-11-22T21:30:00.000Z',
  updatedAt: null,
  timestampPrecision: 'exact',
  isPublic: true,
};

function renderComposer() {
  render(<ThoughtComposer />);
  return {
    user: userEvent.setup(),
    bodyInput: screen.getByRole('textbox', { name: 'New thought' }),
    tagInput: screen.getByRole('textbox', { name: 'Tags' }),
    visibilitySelect: screen.getByRole('combobox', { name: 'Visibility' }),
    postButton: screen.getByRole('button', { name: 'Post' }),
  };
}

describe('ThoughtComposer', () => {
  it('keeps the post button disabled until there is text', async () => {
    const { user, bodyInput, postButton } = renderComposer();

    expect(postButton).toBeDisabled();

    await user.type(bodyInput, '   ');

    expect(postButton).toBeDisabled();
  });

  it('posts the thought with parsed tags and reloads the feed', async () => {
    const observed = stubBrowserFetch({
      'POST /api/thoughts': () => Response.json({ thought: CREATED_THOUGHT }, { status: 201 }),
    });
    const { user, bodyInput, tagInput, postButton } = renderComposer();
    await user.type(bodyInput, 'Ship small.');
    await user.type(tagInput, '#work, life');
    await user.click(postButton);

    expect(observed).toStrictEqual([
      {
        method: 'POST',
        pathWithQuery: '/api/thoughts',
        body: { body: 'Ship small.', tags: ['work', 'life'], isPublic: true },
      },
    ]);
    expect(reloadPage).toHaveBeenCalledExactlyOnceWith();
    expect(bodyInput).toHaveValue('');
    expect(tagInput).toHaveValue('');
  });

  it('posts a private thought and resets the visibility afterwards', async () => {
    const observed = stubBrowserFetch({
      'POST /api/thoughts': () => Response.json({ thought: { ...CREATED_THOUGHT, isPublic: false } }, { status: 201 }),
    });
    const { user, bodyInput, visibilitySelect, postButton } = renderComposer();
    await user.type(bodyInput, 'Just for me.');
    await user.selectOptions(visibilitySelect, 'Private');
    await user.click(postButton);

    expect(observed.map(({ body }) => body)).toStrictEqual([{ body: 'Just for me.', tags: [], isPublic: false }]);
    expect(visibilitySelect).toHaveValue('public');
  });

  it('posts with Cmd+Enter from the text box', async () => {
    const observed = stubBrowserFetch({
      'POST /api/thoughts': () => Response.json({ thought: CREATED_THOUGHT }, { status: 201 }),
    });
    const { user, bodyInput } = renderComposer();
    await user.type(bodyInput, 'Quick one.');
    await user.keyboard('{Meta>}{Enter}{/Meta}');

    expect(observed).toHaveLength(1);
    expect(reloadPage).toHaveBeenCalledExactlyOnceWith();
  });

  it('ignores a plain Enter and an empty Cmd+Enter', async () => {
    const observed = stubBrowserFetch({});
    const { user, bodyInput } = renderComposer();

    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();

    await user.type(bodyInput, '{Control>}{Enter}{/Control}');
    await user.type(bodyInput, 'line one{Enter}line two');

    expect(observed).toStrictEqual([]);
    expect(bodyInput).toHaveValue('line one\nline two');
  });

  it('shows the server error and keeps the draft', async () => {
    stubBrowserFetch({ 'POST /api/thoughts': () => Response.json({ error: 'Admin only.' }, { status: 403 }) });
    const { user, bodyInput, postButton } = renderComposer();
    await user.type(bodyInput, 'Draft.');
    await user.click(postButton);

    await expect(screen.findByRole('alert')).resolves.toHaveTextContent('Admin only.');
    expect(bodyInput).toHaveValue('Draft.');
    expect(reloadPage).not.toHaveBeenCalled();
  });

  it('falls back to a generic message when the failure is not an Error', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue('network down'));
    const { user, bodyInput, postButton } = renderComposer();
    await user.type(bodyInput, 'Draft.');
    await user.click(postButton);

    await expect(screen.findByRole('alert')).resolves.toHaveTextContent('Could not post this thought.');
  });
});

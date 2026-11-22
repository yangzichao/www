import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NewPostForm } from '../../../src/features/admin/components/NewPostForm';

function renderForm() {
  const onCreate = vi.fn<(draft: { path: string; content: string }) => void>();
  const onCancel = vi.fn<() => void>();
  render(
    <NewPostForm
      categories={['ai', 'physics']}
      existingPaths={new Set(['src/content/blog/ai/taken.md'])}
      onCreate={onCreate}
      onCancel={onCancel}
    />,
  );
  return { onCreate, onCancel, user: userEvent.setup() };
}

describe('NewPostForm', () => {
  it('focuses the title and requires it', () => {
    renderForm();

    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveFocus();
    expect(screen.getByText('Title is required.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create draft' })).toBeDisabled();
  });

  it('derives the slug from the title and previews the path', async () => {
    const { user } = renderForm();
    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Agents in Practice');

    expect(screen.getByRole('textbox', { name: 'Slug' })).toHaveAttribute('placeholder', 'agents-in-practice');
    expect(
      screen.getByText('Will be created at src/content/blog/ai/agents-in-practice.md as a draft.'),
    ).toBeInTheDocument();
  });

  it('rejects an invalid custom slug', async () => {
    const { user } = renderForm();
    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Post');
    await user.type(screen.getByRole('textbox', { name: 'Slug' }), 'Bad Slug');

    expect(screen.getByText('Slug may only contain a-z, 0-9 and dashes.')).toBeInTheDocument();
  });

  it('rejects a slug that already exists in the category', async () => {
    const { user } = renderForm();
    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Taken');

    expect(screen.getByText('A post with this slug already exists.')).toBeInTheDocument();
  });

  it('creates a draft in the chosen category or cancels', async () => {
    const { user, onCreate, onCancel } = renderForm();
    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Halo');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'physics');
    await user.click(screen.getByRole('button', { name: 'Create draft' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    const createdDraft = onCreate.mock.lastCall?.[0];

    expect(createdDraft?.path).toBe('src/content/blog/physics/halo.md');
    expect(createdDraft?.content).toContain('title: "Halo"');
    expect(onCancel).toHaveBeenCalledExactlyOnceWith();
  });
});

import { useState, type SubmitEvent } from 'react';
import { newPostTemplate, slugFromTitle } from '../new-post-template';
import { postFilePathFor } from '../post-file-path';

interface NewPostFormProps {
  categories: string[];
  existingPaths: Set<string>;
  onCreate: (draft: { path: string; content: string }) => void;
  onCancel: () => void;
}

export function NewPostForm({ categories, existingPaths, onCreate, onCancel }: NewPostFormProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(categories[0] ?? '');
  const [slug, setSlug] = useState('');
  const effectiveSlug = slug || slugFromTitle(title);
  const path = postFilePathFor(category, effectiveSlug);
  const problem = !title.trim()
    ? 'Title is required.'
    : !/^[a-z0-9-]+$/.test(effectiveSlug)
      ? 'Slug may only contain a-z, 0-9 and dashes.'
      : existingPaths.has(path)
        ? 'A post with this slug already exists.'
        : null;

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (problem) return;
    onCreate({ path, content: newPostTemplate(title.trim()) });
  }

  return (
    <form className="admin-new-post" onSubmit={handleSubmit}>
      <h2>New post</h2>
      <label>
        Title
        <input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
      </label>
      <label>
        Category
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Slug
        <input value={slug} placeholder={slugFromTitle(title)} onChange={(event) => setSlug(event.target.value)} />
      </label>
      <p className="admin-hint">{problem ?? `Will be created at ${path} as a draft.`}</p>
      <div className="admin-actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="admin-primary" disabled={problem !== null}>
          Create draft
        </button>
      </div>
    </form>
  );
}

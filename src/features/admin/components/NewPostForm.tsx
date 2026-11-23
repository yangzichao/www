import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
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
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

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
      <Label className="admin-field">
        Title
        <Input
          ref={titleInputRef}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
          }}
        />
      </Label>
      <Label className="admin-field">
        Category
        <NativeSelect
          className="w-full"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
          }}
        >
          {categories.map((name) => (
            <NativeSelectOption key={name} value={name}>
              {name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Label>
      <Label className="admin-field">
        Slug
        <Input
          value={slug}
          placeholder={slugFromTitle(title)}
          onChange={(event) => {
            setSlug(event.target.value);
          }}
        />
      </Label>
      <p className="admin-hint">{problem ?? `Will be created at ${path} as a draft.`}</p>
      <div className="admin-actions">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            onCancel();
          }}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={problem !== null}>
          Create draft
        </Button>
      </div>
    </form>
  );
}

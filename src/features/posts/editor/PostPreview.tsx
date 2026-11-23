import { useRenderedPreview } from './use-rendered-preview';

interface PostPreviewProps {
  title: string;
  markdown: string;
}

export function PostPreview({ title, markdown }: PostPreviewProps) {
  const preview = useRenderedPreview(markdown);

  return (
    <section className="post-editor-preview" aria-label="Preview" data-preview-state={preview.kind}>
      <article className="post-article prose prose-lg">
        <h1 className="post-editor-preview-title">{title || 'Untitled'}</h1>
        {preview.kind === 'failed' && (
          <p className="post-editor-error" role="alert">
            {preview.message}
          </p>
        )}
        {preview.kind === 'rendered' && (
          // eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml -- External: the preview must show the admin's own post HTML exactly as the published page renders it.
          <div dangerouslySetInnerHTML={{ __html: preview.html }} />
        )}
      </article>
    </section>
  );
}

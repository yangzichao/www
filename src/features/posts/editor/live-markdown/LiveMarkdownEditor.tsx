import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createLiveMarkdownExtensions } from './create-live-markdown-extensions';
import './live-markdown-editor.css';

interface LiveMarkdownEditorProps {
  markdown: string;
  onMarkdownChange: (markdown: string) => void;
  accessibleLabel: string;
  placeholderText: string;
}

function replaceDocumentIfDifferent(view: EditorView, markdown: string): void {
  if (view.state.doc.toString() === markdown) return;
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: markdown } });
}

export function LiveMarkdownEditor({
  markdown,
  onMarkdownChange,
  accessibleLabel,
  placeholderText,
}: LiveMarkdownEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onMarkdownChangeRef = useRef(onMarkdownChange);
  const [initialMarkdown] = useState(markdown);

  useLayoutEffect(() => {
    onMarkdownChangeRef.current = onMarkdownChange;
  }, [onMarkdownChange]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const createdView = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: initialMarkdown,
        extensions: createLiveMarkdownExtensions({
          accessibleLabel,
          placeholderText,
          onDocumentChange: (changedMarkdown) => {
            onMarkdownChangeRef.current(changedMarkdown);
          },
        }),
      }),
    });
    viewRef.current = createdView;
    return () => {
      createdView.destroy();
      viewRef.current = null;
    };
  }, [initialMarkdown, accessibleLabel, placeholderText]);

  useEffect(() => {
    if (viewRef.current) replaceDocumentIfDifferent(viewRef.current, markdown);
  }, [markdown]);

  return <div className="live-markdown-editor post-article" ref={hostRef} />;
}

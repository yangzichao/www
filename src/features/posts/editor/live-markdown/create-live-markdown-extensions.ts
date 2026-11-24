import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { type Extension, Prec } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { toggleInlineMarkup } from './editing/toggle-inline-markup';
import { livePreviewField } from './preview/live-preview-field';
import { liveMarkdownHighlighting } from './syntax/live-markdown-highlighter';
import { mathMarkdownSyntax } from './syntax/math-markdown-syntax';

export interface LiveMarkdownOptions {
  accessibleLabel: string;
  placeholderText: string;
  onDocumentChange: (markdown: string) => void;
}

const formattingKeymap = Prec.high(
  keymap.of([
    { key: 'Mod-b', run: toggleInlineMarkup('**') },
    { key: 'Mod-i', run: toggleInlineMarkup('*') },
  ]),
);

export function createLiveMarkdownExtensions(options: LiveMarkdownOptions): Extension[] {
  return [
    history(),
    formattingKeymap,
    keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
    markdown({ base: markdownLanguage, extensions: [mathMarkdownSyntax] }),
    liveMarkdownHighlighting,
    livePreviewField,
    EditorView.lineWrapping,
    placeholder(options.placeholderText),
    EditorView.contentAttributes.of({ 'aria-label': options.accessibleLabel, spellcheck: 'true' }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) options.onDocumentChange(update.state.doc.toString());
    }),
  ];
}

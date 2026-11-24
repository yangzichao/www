import { syntaxHighlighting } from '@codemirror/language';
import { tagHighlighter, tags } from '@lezer/highlight';
import { MATH_SOURCE_TAG } from './math-markdown-syntax';

const liveMarkdownTagHighlighter = tagHighlighter([
  { tag: tags.strong, class: 'cm-live-strong' },
  { tag: tags.emphasis, class: 'cm-live-emphasis' },
  { tag: tags.strikethrough, class: 'cm-live-strikethrough' },
  { tag: tags.link, class: 'cm-live-link' },
  { tag: tags.url, class: 'cm-live-url' },
  { tag: tags.monospace, class: 'cm-live-monospace' },
  { tag: tags.processingInstruction, class: 'cm-live-markup' },
  { tag: tags.labelName, class: 'cm-live-markup' },
  { tag: tags.quote, class: 'cm-live-quote' },
  { tag: MATH_SOURCE_TAG, class: 'cm-live-math-source' },
]);

export const liveMarkdownHighlighting = syntaxHighlighting(liveMarkdownTagHighlighter);

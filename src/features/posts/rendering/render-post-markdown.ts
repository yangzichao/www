import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkSmartypants from 'remark-smartypants';
import { unified } from 'unified';
import { remarkWhiteboardDiagrams } from '../../../markdown/whiteboard/remark-whiteboard-diagrams';
import { loadCodeHighlighter } from './code-highlighter';
import type { PostHeading } from './post-heading';
import { rehypeCollectHeadings } from './rehype-collect-headings';
import { rehypeHighlightCode } from './rehype-highlight-code';

export interface RenderedPost {
  html: string;
  headings: PostHeading[];
}

export async function renderPostMarkdown(markdown: string): Promise<RenderedPost> {
  const headings: PostHeading[] = [];
  const highlighter = await loadCodeHighlighter();
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkSmartypants)
    .use(remarkMath)
    .use(remarkWhiteboardDiagrams)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeKatex)
    .use(rehypeHighlightCode(highlighter))
    .use(rehypeCollectHeadings(headings))
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);
  return { html: String(file), headings };
}

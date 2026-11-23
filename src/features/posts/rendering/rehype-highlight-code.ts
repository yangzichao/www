import type { HighlighterCore } from 'shiki/core';
import type { Element, ElementContent, Root, RootContent } from 'hast';
import { hastTextContent } from './hast-text-content';
import { CODE_THEME, resolveCodeLanguage } from './code-highlighter';

const LANGUAGE_CLASS_PREFIX = 'language-';

function codeChildOf(pre: Element): Element | null {
  const [onlyChild] = pre.children.filter((child) => child.type === 'element');
  return onlyChild?.tagName === 'code' ? onlyChild : null;
}

function requestedLanguageOf(code: Element): string | null {
  const classNames = code.properties.className;
  if (!Array.isArray(classNames)) return null;
  const languageClass = classNames.find(
    (className): className is string => typeof className === 'string' && className.startsWith(LANGUAGE_CLASS_PREFIX),
  );
  return languageClass ? languageClass.slice(LANGUAGE_CLASS_PREFIX.length) : null;
}

function highlightedPre(highlighter: HighlighterCore, pre: Element): Element | null {
  const code = codeChildOf(pre);
  if (!code) return null;
  const language = resolveCodeLanguage(highlighter, requestedLanguageOf(code));
  const source = hastTextContent(code).replace(/\n$/, '');
  const highlighted = highlighter.codeToHast(source, { lang: language, theme: CODE_THEME });
  const [highlightedRoot] = highlighted.children;
  if (highlightedRoot?.type !== 'element') return null;
  highlightedRoot.properties.dataLanguage = language;
  return highlightedRoot;
}

function replacePreElements(highlighter: HighlighterCore, children: (RootContent | ElementContent)[]): void {
  children.forEach((child, index) => {
    if (child.type !== 'element') return;
    const replacement = child.tagName === 'pre' ? highlightedPre(highlighter, child) : null;
    if (replacement) children[index] = replacement;
    else replacePreElements(highlighter, child.children);
  });
}

export function rehypeHighlightCode(highlighter: HighlighterCore) {
  return () => (tree: Root) => {
    replacePreElements(highlighter, tree.children);
  };
}

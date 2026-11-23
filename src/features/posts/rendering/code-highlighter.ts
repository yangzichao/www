import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

export const CODE_THEME = 'github-light';
export const PLAIN_TEXT_LANGUAGE = 'text';

const LANGUAGE_ALIASES: Readonly<Record<string, string>> = {
  ts: 'typescript',
  sh: 'bash',
  shell: 'bash',
  py: 'python',
  yml: 'yaml',
  plaintext: PLAIN_TEXT_LANGUAGE,
  txt: PLAIN_TEXT_LANGUAGE,
};

let highlighterPromise: Promise<HighlighterCore> | null = null;

export function loadCodeHighlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= createHighlighterCore({
    themes: [import('shiki/themes/github-light.mjs')],
    langs: [
      import('shiki/langs/bash.mjs'),
      import('shiki/langs/http.mjs'),
      import('shiki/langs/java.mjs'),
      import('shiki/langs/json.mjs'),
      import('shiki/langs/python.mjs'),
      import('shiki/langs/sql.mjs'),
      import('shiki/langs/typescript.mjs'),
      import('shiki/langs/yaml.mjs'),
    ],
    engine: createJavaScriptRegexEngine(),
  });
  return highlighterPromise;
}

export function resolveCodeLanguage(highlighter: HighlighterCore, requestedLanguage: string | null): string {
  if (requestedLanguage === null) return PLAIN_TEXT_LANGUAGE;
  const normalized = requestedLanguage.toLowerCase();
  const language = LANGUAGE_ALIASES[normalized] ?? normalized;
  return highlighter.getLoadedLanguages().includes(language) ? language : PLAIN_TEXT_LANGUAGE;
}

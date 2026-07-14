import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDirectory, '..', '..');
const articleDirectory = join(projectRoot, 'src', 'content', 'blog', 'system-design');

const tutorialSlugs = [
  'ad-click-impression-tracking',
  'agent-orchestration',
  'chat-messaging',
  'feature-store',
  'file-sync',
  'fraud-detection',
  'google-docs',
  'kv-store',
  'leetcode-online-judge',
  'llm-inference',
  'llm-training-infra',
  'ml-training-pipeline',
  'model-serving',
  'news-feed',
  'notification-system',
  'payment-ledger',
  'rag-system',
  'rate-limiter',
  'recommendation-system',
  'ride-sharing',
  'rlhf-pipeline',
  'search-autocomplete',
  'url-shortener',
  'video-streaming',
  'web-crawler',
];

const minimumArticleCharacters = 8_500;
const minimumCodeFences = 6;

const requiredTeachingSignals = [
  ['a concrete starting point', /先看|从一条|从第一|第一版|动手搭/],
  [
    'terminology explained in context',
    /先讲清|先把.{0,12}讲清|几个词讲清楚|为什么|常见算法/,
  ],
  ['capacity reasoning', /容量估算/],
  ['failure or recovery reasoning', /故障|恢复/],
  ['explicit trade-offs', /关键取舍|取舍（|trade-off/i],
  ['interview-ready expression', /^## .*面试/im],
  ['source references', /^## 参考/im],
];

const failures = [];
const longParagraphOwners = new Map();

function contentWithoutFrontmatter(content) {
  return content.replace(/^---\n[\s\S]*?\n---\n/, '');
}

function normalizedLongParagraphs(content) {
  const proseWithoutCode = contentWithoutFrontmatter(content).replace(
    /```[\s\S]*?```/g,
    '',
  );

  return proseWithoutCode
    .split(/\n\s*\n/)
    .map((paragraph) =>
      paragraph
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^[-*>|]\s*/gm, '')
        .replace(/\[[^\]]+\]\([^\)]+\)/g, '')
        .replace(/[`*_]/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((paragraph) => paragraph.length >= 180);
}

for (const slug of tutorialSlugs) {
  const articlePath = join(articleDirectory, `${slug}.md`);
  const content = await readFile(articlePath, 'utf8');
  const prose = contentWithoutFrontmatter(content);

  if (!/^draft: false$/m.test(content)) {
    failures.push(`${slug}: article is not published`);
  }

  if (!/https:\/\/lab\.zichaoyang\.com\/system-design\//.test(content)) {
    failures.push(`${slug}: missing its corresponding Lab link`);
  }

  if (prose.length < minimumArticleCharacters) {
    failures.push(
      `${slug}: ${prose.length} characters is below the ${minimumArticleCharacters}-character editorial floor`,
    );
  }

  const codeFenceCount = (prose.match(/```/g) ?? []).length;
  if (codeFenceCount < minimumCodeFences) {
    failures.push(
      `${slug}: only ${codeFenceCount} code fences; expected concrete examples rather than prose alone`,
    );
  }

  if (!/```mermaid/.test(prose)) {
    failures.push(`${slug}: missing an end-to-end architecture diagram`);
  }

  if (/MVP Scaffold|^## 0\./im.test(prose)) {
    failures.push(`${slug}: contains the retired batch-template heading`);
  }

  for (const [signalName, pattern] of requiredTeachingSignals) {
    if (!pattern.test(prose)) {
      failures.push(`${slug}: missing ${signalName}`);
    }
  }

  for (const paragraph of normalizedLongParagraphs(content)) {
    const previousOwner = longParagraphOwners.get(paragraph);
    if (previousOwner && previousOwner !== slug) {
      failures.push(
        `${slug}: duplicates a long prose paragraph from ${previousOwner}`,
      );
    } else {
      longParagraphOwners.set(paragraph, slug);
    }
  }
}

if (failures.length > 0) {
  console.error(
    `System-design article baseline failed (${failures.length} issue(s)):`,
  );
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    `System-design article baseline passed (${tutorialSlugs.length} articles).`,
  );
  console.log(
    'This check covers structural floors and duplicated prose; editorial quality still requires human review.',
  );
}

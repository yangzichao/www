import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

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

const requiredLayers = [
  ['requirements', /^## .*(需求边界|Requirements)/im],
  ['MVP scaffold', /^## .*(MVP|脚手架|最小可运行|能工作的版本)/im],
  ['API', /^## .*API/im],
  ['data model', /^## .*(数据模型|Data Model)/im],
  ['capacity estimation', /^## .*(容量估算|Capacity Estimation)/im],
  ['latency budget', /^## .*(Latency|延迟预算)/im],
  ['correctness and reliability', /^## .*(可靠|Correctness|Reliability|故障恢复)/im],
  ['trade-offs', /^## .*(Trade|取舍|权衡)/im],
  ['interview expression', /^## .*面试/im],
];

const failures = [];

for (const slug of tutorialSlugs) {
  const articlePath = join(articleDirectory, `${slug}.md`);
  const content = await readFile(articlePath, 'utf8');

  if (!/^draft: false$/m.test(content)) {
    failures.push(`${slug}: article is not published`);
  }

  if (!/https:\/\/lab\.zichaoyang\.com\/system-design\//.test(content)) {
    failures.push(`${slug}: missing corresponding Lab link`);
  }

  for (const [layerName, pattern] of requiredLayers) {
    if (!pattern.test(content)) {
      failures.push(`${slug}: missing ${layerName}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`System-design tutorial audit failed (${failures.length} issue(s)):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`System-design tutorial audit passed (${tutorialSlugs.length} articles).`);
}

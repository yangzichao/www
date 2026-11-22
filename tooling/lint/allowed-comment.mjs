const DIRECTIVE_PREFIXES = [
  'prettier-ignore',
  'eslint-disable',
  'eslint-enable',
  'stylelint-disable',
  'stylelint-enable',
  '@ts-expect-error',
];

const EXTERNAL_CONSTRAINT_PREFIX = 'External:';

const LICENSE_PATTERN = /\b(?:SPDX-License-Identifier|Copyright|Licensed under)\b/;

const ISSUE_OR_RFC_LINK_PATTERN =
  /https:\/\/(?:github\.com\/[\w.-]+\/[\w.-]+\/(?:issues|pull)\/\d+|www\.rfc-editor\.org\/rfc\/|datatracker\.ietf\.org\/doc\/)/;

function stripLeadingDecoration(commentText) {
  return commentText.replace(/^[\s*!]+/, '');
}

export function isAllowedComment({ text, isDocBlock, isLicenseBlock }) {
  if (isDocBlock || isLicenseBlock) return true;
  const content = stripLeadingDecoration(text);
  if (DIRECTIVE_PREFIXES.some((prefix) => content.startsWith(prefix))) return true;
  if (content.startsWith(EXTERNAL_CONSTRAINT_PREFIX)) return true;
  return LICENSE_PATTERN.test(text) || ISSUE_OR_RFC_LINK_PATTERN.test(text);
}

export const NO_COMMENTS_MESSAGE =
  'Comment not allowed by AGENTS.md. Make the code explain itself, or prefix a vendor constraint with `External:`.';

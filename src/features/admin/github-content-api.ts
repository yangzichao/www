import { base64ToUtf8, utf8ToBase64 } from '../http/base64';
import { BLOG_CONTENT_DIRECTORY, isEditablePostFilePath } from './post-file-path';
import type { PostFileContent, PostFileSummary, SavePostResponse } from './post-file-types';
import { CONTENT_BRANCH, CONTENT_REPOSITORY } from './github-repository';

const GITHUB_API_ORIGIN = 'https://api.github.com';
const GITHUB_API_USER_AGENT = 'zichaoyang.com';

export class GitHubContentError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function callGitHub<T>(accessToken: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${GITHUB_API_ORIGIN}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': GITHUB_API_USER_AGENT,
      ...(init.body ? { 'content-type': 'application/json' } : {}),
    },
  });
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new GitHubContentError(response.status, detail?.message ?? `GitHub API returned ${response.status}`);
  }
  return (await response.json()) as T;
}

function contentsPath(filePath: string): string {
  return `/repos/${CONTENT_REPOSITORY}/contents/${filePath.split('/').map(encodeURIComponent).join('/')}`;
}

export async function listPostFiles(accessToken: string): Promise<PostFileSummary[]> {
  const tree = await callGitHub<{ tree: { path: string; type: string }[] }>(
    accessToken,
    `/repos/${CONTENT_REPOSITORY}/git/trees/${CONTENT_BRANCH}?recursive=1`,
  );
  return tree.tree
    .filter((entry) => entry.type === 'blob' && isEditablePostFilePath(entry.path))
    .map((entry) => {
      const [category, fileName] = entry.path.slice(BLOG_CONTENT_DIRECTORY.length).split('/');
      return { path: entry.path, category, slug: fileName.replace(/\.md$/, '') };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
}

export async function readPostFile(accessToken: string, filePath: string): Promise<PostFileContent> {
  const file = await callGitHub<{ content: string; sha: string }>(
    accessToken,
    `${contentsPath(filePath)}?ref=${CONTENT_BRANCH}`,
  );
  return { path: filePath, content: base64ToUtf8(file.content), sha: file.sha };
}

export async function writePostFile(
  accessToken: string,
  options: { filePath: string; content: string; sha: string | null; commitMessage: string },
): Promise<SavePostResponse> {
  const result = await callGitHub<{ content: { sha: string }; commit: { sha: string; html_url: string } }>(
    accessToken,
    contentsPath(options.filePath),
    {
      method: 'PUT',
      body: JSON.stringify({
        message: options.commitMessage,
        content: utf8ToBase64(options.content),
        branch: CONTENT_BRANCH,
        ...(options.sha ? { sha: options.sha } : {}),
      }),
    },
  );
  return {
    path: options.filePath,
    sha: result.content.sha,
    commitSha: result.commit.sha,
    commitUrl: result.commit.html_url,
  };
}

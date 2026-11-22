export interface PostFileSummary {
  path: string;
  category: string;
  slug: string;
}

export interface PostFileContent {
  path: string;
  content: string;
  sha: string;
}

export interface SavePostRequest {
  path: string;
  content: string;
  sha: string | null;
  commitMessage: string;
}

export interface SavePostResponse {
  path: string;
  sha: string;
  commitSha: string;
  commitUrl: string;
}

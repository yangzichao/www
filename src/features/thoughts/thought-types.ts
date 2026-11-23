export type ThoughtTimestampPrecision = 'exact' | 'month';

export interface Thought {
  id: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt: string | null;
  timestampPrecision: ThoughtTimestampPrecision;
  isPublic: boolean;
}

export interface ThoughtSubmission {
  body: string;
  tags: string[];
  isPublic: boolean;
}

export interface ThoughtResponse {
  thought: Thought;
}

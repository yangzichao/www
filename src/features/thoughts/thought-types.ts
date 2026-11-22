export type ThoughtTimestampPrecision = 'exact' | 'month';

export interface PublicThought {
  id: string;
  body: string;
  tags: string[];
  createdAt: string;
  timestampPrecision: ThoughtTimestampPrecision;
}

export interface CreateThoughtResponse {
  thought: PublicThought;
}

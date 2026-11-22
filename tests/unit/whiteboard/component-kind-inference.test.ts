import { describe, expect, it } from 'vitest';
import { inferComponentKind, inferStorageKind } from '../../../src/markdown/whiteboard/components/infer-component-kind';
import { silhouetteFor } from '../../../src/markdown/whiteboard/components/silhouette';
import { resolveNodeKind } from '../../../src/markdown/whiteboard/flowchart/resolve-node-kind';
import { resolveParticipantKind } from '../../../src/markdown/whiteboard/sequence/resolve-participant-kind';

describe('inferComponentKind', () => {
  it.each([
    ['CloudFront CDN', 'cdn'],
    ['Load balancer', 'lb'],
    ['API Gateway', 'api'],
    ['接入层', 'api'],
    ['Redis cache', 'cache'],
    ['Elasticsearch', 'search'],
    ['Researcher agent', 'process'],
    ['S3 bucket', 'objectstore'],
    ['DynamoDB', 'nosql'],
    ['Kafka topics', 'stream'],
    ['Job queue', 'queue'],
    ['Cron scheduler', 'scheduler'],
    ['Prefill GPUs', 'gpu'],
    ['Code sandbox', 'container'],
    ['Worker pool', 'compute'],
    ['Stripe', 'external'],
    ['Postgres primary', 'db'],
    ['Primary shard', 'db'],
    ['Feed service', 'service'],
    ['Mobile clients', 'client'],
    ['用户', 'client'],
    ['Planner', 'process'],
  ])('%s → %s', (label, kind) => {
    expect(inferComponentKind(label)).toBe(kind);
  });
});

describe('inferStorageKind', () => {
  it.each([
    ['Session cache', 'cache'],
    ['Search index', 'search'],
    ['Blob storage', 'objectstore'],
    ['Cassandra', 'nosql'],
    ['Partitioned event log', 'stream'],
    ['Task queue', 'queue'],
    ['Orders', 'db'],
  ])('%s → %s', (label, kind) => {
    expect(inferStorageKind(label)).toBe(kind);
  });
});

describe('kind resolution', () => {
  const node = {
    id: 'N',
    groupId: null,
    kindHint: null,
    shape: 'rectangle' as const,
    labelLines: ['Engine', 'shard by symbol'],
  };

  it('reads the kind from the title line only', () => {
    expect(resolveNodeKind(node)).toBe('process');
    expect(resolveNodeKind({ ...node, labelLines: [] })).toBe('process');
  });

  it('prefers a valid :::kind hint and ignores an unknown one', () => {
    expect(resolveNodeKind({ ...node, kindHint: 'gpu' })).toBe('gpu');
    expect(resolveNodeKind({ ...node, kindHint: 'spaceship' })).toBe('process');
  });

  it('treats cylinders as storage', () => {
    expect(resolveNodeKind({ ...node, shape: 'cylinder', labelLines: ['Orders'] })).toBe('db');
  });

  it('resolves sequence participants the same way', () => {
    expect(resolveParticipantKind({ id: 'P', labelLines: ['PostgreSQL'], kindHint: null })).toBe('db');
    expect(resolveParticipantKind({ id: 'P', labelLines: [], kindHint: null })).toBe('process');
    expect(resolveParticipantKind({ id: 'P', labelLines: ['x'], kindHint: 'cache' })).toBe('cache');
  });

  it('lets the kind pick the silhouette before the authored shape', () => {
    expect(silhouetteFor('db', 'rectangle')).toBe('cylinder');
    expect(silhouetteFor('process', 'hexagon')).toBe('hexagon');
  });
});

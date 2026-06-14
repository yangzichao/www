import { googleDocsLabDefinition } from './labs/google-docs-lab';
import { onlineJudgeLabDefinition } from './labs/online-judge-lab';
import { rateLimiterLabDefinition } from './labs/rate-limiter-lab';
import type { SystemDesignLabDefinition } from './lab-types';

export const systemDesignLabDefinitions = [
  googleDocsLabDefinition,
  onlineJudgeLabDefinition,
  rateLimiterLabDefinition,
];

export const systemDesignLabDefinitionsById: Record<string, SystemDesignLabDefinition> =
  Object.fromEntries(systemDesignLabDefinitions.map((definition) => [definition.id, definition]));

import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { join } from 'path';
import { thoughtsLoader } from './loaders/thoughts-loader';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    draft: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    venue: z.string().optional(),
  }),
});

const thoughts = defineCollection({
  loader: thoughtsLoader(join(process.cwd(), 'src/content/thoughts')),
  schema: z.object({
    date: z.date(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { blog, thoughts };

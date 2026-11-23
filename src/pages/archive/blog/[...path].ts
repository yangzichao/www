import type { APIRoute } from 'astro';
import { BLOG_BASE_PATH, postUrl } from '../../../features/posts/post-path';

export const prerender = false;

const PERMANENT_REDIRECT_STATUS = 301;

export const GET: APIRoute = ({ params, redirect }) =>
  redirect(params.path ? postUrl(params.path) : BLOG_BASE_PATH, PERMANENT_REDIRECT_STATUS);

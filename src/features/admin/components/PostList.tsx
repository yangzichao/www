import { Button } from '@/components/ui/button';
import type { PostFileSummary } from '../post-file-types';

interface PostListProps {
  posts: PostFileSummary[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

function groupPostsByCategory(posts: PostFileSummary[]): [string, PostFileSummary[]][] {
  const groups = new Map<string, PostFileSummary[]>();
  for (const post of posts) groups.set(post.category, [...(groups.get(post.category) ?? []), post]);
  return [...groups.entries()];
}

export function PostList({ posts, selectedPath, onSelect }: PostListProps) {
  return (
    <nav className="admin-post-list" aria-label="Posts">
      {groupPostsByCategory(posts).map(([category, categoryPosts]) => (
        <section key={category}>
          <h3 className="admin-post-category">{category}</h3>
          <ul>
            {categoryPosts.map((post) => (
              <li key={post.path}>
                <Button
                  type="button"
                  variant="ghost"
                  className={post.path === selectedPath ? 'admin-post-link is-selected' : 'admin-post-link'}
                  onClick={() => {
                    onSelect(post.path);
                  }}
                >
                  {post.slug}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}

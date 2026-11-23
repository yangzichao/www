import { Card } from '@/components/ui/card';
import './post-pager-link.css';

type PagerDirection = 'newer' | 'older';

interface PostPagerLinkProps {
  href: string;
  direction: PagerDirection;
  categoryName: string;
  postTitle: string;
}

function directionLabel(direction: PagerDirection, categoryName: string): string {
  return direction === 'newer' ? `← Newer in ${categoryName}` : `Older in ${categoryName} →`;
}

export default function PostPagerLink({ href, direction, categoryName, postTitle }: PostPagerLinkProps) {
  return (
    <Card asChild className={`post-pager-link post-pager-${direction} text-[length:inherit] leading-[inherit] ring-0`}>
      <a href={href}>
        <span className="post-pager-direction">{directionLabel(direction, categoryName)}</span>
        <span className="post-pager-title">{postTitle}</span>
      </a>
    </Card>
  );
}

import { Card, CardContent, CardDescription } from '@/components/ui/card';
import type { WorkItem } from '@/data/site';

interface WorkCardProps {
  item: WorkItem;
}

export default function WorkCard({ item }: WorkCardProps) {
  const contentClass = item.image ? 'work-card-content' : 'work-card-content-only';
  return (
    <Card asChild className="work-card gap-0 text-[length:inherit] leading-[inherit] ring-0">
      <a href={item.url} data-tilt="">
        {item.image && (
          <div className="work-card-image-container">
            <img
              src={item.image}
              className="work-card-image"
              style={item.imageFit ? { objectFit: item.imageFit } : undefined}
              loading="lazy"
              alt={item.imageAlt ?? item.title}
            />
          </div>
        )}
        <CardContent className={contentClass}>
          <span className="work-card-type">{item.type}</span>
          <h3 className="work-card-title">{item.title}</h3>
          <CardDescription className="work-card-description">{item.description}</CardDescription>
        </CardContent>
      </a>
    </Card>
  );
}

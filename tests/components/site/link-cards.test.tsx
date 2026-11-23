import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WorkCard from '../../../src/components/WorkCard';
import PostPagerLink from '../../../src/components/blog/post-pager/PostPagerLink';

describe('WorkCard', () => {
  it('links an item with its image, falling back to the title for alt text', () => {
    render(
      <WorkCard
        item={{
          type: 'Paper',
          year: '2024',
          title: 'Proton emission',
          description: 'EFT analysis.',
          image: '/images/paper.png',
          imageFit: 'contain',
          url: 'https://example.test/paper',
        }}
      />,
    );

    expect(screen.getByRole('link', { name: /Proton emission/ })).toHaveAttribute('href', 'https://example.test/paper');
    expect(screen.getByRole('img', { name: 'Proton emission' })).toHaveStyle({ objectFit: 'contain' });
  });

  it('renders a text-only card without an image', () => {
    render(
      <WorkCard
        item={{ type: 'Project', year: '2025', title: 'Lab', description: 'Tools.', url: 'https://lab.test/' }}
      />,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Tools.')).toBeInTheDocument();
  });
});

describe('PostPagerLink', () => {
  it.each([
    ['newer', '← Newer in Physics'],
    ['older', 'Older in Physics →'],
  ] as const)('labels the %s link', (direction, label) => {
    render(<PostPagerLink href="/blog/physics/a/" direction={direction} categoryName="Physics" postTitle="A" />);

    expect(screen.getByRole('link', { name: `${label} A` })).toHaveAttribute('href', '/blog/physics/a/');
  });
});

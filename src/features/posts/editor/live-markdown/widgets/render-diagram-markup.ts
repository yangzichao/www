const renderedMarkupBySource = new Map<string, Promise<string>>();

async function renderFreshDiagramMarkup(diagramSource: string): Promise<string> {
  const [{ renderDiagramSource }, { stableHash }] = await Promise.all([
    import('../../../../../markdown/whiteboard/render-diagram-source'),
    import('../../../../../markdown/whiteboard/svg-markup'),
  ]);
  return renderDiagramSource(diagramSource, `live-${stableHash(diagramSource).toString(36)}`);
}

export function renderDiagramMarkup(diagramSource: string): Promise<string> {
  const cached = renderedMarkupBySource.get(diagramSource);
  if (cached) return cached;
  const rendering = renderFreshDiagramMarkup(diagramSource);
  renderedMarkupBySource.set(diagramSource, rendering);
  rendering.catch(() => renderedMarkupBySource.delete(diagramSource));
  return rendering;
}

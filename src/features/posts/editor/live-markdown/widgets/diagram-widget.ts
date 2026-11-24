import { type EditorView, WidgetType } from '@codemirror/view';
import { describeError } from '../../../../http/describe-error';
import { renderDiagramMarkup } from './render-diagram-markup';

export class DiagramWidget extends WidgetType {
  constructor(readonly diagramSource: string) {
    super();
  }

  override eq(other: DiagramWidget): boolean {
    return other.diagramSource === this.diagramSource;
  }

  override toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('div');
    container.className = 'cm-live-diagram';
    container.dataset.diagramState = 'rendering';
    container.textContent = 'Rendering diagram…';
    renderDiagramMarkup(this.diagramSource)
      .then((markup) => {
        container.dataset.diagramState = 'rendered';
        container.innerHTML = markup;
      })
      .catch((error: unknown) => {
        container.dataset.diagramState = 'failed';
        container.textContent = describeError(error, 'Could not render this diagram.');
      })
      .finally(() => {
        view.requestMeasure();
      });
    return container;
  }

  override ignoreEvent(): boolean {
    return false;
  }
}

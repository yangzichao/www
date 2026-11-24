import { WidgetType } from '@codemirror/view';
import katex from 'katex';

export type MathDisplay = 'inline' | 'block';

export class MathWidget extends WidgetType {
  constructor(
    readonly texSource: string,
    readonly display: MathDisplay,
  ) {
    super();
  }

  override eq(other: MathWidget): boolean {
    return other.texSource === this.texSource && other.display === this.display;
  }

  override toDOM(): HTMLElement {
    const container = document.createElement(this.display === 'block' ? 'div' : 'span');
    container.className = `cm-live-math cm-live-math-${this.display}`;
    container.innerHTML = katex.renderToString(this.texSource, {
      displayMode: this.display === 'block',
      throwOnError: false,
    });
    return container;
  }

  override ignoreEvent(): boolean {
    return false;
  }
}

import { type EditorView, WidgetType } from '@codemirror/view';

export class ImageWidget extends WidgetType {
  constructor(
    readonly imageUrl: string,
    readonly altText: string,
  ) {
    super();
  }

  override eq(other: ImageWidget): boolean {
    return other.imageUrl === this.imageUrl && other.altText === this.altText;
  }

  override toDOM(view: EditorView): HTMLElement {
    const image = document.createElement('img');
    image.className = 'cm-live-image';
    image.src = this.imageUrl;
    image.alt = this.altText;
    image.addEventListener('load', () => {
      view.requestMeasure();
    });
    return image;
  }

  override ignoreEvent(): boolean {
    return false;
  }
}

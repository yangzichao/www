import { WidgetType } from '@codemirror/view';

export class TextSymbolWidget extends WidgetType {
  constructor(
    readonly symbol: string,
    readonly className: string,
  ) {
    super();
  }

  override eq(other: TextSymbolWidget): boolean {
    return other.symbol === this.symbol && other.className === this.className;
  }

  override toDOM(): HTMLElement {
    const element = document.createElement('span');
    element.className = this.className;
    element.textContent = this.symbol;
    return element;
  }

  override ignoreEvent(): boolean {
    return false;
  }
}

export const BULLET_WIDGET = new TextSymbolWidget('•', 'cm-live-bullet');
export const HORIZONTAL_RULE_WIDGET = new TextSymbolWidget('', 'cm-live-horizontal-rule');

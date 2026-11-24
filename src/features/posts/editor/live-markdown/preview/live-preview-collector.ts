import type { EditorState, Range } from '@codemirror/state';
import { Decoration, type DecorationSet, type WidgetType } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';

const HIDDEN_MARKUP = Decoration.replace({});

export class LivePreviewCollector {
  private readonly ranges: Range<Decoration>[] = [];

  constructor(readonly state: EditorState) {}

  selectionTouches(from: number, to: number): boolean {
    return this.state.selection.ranges.some((range) => range.from <= to && range.to >= from);
  }

  selectionTouchesLines(from: number, to: number): boolean {
    return this.selectionTouches(this.state.doc.lineAt(from).from, this.state.doc.lineAt(to).to);
  }

  textOf(node: SyntaxNode): string {
    return this.state.doc.sliceString(node.from, node.to);
  }

  characterAt(position: number): string {
    return this.state.doc.sliceString(position, position + 1);
  }

  hide(from: number, to: number): void {
    if (to > from) this.ranges.push(HIDDEN_MARKUP.range(from, to));
  }

  hideChildren(node: SyntaxNode, childNames: ReadonlySet<string>): void {
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (childNames.has(child.name)) this.hide(child.from, child.to);
    }
  }

  markText(from: number, to: number, className: string): void {
    if (to > from) this.ranges.push(Decoration.mark({ class: className }).range(from, to));
  }

  replaceInline(from: number, to: number, widget: WidgetType): void {
    this.ranges.push(Decoration.replace({ widget }).range(from, to));
  }

  replaceWholeLines(from: number, to: number, widget: WidgetType): void {
    const firstLine = this.state.doc.lineAt(from);
    const lastLine = this.state.doc.lineAt(to);
    this.ranges.push(Decoration.replace({ widget, block: true }).range(firstLine.from, lastLine.to));
  }

  addLineClass(from: number, to: number, className: string): void {
    const lastLineNumber = this.state.doc.lineAt(to).number;
    for (let lineNumber = this.state.doc.lineAt(from).number; lineNumber <= lastLineNumber; lineNumber++) {
      const line = this.state.doc.line(lineNumber);
      this.ranges.push(Decoration.line({ class: className }).range(line.from));
    }
  }

  toDecorationSet(): DecorationSet {
    return Decoration.set(this.ranges, true);
  }
}

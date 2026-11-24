import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { EditorSelection, EditorState } from '@codemirror/state';
import type { Decoration } from '@codemirror/view';
import { livePreviewField } from '../../../../../src/features/posts/editor/live-markdown/preview/live-preview-field';
import { mathMarkdownSyntax } from '../../../../../src/features/posts/editor/live-markdown/syntax/math-markdown-syntax';
import { DiagramWidget } from '../../../../../src/features/posts/editor/live-markdown/widgets/diagram-widget';
import { ImageWidget } from '../../../../../src/features/posts/editor/live-markdown/widgets/image-widget';
import { MathWidget } from '../../../../../src/features/posts/editor/live-markdown/widgets/math-widget';
import { TextSymbolWidget } from '../../../../../src/features/posts/editor/live-markdown/widgets/text-symbol-widget';

export const CURSOR_MARKER = '|';

function cursorPositionsIn(markdownWithCursors: string): number[] {
  const segments = markdownWithCursors.split(CURSOR_MARKER);
  return segments.slice(0, -1).map((_, index) => segments.slice(0, index + 1).join('').length);
}

export function createLivePreviewState(markdownWithCursors: string): EditorState {
  const doc = markdownWithCursors.replaceAll(CURSOR_MARKER, '');
  const cursorPositions = cursorPositionsIn(markdownWithCursors);
  const cursors = (cursorPositions.length > 0 ? cursorPositions : [doc.length]).map((position) =>
    EditorSelection.cursor(position),
  );
  return EditorState.create({
    doc,
    selection: EditorSelection.create(cursors),
    extensions: [
      EditorState.allowMultipleSelections.of(true),
      markdown({ base: markdownLanguage, extensions: [mathMarkdownSyntax] }),
      livePreviewField,
    ],
  });
}

function describeWidget(widget: unknown): string {
  if (widget instanceof MathWidget) return `math(${widget.display}) ${widget.texSource}`;
  if (widget instanceof DiagramWidget) return `diagram ${JSON.stringify(widget.diagramSource)}`;
  if (widget instanceof ImageWidget) return `image ${widget.imageUrl} alt=${widget.altText}`;
  if (widget instanceof TextSymbolWidget) return `symbol .${widget.className}`;
  return 'unknown widget';
}

function describeDecoration(state: EditorState, from: number, to: number, decoration: Decoration): string {
  const spec = decoration.spec as { class?: string; widget?: unknown; block?: boolean };
  const text = JSON.stringify(state.doc.sliceString(from, to));
  if (spec.widget) return `${spec.block ? 'block ' : ''}${describeWidget(spec.widget)} over ${text}`;
  if (from === to) return `line ${state.doc.lineAt(from).number} .${spec.class ?? ''}`;
  if (spec.class) return `mark ${text} .${spec.class}`;
  return `hide ${text}`;
}

export function describeLivePreview(state: EditorState): string[] {
  const descriptions: string[] = [];
  state.field(livePreviewField).between(0, state.doc.length, (from, to, decoration) => {
    descriptions.push(describeDecoration(state, from, to, decoration));
  });
  return descriptions;
}

export function describeLivePreviewOf(markdownWithCursors: string): string[] {
  return describeLivePreview(createLivePreviewState(markdownWithCursors));
}

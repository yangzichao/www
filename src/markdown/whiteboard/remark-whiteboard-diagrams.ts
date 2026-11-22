import type { Code, Html, Nodes, Parent, Root } from 'mdast';
import { DiagramSyntaxError } from './diagram-syntax-error.ts';
import { renderDiagramSource } from './render-diagram-source.ts';
import { stableHash } from './svg-markup.ts';

const DIAGRAM_FENCE_LANGUAGE = 'mermaid';

interface MarkdownFile {
  path?: string;
}

interface DiagramSlot {
  parent: Parent;
  index: number;
  code: Code;
}

function isParent(node: Nodes): node is Nodes & Parent {
  return 'children' in node;
}

function collectDiagramSlots(node: Nodes, slots: DiagramSlot[]): DiagramSlot[] {
  if (!isParent(node)) return slots;
  node.children.forEach((child, index) => {
    if (child.type === 'code' && child.lang === DIAGRAM_FENCE_LANGUAGE)
      slots.push({ parent: node, index, code: child });
    else collectDiagramSlots(child, slots);
  });
  return slots;
}

function locatedError(error: unknown, code: Code, file: MarkdownFile): Error {
  const fenceLine = code.position?.start.line;
  const where = file.path ?? 'markdown';
  if (error instanceof DiagramSyntaxError && fenceLine !== undefined) {
    return new Error(`${where}:${fenceLine + error.lineNumber}: ${error.reason}`, { cause: error });
  }
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`${where}${fenceLine === undefined ? '' : `:${fenceLine}`}: ${message}`, { cause: error });
}

export function remarkWhiteboardDiagrams() {
  return async (tree: Root, file: MarkdownFile): Promise<void> => {
    const slots = collectDiagramSlots(tree, []);
    for (const [order, slot] of slots.entries()) {
      const diagramId = `wb-${stableHash(slot.code.value).toString(36)}-${order}`;
      let markup: string;
      try {
        markup = await renderDiagramSource(slot.code.value, diagramId);
      } catch (error) {
        throw locatedError(error, slot.code, file);
      }
      const replacement: Html = { type: 'html', value: markup };
      slot.parent.children[slot.index] = replacement;
    }
  };
}

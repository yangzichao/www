import type { DiagramDocument, DiagramElement } from '../diagram-types';

/** Download the diagram as a JSON file that `openDiagramJsonFile` can re-import. */
export function downloadDiagramAsJson(elements: DiagramElement[]): void {
  const document_: DiagramDocument = { elements };
  const blob = new Blob([JSON.stringify(document_, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'feynman-diagram.json';
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Open a file picker and parse the chosen diagram JSON. */
export function openDiagramJsonFile(onLoaded: (elements: DiagramElement[]) => void): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as DiagramDocument;
      if (!Array.isArray(parsed.elements)) throw new Error('missing elements array');
      onLoaded(parsed.elements);
    } catch {
      window.alert('Could not read that file — expected JSON saved by this editor.');
    }
  });
  input.click();
}

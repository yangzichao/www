import type { DiagramElement } from '../diagram-types';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../diagram-types';
import { buildPresentationSvgMarkup } from './svg-exporter';

const PNG_SCALE = 2;

/**
 * Rasterize the presentation SVG through an offscreen <canvas> at 2x and
 * download it. Labels are plain text here (KaTeX HTML can't be rasterized
 * from an SVG image), so the LaTeX export stays the source of truth.
 */
export function downloadDiagramAsPng(elements: DiagramElement[]): void {
  const markup = buildPresentationSvgMarkup(elements);
  const svgBlob = new Blob([markup], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(svgBlob);

  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH * PNG_SCALE;
    canvas.height = CANVAS_HEIGHT * PNG_SCALE;
    const context = canvas.getContext('2d');
    if (!context) {
      URL.revokeObjectURL(url);
      return;
    }
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    canvas.toBlob((pngBlob) => {
      if (!pngBlob) return;
      const pngUrl = URL.createObjectURL(pngBlob);
      const anchor = document.createElement('a');
      anchor.href = pngUrl;
      anchor.download = 'feynman-diagram.png';
      anchor.click();
      URL.revokeObjectURL(pngUrl);
    }, 'image/png');
  };
  image.onerror = () => URL.revokeObjectURL(url);
  image.src = url;
}

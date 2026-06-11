/**
 * Label typesetting via MathJax's TeX → SVG pipeline.
 *
 * MathJax (unlike KaTeX) emits self-contained SVG with glyphs as inline
 * paths, so the exact same node works on the interactive canvas, in the
 * downloaded SVG, and when rasterizing to PNG — no HTML foreignObject,
 * no external fonts.
 *
 * The bundle is large, so it loads lazily; labels fall back to plain
 * <text> until `ensureMathJaxLoaded`'s callback fires.
 */

// MathJax sizes its SVG in ex units; this factor yields ~15px math.
const PIXELS_PER_EX = 7.5;

type TexToSvgConverter = (tex: string) => SVGSVGElement;

let convertTexToSvg: TexToSvgConverter | null = null;
let loadStarted = false;
const renderedNodeCache = new Map<string, SVGSVGElement>();

export function ensureMathJaxLoaded(onReady: () => void): void {
  if (convertTexToSvg || loadStarted) return;
  loadStarted = true;
  Promise.all([
    import('mathjax-full/js/mathjax.js'),
    import('mathjax-full/js/input/tex.js'),
    import('mathjax-full/js/output/svg.js'),
    import('mathjax-full/js/adaptors/browserAdaptor.js'),
    import('mathjax-full/js/handlers/html.js'),
    import('mathjax-full/js/input/tex/AllPackages.js'),
  ]).then(([{ mathjax }, { TeX }, { SVG }, { browserAdaptor }, { RegisterHTMLHandler }, { AllPackages }]) => {
    RegisterHTMLHandler(browserAdaptor());
    const document = mathjax.document('', {
      InputJax: new TeX({ packages: AllPackages }),
      // fontCache 'none' inlines every glyph path into each expression,
      // keeping serialized labels self-contained for export.
      OutputJax: new SVG({ fontCache: 'none' }),
    });
    convertTexToSvg = (tex: string) => {
      const container = document.convert(tex, { display: false }) as HTMLElement;
      const svg = container.querySelector('svg');
      if (!svg) throw new Error('MathJax produced no SVG');
      return svg as SVGSVGElement;
    };
    onReady();
  });
}

/**
 * Typeset a label and return a positioned <svg> node centered on (x, y),
 * or null while MathJax is still loading / if the TeX is invalid.
 * Plain-text runs outside $...$ are wrapped in \text{}.
 */
export function typesetLabel(text: string, x: number, y: number): SVGSVGElement | null {
  if (!convertTexToSvg) return null;

  let template = renderedNodeCache.get(text);
  if (!template) {
    try {
      template = convertTexToSvg(labelTextToTex(text));
    } catch {
      return null;
    }
    renderedNodeCache.set(text, template);
  }

  const node = template.cloneNode(true) as SVGSVGElement;
  const width = exToPixels(node.getAttribute('width'));
  const height = exToPixels(node.getAttribute('height'));
  node.setAttribute('width', String(width));
  node.setAttribute('height', String(height));
  node.setAttribute('x', String(x - width / 2));
  node.setAttribute('y', String(y - height / 2));
  node.removeAttribute('style');
  return node;
}

function exToPixels(exValue: string | null): number {
  return (parseFloat(exValue ?? '1') || 1) * PIXELS_PER_EX;
}

/** "decay $e^-$" → "\text{decay }e^-"; a label that is all math stays as-is. */
function labelTextToTex(text: string): string {
  const parts: string[] = [];
  const pattern = /\$([^$]+)\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(plainTextToTex(text.slice(lastIndex, match.index)));
    parts.push(match[1]);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(plainTextToTex(text.slice(lastIndex)));
  return parts.join('');
}

function plainTextToTex(text: string): string {
  const escaped = text.replace(/[\\{}%&#_~^$]/g, (char) => {
    switch (char) {
      case '\\':
        return '\\textbackslash ';
      case '~':
        return '\\textasciitilde ';
      case '^':
        return '\\textasciicircum ';
      default:
        return `\\${char}`;
    }
  });
  return `\\text{${escaped}}`;
}

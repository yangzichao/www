import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { openSync } from 'fontkit';

const FONT_PATH = fileURLToPath(new URL('../../public/fonts/Virgil.woff2', import.meta.url));
const OUTPUT_PATH = fileURLToPath(
  new URL('../../src/markdown/whiteboard/text/virgil-advance-widths.generated.ts', import.meta.url),
);

const font = openSync(FONT_PATH);
if (!('unitsPerEm' in font)) throw new Error('Virgil.woff2 must contain a single font');

const advanceWidthPairs = font.characterSet
  .toSorted((left, right) => left - right)
  .map((codePoint) => `[${codePoint},${font.glyphForCodePoint(codePoint).advanceWidth}]`);

writeFileSync(
  OUTPUT_PATH,
  [
    `export const VIRGIL_UNITS_PER_EM = ${font.unitsPerEm};`,
    '',
    '// prettier-ignore',
    `export const VIRGIL_ADVANCE_WIDTHS: ReadonlyMap<number, number> = new Map([${advanceWidthPairs.join(',')}]);`,
    '',
  ].join('\n'),
);

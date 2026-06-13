import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  degreesToRadians,
  formatCompact,
  formatFixed,
} from './simulation-types';
import type { Point, SimulationController } from './simulation-types';
import {
  forEachRangeControl,
  getCanvasContext,
  getRangeValue,
  setText,
  updateButtonState,
} from './dom-helpers';

type WaveParameters = {
  wavelength: number;
  sourceSeparation: number;
  phaseOffset: number;
  falloff: number;
};

const renderWidth = 300;
const renderHeight = Math.round((renderWidth * CANVAS_HEIGHT) / CANVAS_WIDTH);
const center = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };

export function createWaveInterference(rootElement: HTMLElement): SimulationController | null {
  const canvas = rootElement.querySelector<HTMLCanvasElement>('[data-wave-canvas]');
  if (!canvas) {
    return null;
  }

  const context = getCanvasContext(canvas);
  const fieldCanvas = document.createElement('canvas');
  fieldCanvas.width = renderWidth;
  fieldCanvas.height = renderHeight;
  const fieldContext = getCanvasContext(fieldCanvas);
  if (!context || !fieldContext) {
    return null;
  }

  const toggleButton = rootElement.querySelector<HTMLButtonElement>('[data-wave-action="toggle"]');
  const resetButton = rootElement.querySelector<HTMLButtonElement>('[data-wave-action="reset"]');

  let running = true;
  let animationFrameId: number | null = null;
  let lastFrameTimestamp = 0;
  let phaseTime = 0;
  let samplePoint: Point = { x: CANVAS_WIDTH * 0.68, y: CANVAS_HEIGHT * 0.5 };

  const render = (): void => {
    drawWaveInterference(context, fieldContext, rootElement, phaseTime, samplePoint);
  };

  const frame = (timestamp: number): void => {
    if (!running) {
      animationFrameId = null;
      return;
    }

    const deltaSeconds =
      lastFrameTimestamp === 0 ? 1 / 60 : Math.min((timestamp - lastFrameTimestamp) / 1000, 0.05);
    lastFrameTimestamp = timestamp;
    phaseTime += deltaSeconds * 4.2;
    render();
    animationFrameId = window.requestAnimationFrame(frame);
  };

  const start = (): void => {
    running = true;
    updateButtonState(toggleButton, running);
    if (animationFrameId === null) {
      lastFrameTimestamp = 0;
      animationFrameId = window.requestAnimationFrame(frame);
    }
  };

  const stop = (): void => {
    running = false;
    updateButtonState(toggleButton, running);
    if (animationFrameId !== null) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  toggleButton?.addEventListener('click', () => {
    if (running) {
      stop();
    } else {
      start();
    }
  });
  resetButton?.addEventListener('click', () => {
    phaseTime = 0;
    render();
  });

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    samplePoint = {
      x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
    render();
  });

  forEachRangeControl(rootElement, '[data-wave-control]', (inputElement) => {
    inputElement.addEventListener('input', render);
  });

  render();
  return { start, stop, render };
}

function readWaveParameters(rootElement: HTMLElement): WaveParameters {
  return {
    wavelength: getRangeValue(rootElement, '[data-wave-control="wavelength"]', 48),
    sourceSeparation: getRangeValue(rootElement, '[data-wave-control="sourceSeparation"]', 160),
    phaseOffset: degreesToRadians(getRangeValue(rootElement, '[data-wave-control="phaseOffset"]', 0)),
    falloff: getRangeValue(rootElement, '[data-wave-control="falloff"]', 0.006),
  };
}

function drawWaveInterference(
  context: CanvasRenderingContext2D,
  fieldContext: CanvasRenderingContext2D,
  rootElement: HTMLElement,
  phaseTime: number,
  samplePoint: Point,
): void {
  const parameters = readWaveParameters(rootElement);
  const sources = calculateSources(parameters);
  const imageData = fieldContext.createImageData(renderWidth, renderHeight);

  for (let y = 0; y < renderHeight; y += 1) {
    for (let x = 0; x < renderWidth; x += 1) {
      const canvasPoint = {
        x: (x / (renderWidth - 1)) * CANVAS_WIDTH,
        y: (y / (renderHeight - 1)) * CANVAS_HEIGHT,
      };
      const field = calculateField(canvasPoint, sources, parameters, phaseTime);
      writeFieldColor(imageData.data, (y * renderWidth + x) * 4, field);
    }
  }

  fieldContext.putImageData(imageData, 0, 0);
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.imageSmoothingEnabled = true;
  context.drawImage(fieldContext.canvas, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawWaveOverlay(context, sources, samplePoint);
  updateWaveOutputs(rootElement, parameters, sources, phaseTime, samplePoint);
}

function calculateSources(parameters: WaveParameters): [Point, Point] {
  return [
    { x: center.x - parameters.sourceSeparation / 2, y: center.y },
    { x: center.x + parameters.sourceSeparation / 2, y: center.y },
  ];
}

function calculateField(
  point: Point,
  sources: [Point, Point],
  parameters: WaveParameters,
  phaseTime: number,
): number {
  const waveNumber = (Math.PI * 2) / parameters.wavelength;
  const firstDistance = Math.max(Math.hypot(point.x - sources[0].x, point.y - sources[0].y), 1);
  const secondDistance = Math.max(Math.hypot(point.x - sources[1].x, point.y - sources[1].y), 1);
  const firstAttenuation = 1 / Math.sqrt(1 + parameters.falloff * firstDistance);
  const secondAttenuation = 1 / Math.sqrt(1 + parameters.falloff * secondDistance);

  return (
    Math.sin(waveNumber * firstDistance - phaseTime) * firstAttenuation +
    Math.sin(waveNumber * secondDistance - phaseTime + parameters.phaseOffset) * secondAttenuation
  );
}

function writeFieldColor(target: Uint8ClampedArray, offset: number, field: number): void {
  const base = [246, 248, 244];
  const positive = [220, 38, 38];
  const negative = [37, 99, 235];
  const color = field >= 0 ? positive : negative;
  const amount = Math.min(Math.abs(field) * 0.72, 1);

  target[offset] = base[0] + (color[0] - base[0]) * amount;
  target[offset + 1] = base[1] + (color[1] - base[1]) * amount;
  target[offset + 2] = base[2] + (color[2] - base[2]) * amount;
  target[offset + 3] = 255;
}

function drawWaveOverlay(
  context: CanvasRenderingContext2D,
  sources: [Point, Point],
  samplePoint: Point,
): void {
  context.save();
  context.strokeStyle = 'rgba(23, 32, 29, 0.18)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, center.y);
  context.lineTo(CANVAS_WIDTH, center.y);
  context.moveTo(center.x, 0);
  context.lineTo(center.x, CANVAS_HEIGHT);
  context.stroke();

  context.setLineDash([6, 8]);
  context.strokeStyle = 'rgba(23, 32, 29, 0.35)';
  context.beginPath();
  context.moveTo(sources[0].x, sources[0].y);
  context.lineTo(samplePoint.x, samplePoint.y);
  context.moveTo(sources[1].x, sources[1].y);
  context.lineTo(samplePoint.x, samplePoint.y);
  context.stroke();
  context.setLineDash([]);

  drawSource(context, sources[0], '#dc2626');
  drawSource(context, sources[1], '#2563eb');
  drawSamplePoint(context, samplePoint);
  context.restore();
}

function drawSource(context: CanvasRenderingContext2D, point: Point, fillStyle: string): void {
  context.fillStyle = fillStyle;
  context.strokeStyle = '#ffffff';
  context.lineWidth = 3;
  context.beginPath();
  context.arc(point.x, point.y, 13, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.strokeStyle = fillStyle;
  context.lineWidth = 1.4;
  context.beginPath();
  context.arc(point.x, point.y, 25, 0, Math.PI * 2);
  context.stroke();
}

function drawSamplePoint(context: CanvasRenderingContext2D, point: Point): void {
  context.strokeStyle = '#17201d';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(point.x - 10, point.y);
  context.lineTo(point.x + 10, point.y);
  context.moveTo(point.x, point.y - 10);
  context.lineTo(point.x, point.y + 10);
  context.stroke();
}

function updateWaveOutputs(
  rootElement: HTMLElement,
  parameters: WaveParameters,
  sources: [Point, Point],
  phaseTime: number,
  samplePoint: Point,
): void {
  const firstDistance = Math.hypot(samplePoint.x - sources[0].x, samplePoint.y - sources[0].y);
  const secondDistance = Math.hypot(samplePoint.x - sources[1].x, samplePoint.y - sources[1].y);
  const pathDifference = secondDistance - firstDistance;
  const field = calculateField(samplePoint, sources, parameters, phaseTime);
  const approximateFringeScale = (parameters.wavelength * 340) / parameters.sourceSeparation;

  setText(rootElement, '[data-wave-readout="pathDifference"]', `${formatFixed(pathDifference, 1)} px`);
  setText(rootElement, '[data-wave-readout="field"]', formatFixed(field, 2));
  setText(rootElement, '[data-wave-readout="fringeScale"]', `${formatCompact(approximateFringeScale, 0)} px`);
  setText(rootElement, '[data-wave-output="wavelength"]', `${formatCompact(parameters.wavelength, 0)} px`);
  setText(
    rootElement,
    '[data-wave-output="sourceSeparation"]',
    `${formatCompact(parameters.sourceSeparation, 0)} px`,
  );
  setText(
    rootElement,
    '[data-wave-output="phaseOffset"]',
    `${formatCompact((parameters.phaseOffset * 180) / Math.PI, 0)} deg`,
  );
  setText(rootElement, '[data-wave-output="falloff"]', formatFixed(parameters.falloff, 3));
}

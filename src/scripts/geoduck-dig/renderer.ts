import { getTideHeightFeet } from './game-data';
import type { BeachTarget, GameState } from './types';

type CanvasMetrics = {
  width: number;
  height: number;
  dpr: number;
};

export type BeachRenderer = {
  resize: () => void;
  render: (state: GameState) => void;
  getTargetAtPoint: (state: GameState, clientX: number, clientY: number) => BeachTarget | null;
};

export function createBeachRenderer(canvas: HTMLCanvasElement): BeachRenderer {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context is unavailable.');
  }

  let metrics = resizeCanvas(canvas, context);

  return {
    resize: () => {
      metrics = resizeCanvas(canvas, context);
    },
    render: (state) => {
      drawBeach(context, metrics, state);
    },
    getTargetAtPoint: (state, clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      return (
        [...state.targets]
          .reverse()
          .find((target) => {
            const point = getTargetPoint(metrics, target);
            const radius = Math.max(20, target.showRadius * metrics.width * 1.8);
            return Math.hypot(point.x - x, point.y - y) <= radius;
          }) ?? null
      );
    },
  };
}

function resizeCanvas(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): CanvasMetrics {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const width = Math.max(320, rect.width);
  const height = Math.max(420, rect.height);

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  return { width, height, dpr };
}

function drawBeach(
  context: CanvasRenderingContext2D,
  metrics: CanvasMetrics,
  state: GameState,
): void {
  context.clearRect(0, 0, metrics.width, metrics.height);
  drawBackground(context, metrics, state);
  drawPebbles(context, metrics);
  state.targets.forEach((target) => drawTarget(context, metrics, state, target));
  drawTideWash(context, metrics, state);
}

function drawBackground(
  context: CanvasRenderingContext2D,
  metrics: CanvasMetrics,
  state: GameState,
): void {
  const gradient = context.createLinearGradient(0, 0, 0, metrics.height);
  gradient.addColorStop(0, '#9bd5d4');
  gradient.addColorStop(0.18, '#d9f1ee');
  gradient.addColorStop(0.22, '#9fc9bf');
  gradient.addColorStop(0.46, '#c8b58a');
  gradient.addColorStop(1, '#806947');
  context.fillStyle = gradient;
  context.fillRect(0, 0, metrics.width, metrics.height);

  const tideHeight = getTideHeightFeet(state.elapsedMinutes);
  const waterLine = getWaterLine(metrics, tideHeight);
  context.fillStyle = 'rgba(31, 104, 122, 0.24)';
  context.fillRect(0, 0, metrics.width, waterLine);

  context.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  context.lineWidth = 2;
  context.beginPath();
  for (let x = 0; x <= metrics.width; x += 18) {
    const y = waterLine + Math.sin(x * 0.055 + state.elapsedMinutes * 0.08) * 3;
    if (x === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.stroke();
}

function drawPebbles(context: CanvasRenderingContext2D, metrics: CanvasMetrics): void {
  for (let index = 0; index < 70; index += 1) {
    const x = ((index * 73) % 997) / 997;
    const y = 0.26 + (((index * 151) % 853) / 853) * 0.7;
    const radius = 1.2 + ((index * 19) % 9) * 0.18;
    context.fillStyle = index % 3 === 0 ? 'rgba(63, 77, 67, 0.2)' : 'rgba(255, 244, 211, 0.2)';
    context.beginPath();
    context.ellipse(x * metrics.width, y * metrics.height, radius * 1.6, radius, 0, 0, Math.PI * 2);
    context.fill();
  }
}

function drawTarget(
  context: CanvasRenderingContext2D,
  metrics: CanvasMetrics,
  state: GameState,
  target: BeachTarget,
): void {
  const point = getTargetPoint(metrics, target);
  const selected = target.id === state.selectedTargetId;
  const radius = target.showRadius * metrics.width;
  const holeScale = target.dugDepthFeet > 0 ? 1 + target.dugDepthFeet * 0.2 : 1;

  if (target.dugDepthFeet > 0 && !target.filled) {
    context.fillStyle = target.collapsed ? 'rgba(62, 50, 39, 0.62)' : 'rgba(52, 39, 29, 0.72)';
    context.beginPath();
    context.ellipse(point.x, point.y + 4, radius * 1.75 * holeScale, radius * 1.05 * holeScale, 0, 0, Math.PI * 2);
    context.fill();
  }

  if (target.stabilized && !target.filled) {
    context.strokeStyle = '#db5f45';
    context.lineWidth = 5;
    context.beginPath();
    context.ellipse(point.x, point.y, radius * 2.0, radius * 1.35, -0.08, 0, Math.PI * 2);
    context.stroke();
  }

  context.fillStyle = getShowColor(target);
  context.strokeStyle = selected ? '#ffffff' : 'rgba(49, 45, 37, 0.5)';
  context.lineWidth = selected ? 4 : 2;
  context.beginPath();
  context.ellipse(point.x, point.y, radius * 1.2, radius * 0.72, -0.18, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.fillStyle = target.probed ? 'rgba(20, 90, 87, 0.72)' : 'rgba(62, 45, 34, 0.45)';
  context.beginPath();
  context.ellipse(point.x + radius * 0.18, point.y, radius * 0.42, radius * 0.22, -0.18, 0, Math.PI * 2);
  context.fill();

  if (target.kind === 'horseClam') {
    context.fillStyle = 'rgba(44, 58, 46, 0.56)';
    context.beginPath();
    context.arc(point.x - radius * 0.25, point.y - radius * 0.1, radius * 0.22, 0, Math.PI * 2);
    context.arc(point.x + radius * 0.42, point.y + radius * 0.05, radius * 0.18, 0, Math.PI * 2);
    context.fill();
  }

  if (target.harvested && !target.filled) {
    drawClamReveal(context, point.x, point.y, radius, target.kind);
  }
}

function drawClamReveal(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  kind: BeachTarget['kind'],
): void {
  context.save();
  context.translate(x, y - radius * 1.6);
  context.rotate(-0.08);
  context.fillStyle = kind === 'geoduck' ? '#f2b7a3' : '#b8a07d';
  context.strokeStyle = 'rgba(50, 34, 28, 0.38)';
  context.lineWidth = 2;
  context.beginPath();
  context.ellipse(0, 0, radius * 0.92, radius * 0.44, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  if (kind === 'geoduck') {
    context.fillStyle = '#df8f80';
    context.beginPath();
    context.roundRect(radius * 0.2, -radius * 0.18, radius * 1.6, radius * 0.36, radius * 0.18);
    context.fill();
  }
  context.restore();
}

function drawTideWash(
  context: CanvasRenderingContext2D,
  metrics: CanvasMetrics,
  state: GameState,
): void {
  const tideHeight = getTideHeightFeet(state.elapsedMinutes);
  if (tideHeight <= -2.05) {
    return;
  }

  const washOpacity = Math.min(0.5, (tideHeight + 2.05) * 0.6);
  context.fillStyle = `rgba(73, 144, 159, ${washOpacity})`;
  context.fillRect(0, metrics.height * 0.2, metrics.width, metrics.height * 0.18);
}

function getTargetPoint(metrics: CanvasMetrics, target: BeachTarget): { x: number; y: number } {
  return {
    x: target.x * metrics.width,
    y: target.y * metrics.height,
  };
}

function getWaterLine(metrics: CanvasMetrics, tideHeightFeet: number): number {
  return metrics.height * (0.16 + Math.max(0, tideHeightFeet + 2.8) * 0.12);
}

function getShowColor(target: BeachTarget): string {
  if (target.filled) {
    return 'rgba(196, 172, 124, 0.78)';
  }

  if (target.kind === 'geoduck') {
    return '#8f6e4c';
  }

  if (target.kind === 'horseClam') {
    return '#746a48';
  }

  if (target.kind === 'butterClam') {
    return '#b98f69';
  }

  if (target.kind === 'rock') {
    return '#5e625a';
  }

  return '#a2875a';
}

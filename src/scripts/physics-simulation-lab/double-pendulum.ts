import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  degreesToRadians,
  formatCompact,
  formatFixed,
  radiansToDegrees,
} from './simulation-types';
import type { Point, SimulationController } from './simulation-types';
import {
  forEachRangeControl,
  getCanvasContext,
  getRangeValue,
  setText,
  updateButtonState,
} from './dom-helpers';

type DoublePendulumState = {
  upperAngle: number;
  lowerAngle: number;
  upperVelocity: number;
  lowerVelocity: number;
  elapsedSeconds: number;
  trail: Point[];
};

const origin = { x: CANVAS_WIDTH / 2, y: 118 };
const upperLength = 128;
const lowerLength = 132;
const upperMass = 1;
const lowerMass = 1;
const maximumTrailPoints = 520;

export function createDoublePendulum(rootElement: HTMLElement): SimulationController | null {
  const canvas = rootElement.querySelector<HTMLCanvasElement>('[data-double-pendulum-canvas]');
  if (!canvas) {
    return null;
  }

  const context = getCanvasContext(canvas);
  if (!context) {
    return null;
  }

  const toggleButton = rootElement.querySelector<HTMLButtonElement>('[data-double-action="toggle"]');
  const resetButton = rootElement.querySelector<HTMLButtonElement>('[data-double-action="reset"]');
  const showTrailInput = rootElement.querySelector<HTMLInputElement>('[data-double-control="showTrail"]');

  let running = true;
  let animationFrameId: number | null = null;
  let lastFrameTimestamp = 0;
  let state = createInitialState(rootElement);

  const render = (): void => {
    drawDoublePendulum(context, rootElement, state, showTrailInput?.checked ?? true);
  };

  const reset = (): void => {
    state = createInitialState(rootElement);
    updateControlOutputs(rootElement);
    render();
  };

  const frame = (timestamp: number): void => {
    if (!running) {
      animationFrameId = null;
      return;
    }

    const deltaSeconds =
      lastFrameTimestamp === 0 ? 1 / 60 : Math.min((timestamp - lastFrameTimestamp) / 1000, 0.05);
    lastFrameTimestamp = timestamp;
    advanceState(rootElement, state, deltaSeconds);
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
  resetButton?.addEventListener('click', reset);
  showTrailInput?.addEventListener('change', render);

  forEachRangeControl(rootElement, '[data-double-control]', (inputElement) => {
    if (inputElement.type !== 'range') {
      return;
    }

    inputElement.addEventListener('input', () => {
      updateControlOutputs(rootElement);
      if (inputElement.dataset.doubleControl === 'upperAngle') {
        state.upperAngle = degreesToRadians(Number(inputElement.value));
        state.upperVelocity = 0;
        state.trail = [];
      }
      if (inputElement.dataset.doubleControl === 'lowerAngle') {
        state.lowerAngle = degreesToRadians(Number(inputElement.value));
        state.lowerVelocity = 0;
        state.trail = [];
      }
      render();
    });
  });

  reset();
  return { start, stop, render };
}

function createInitialState(rootElement: HTMLElement): DoublePendulumState {
  return {
    upperAngle: degreesToRadians(
      getRangeValue(rootElement, '[data-double-control="upperAngle"]', 120),
    ),
    lowerAngle: degreesToRadians(
      getRangeValue(rootElement, '[data-double-control="lowerAngle"]', -35),
    ),
    upperVelocity: 0,
    lowerVelocity: 0,
    elapsedSeconds: 0,
    trail: [],
  };
}

function advanceState(
  rootElement: HTMLElement,
  state: DoublePendulumState,
  deltaSeconds: number,
): void {
  const gravity = 9.81 * getRangeValue(rootElement, '[data-double-control="gravity"]', 1);
  const damping = getRangeValue(rootElement, '[data-double-control="damping"]', 0.02);
  let remainingSeconds = deltaSeconds;

  while (remainingSeconds > 0) {
    const stepSeconds = Math.min(remainingSeconds, 1 / 180);
    const acceleration = calculateAcceleration(state, gravity);
    const dampingFactor = Math.exp(-damping * stepSeconds);

    state.upperVelocity = (state.upperVelocity + acceleration.upper * stepSeconds) * dampingFactor;
    state.lowerVelocity = (state.lowerVelocity + acceleration.lower * stepSeconds) * dampingFactor;
    state.upperAngle += state.upperVelocity * stepSeconds;
    state.lowerAngle += state.lowerVelocity * stepSeconds;
    state.elapsedSeconds += stepSeconds;
    remainingSeconds -= stepSeconds;
  }

  const positions = calculatePositions(state);
  state.trail.push(positions.lower);
  if (state.trail.length > maximumTrailPoints) {
    state.trail.splice(0, state.trail.length - maximumTrailPoints);
  }
}

function calculateAcceleration(
  state: DoublePendulumState,
  gravity: number,
): { upper: number; lower: number } {
  const angleDifference = state.upperAngle - state.lowerAngle;
  const sharedDenominator =
    2 * upperMass +
    lowerMass -
    lowerMass * Math.cos(2 * state.upperAngle - 2 * state.lowerAngle);

  const upperAcceleration =
    (-gravity * (2 * upperMass + lowerMass) * Math.sin(state.upperAngle) -
      lowerMass * gravity * Math.sin(state.upperAngle - 2 * state.lowerAngle) -
      2 *
        Math.sin(angleDifference) *
        lowerMass *
        (state.lowerVelocity * state.lowerVelocity * lowerLength +
          state.upperVelocity *
            state.upperVelocity *
            upperLength *
            Math.cos(angleDifference))) /
    (upperLength * sharedDenominator);

  const lowerAcceleration =
    (2 *
      Math.sin(angleDifference) *
      (state.upperVelocity *
        state.upperVelocity *
        upperLength *
        (upperMass + lowerMass) +
        gravity * (upperMass + lowerMass) * Math.cos(state.upperAngle) +
        state.lowerVelocity *
          state.lowerVelocity *
          lowerLength *
          lowerMass *
          Math.cos(angleDifference))) /
    (lowerLength * sharedDenominator);

  return { upper: upperAcceleration, lower: lowerAcceleration };
}

function calculatePositions(state: DoublePendulumState): { upper: Point; lower: Point } {
  const upper = {
    x: origin.x + upperLength * Math.sin(state.upperAngle),
    y: origin.y + upperLength * Math.cos(state.upperAngle),
  };
  const lower = {
    x: upper.x + lowerLength * Math.sin(state.lowerAngle),
    y: upper.y + lowerLength * Math.cos(state.lowerAngle),
  };

  return { upper, lower };
}

function drawDoublePendulum(
  context: CanvasRenderingContext2D,
  rootElement: HTMLElement,
  state: DoublePendulumState,
  showTrail: boolean,
): void {
  const positions = calculatePositions(state);

  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawPendulumBackground(context);

  if (showTrail) {
    drawTrail(context, state.trail);
  }

  context.lineWidth = 4;
  context.strokeStyle = '#17201d';
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(origin.x, origin.y);
  context.lineTo(positions.upper.x, positions.upper.y);
  context.lineTo(positions.lower.x, positions.lower.y);
  context.stroke();

  drawMass(context, origin, 6, '#17201d');
  drawMass(context, positions.upper, 16, '#2563eb');
  drawMass(context, positions.lower, 19, '#dc2626');

  const energy = calculateEnergy(rootElement, state);
  const spreadDegrees = Math.abs(radiansToDegrees(state.upperAngle - state.lowerAngle));
  setText(rootElement, '[data-double-readout="time"]', `${formatFixed(state.elapsedSeconds, 1)} s`);
  setText(rootElement, '[data-double-readout="energy"]', formatFixed(energy / 1000, 2));
  setText(rootElement, '[data-double-readout="spread"]', `${formatCompact(spreadDegrees, 0)} deg`);
}

function drawPendulumBackground(context: CanvasRenderingContext2D): void {
  const centerX = CANVAS_WIDTH / 2;

  context.fillStyle = '#f6f8f4';
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  context.strokeStyle = '#d7ded8';
  context.lineWidth = 1;
  for (let radius = 90; radius <= 310; radius += 55) {
    context.beginPath();
    context.arc(centerX, origin.y, radius, 0, Math.PI * 2);
    context.stroke();
  }

  context.strokeStyle = '#c6d1ca';
  context.beginPath();
  context.moveTo(centerX, 36);
  context.lineTo(centerX, CANVAS_HEIGHT - 36);
  context.stroke();
}

function drawTrail(context: CanvasRenderingContext2D, trail: Point[]): void {
  if (trail.length < 2) {
    return;
  }

  context.lineWidth = 2.4;
  context.lineCap = 'round';
  for (let index = 1; index < trail.length; index += 1) {
    const alpha = index / trail.length;
    context.strokeStyle = `rgba(15, 118, 110, ${0.08 + alpha * 0.52})`;
    context.beginPath();
    context.moveTo(trail[index - 1].x, trail[index - 1].y);
    context.lineTo(trail[index].x, trail[index].y);
    context.stroke();
  }
}

function drawMass(
  context: CanvasRenderingContext2D,
  point: Point,
  radius: number,
  fillStyle: string,
): void {
  context.fillStyle = fillStyle;
  context.strokeStyle = '#ffffff';
  context.lineWidth = 3;
  context.beginPath();
  context.arc(point.x, point.y, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
}

function calculateEnergy(rootElement: HTMLElement, state: DoublePendulumState): number {
  const gravity = 9.81 * getRangeValue(rootElement, '[data-double-control="gravity"]', 1);
  const angleDifference = state.upperAngle - state.lowerAngle;
  const kineticEnergy =
    0.5 * upperMass * upperLength * upperLength * state.upperVelocity * state.upperVelocity +
    0.5 *
      lowerMass *
      (upperLength * upperLength * state.upperVelocity * state.upperVelocity +
        lowerLength * lowerLength * state.lowerVelocity * state.lowerVelocity +
        2 *
          upperLength *
          lowerLength *
          state.upperVelocity *
          state.lowerVelocity *
          Math.cos(angleDifference));
  const potentialEnergy =
    -(upperMass + lowerMass) * gravity * upperLength * Math.cos(state.upperAngle) -
    lowerMass * gravity * lowerLength * Math.cos(state.lowerAngle);

  return kineticEnergy + potentialEnergy;
}

function updateControlOutputs(rootElement: HTMLElement): void {
  const gravity = getRangeValue(rootElement, '[data-double-control="gravity"]', 1);
  const damping = getRangeValue(rootElement, '[data-double-control="damping"]', 0.02);
  const upperAngle = getRangeValue(rootElement, '[data-double-control="upperAngle"]', 120);
  const lowerAngle = getRangeValue(rootElement, '[data-double-control="lowerAngle"]', -35);

  setText(rootElement, '[data-double-output="gravity"]', `${formatFixed(gravity, 2)}x`);
  setText(rootElement, '[data-double-output="damping"]', formatFixed(damping, 3));
  setText(rootElement, '[data-double-output="upperAngle"]', `${formatCompact(upperAngle, 0)} deg`);
  setText(rootElement, '[data-double-output="lowerAngle"]', `${formatCompact(lowerAngle, 0)} deg`);
}

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
  setRangeValue,
  setText,
  updateButtonState,
} from './dom-helpers';

type OrbitState = {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  elapsedSeconds: number;
  trail: Point[];
};

type OrbitParameters = {
  gravitationalParameter: number;
  launchRadius: number;
  launchSpeedFactor: number;
  launchAngle: number;
};

const center = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
const baseGravitationalParameter = 9300;
const maximumTrailPoints = 720;
const simulationTimeScale = 10;

const orbitPresets = {
  circle: {
    centralMass: 1,
    launchRadius: 180,
    launchSpeed: 1,
    launchAngle: 90,
  },
  ellipse: {
    centralMass: 1.2,
    launchRadius: 215,
    launchSpeed: 0.78,
    launchAngle: 90,
  },
  escape: {
    centralMass: 1,
    launchRadius: 165,
    launchSpeed: 1.43,
    launchAngle: 84,
  },
};

export function createOrbitLab(rootElement: HTMLElement): SimulationController | null {
  const canvas = rootElement.querySelector<HTMLCanvasElement>('[data-orbit-canvas]');
  if (!canvas) {
    return null;
  }

  const context = getCanvasContext(canvas);
  if (!context) {
    return null;
  }

  const toggleButton = rootElement.querySelector<HTMLButtonElement>('[data-orbit-action="toggle"]');
  const resetButton = rootElement.querySelector<HTMLButtonElement>('[data-orbit-action="reset"]');
  const showTrailInput = rootElement.querySelector<HTMLInputElement>('[data-orbit-control="showTrail"]');
  const presetButtons = rootElement.querySelectorAll<HTMLButtonElement>('[data-orbit-preset]');

  let running = true;
  let animationFrameId: number | null = null;
  let lastFrameTimestamp = 0;
  let state = createInitialOrbitState(rootElement);

  const render = (): void => {
    drawOrbitLab(context, rootElement, state, showTrailInput?.checked ?? true);
  };

  const reset = (): void => {
    state = createInitialOrbitState(rootElement);
    updateOrbitOutputs(rootElement);
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
    advanceOrbit(rootElement, state, deltaSeconds);
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

  forEachRangeControl(rootElement, '[data-orbit-control]', (inputElement) => {
    if (inputElement.type !== 'range') {
      return;
    }

    inputElement.addEventListener('input', reset);
  });

  presetButtons.forEach((buttonElement) => {
    buttonElement.addEventListener('click', () => {
      const presetId = buttonElement.dataset.orbitPreset as keyof typeof orbitPresets;
      const preset = orbitPresets[presetId];
      if (!preset) {
        return;
      }

      setRangeValue(rootElement, '[data-orbit-control="centralMass"]', preset.centralMass);
      setRangeValue(rootElement, '[data-orbit-control="launchRadius"]', preset.launchRadius);
      setRangeValue(rootElement, '[data-orbit-control="launchSpeed"]', preset.launchSpeed);
      setRangeValue(rootElement, '[data-orbit-control="launchAngle"]', preset.launchAngle);
      reset();
    });
  });

  reset();
  return { start, stop, render };
}

function createInitialOrbitState(rootElement: HTMLElement): OrbitState {
  const parameters = readOrbitParameters(rootElement);
  const circularSpeed = Math.sqrt(parameters.gravitationalParameter / parameters.launchRadius);
  const launchSpeed = circularSpeed * parameters.launchSpeedFactor;
  const launchAngle = degreesToRadians(parameters.launchAngle);

  return {
    x: parameters.launchRadius,
    y: 0,
    velocityX: launchSpeed * Math.cos(launchAngle),
    velocityY: launchSpeed * Math.sin(launchAngle),
    elapsedSeconds: 0,
    trail: [],
  };
}

function readOrbitParameters(rootElement: HTMLElement): OrbitParameters {
  return {
    gravitationalParameter:
      baseGravitationalParameter * getRangeValue(rootElement, '[data-orbit-control="centralMass"]', 1),
    launchRadius: getRangeValue(rootElement, '[data-orbit-control="launchRadius"]', 180),
    launchSpeedFactor: getRangeValue(rootElement, '[data-orbit-control="launchSpeed"]', 1),
    launchAngle: getRangeValue(rootElement, '[data-orbit-control="launchAngle"]', 90),
  };
}

function advanceOrbit(rootElement: HTMLElement, state: OrbitState, deltaSeconds: number): void {
  const parameters = readOrbitParameters(rootElement);
  let remainingSeconds = deltaSeconds * simulationTimeScale;

  while (remainingSeconds > 0) {
    const stepSeconds = Math.min(remainingSeconds, 0.032);
    const acceleration = calculateGravity(state, parameters.gravitationalParameter);

    state.velocityX += acceleration.x * stepSeconds * 0.5;
    state.velocityY += acceleration.y * stepSeconds * 0.5;
    state.x += state.velocityX * stepSeconds;
    state.y += state.velocityY * stepSeconds;

    const nextAcceleration = calculateGravity(state, parameters.gravitationalParameter);
    state.velocityX += nextAcceleration.x * stepSeconds * 0.5;
    state.velocityY += nextAcceleration.y * stepSeconds * 0.5;
    state.elapsedSeconds += stepSeconds;
    remainingSeconds -= stepSeconds;
  }

  const radius = calculateRadius(state);
  state.trail.push({ x: center.x + state.x, y: center.y + state.y });
  if (state.trail.length > maximumTrailPoints) {
    state.trail.splice(0, state.trail.length - maximumTrailPoints);
  }

  if (radius < 18 || radius > 980) {
    const replacementState = createInitialOrbitState(rootElement);
    state.x = replacementState.x;
    state.y = replacementState.y;
    state.velocityX = replacementState.velocityX;
    state.velocityY = replacementState.velocityY;
    state.elapsedSeconds = replacementState.elapsedSeconds;
    state.trail = replacementState.trail;
  }
}

function calculateGravity(state: OrbitState, gravitationalParameter: number): Point {
  const radiusSquared = state.x * state.x + state.y * state.y;
  const safeRadiusSquared = Math.max(radiusSquared, 16 * 16);
  const radius = Math.sqrt(safeRadiusSquared);
  const accelerationScale = -gravitationalParameter / (safeRadiusSquared * radius);

  return {
    x: accelerationScale * state.x,
    y: accelerationScale * state.y,
  };
}

function drawOrbitLab(
  context: CanvasRenderingContext2D,
  rootElement: HTMLElement,
  state: OrbitState,
  showTrail: boolean,
): void {
  const parameters = readOrbitParameters(rootElement);
  const screenPosition = { x: center.x + state.x, y: center.y + state.y };

  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawOrbitBackground(context, parameters.launchRadius);

  if (showTrail) {
    drawOrbitTrail(context, state.trail);
  }

  drawStar(context);
  drawVector(context, screenPosition, state.velocityX * 7, state.velocityY * 7, '#0f766e');
  drawPlanet(context, screenPosition);

  const radius = calculateRadius(state);
  const speed = Math.hypot(state.velocityX, state.velocityY);
  const energy = calculateSpecificEnergy(state, parameters.gravitationalParameter);
  setText(rootElement, '[data-orbit-readout="classification"]', classifyOrbit(radius, energy));
  setText(rootElement, '[data-orbit-readout="radius"]', `${formatCompact(radius, 0)} px`);
  setText(rootElement, '[data-orbit-readout="energy"]', formatFixed(energy, 1));
  setText(rootElement, '[data-orbit-output="centralMass"]', `${formatFixed(parameters.gravitationalParameter / baseGravitationalParameter, 2)}x`);
  setText(rootElement, '[data-orbit-output="launchRadius"]', `${formatCompact(parameters.launchRadius, 0)} px`);
  setText(rootElement, '[data-orbit-output="launchSpeed"]', `${formatFixed(parameters.launchSpeedFactor, 2)}x`);
  setText(rootElement, '[data-orbit-output="launchAngle"]', `${formatCompact(parameters.launchAngle, 0)} deg`);

  context.fillStyle = '#5d6863';
  context.font = '600 13px Inter, sans-serif';
  context.fillText(`v = ${formatFixed(speed, 2)} px/t`, 24, CANVAS_HEIGHT - 24);
}

function drawOrbitBackground(context: CanvasRenderingContext2D, launchRadius: number): void {
  context.fillStyle = '#f6f8f4';
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  context.strokeStyle = '#d7ded8';
  context.lineWidth = 1;
  for (let radius = 60; radius <= 360; radius += 60) {
    context.beginPath();
    context.arc(center.x, center.y, radius, 0, Math.PI * 2);
    context.stroke();
  }

  context.strokeStyle = '#c2cdc5';
  context.setLineDash([5, 8]);
  context.beginPath();
  context.arc(center.x, center.y, launchRadius, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);

  context.strokeStyle = '#e2e8e3';
  context.beginPath();
  context.moveTo(40, center.y);
  context.lineTo(CANVAS_WIDTH - 40, center.y);
  context.moveTo(center.x, 40);
  context.lineTo(center.x, CANVAS_HEIGHT - 40);
  context.stroke();
}

function drawOrbitTrail(context: CanvasRenderingContext2D, trail: Point[]): void {
  if (trail.length < 2) {
    return;
  }

  context.lineWidth = 2;
  context.lineCap = 'round';
  for (let index = 1; index < trail.length; index += 1) {
    const alpha = index / trail.length;
    context.strokeStyle = `rgba(37, 99, 235, ${0.07 + alpha * 0.42})`;
    context.beginPath();
    context.moveTo(trail[index - 1].x, trail[index - 1].y);
    context.lineTo(trail[index].x, trail[index].y);
    context.stroke();
  }
}

function drawStar(context: CanvasRenderingContext2D): void {
  const gradient = context.createRadialGradient(center.x, center.y, 4, center.x, center.y, 48);
  gradient.addColorStop(0, '#fff7cc');
  gradient.addColorStop(0.38, '#f59e0b');
  gradient.addColorStop(1, 'rgba(245, 158, 11, 0)');

  context.fillStyle = gradient;
  context.beginPath();
  context.arc(center.x, center.y, 48, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#d97706';
  context.beginPath();
  context.arc(center.x, center.y, 18, 0, Math.PI * 2);
  context.fill();
}

function drawPlanet(context: CanvasRenderingContext2D, point: Point): void {
  context.fillStyle = '#2563eb';
  context.strokeStyle = '#ffffff';
  context.lineWidth = 3;
  context.beginPath();
  context.arc(point.x, point.y, 12, 0, Math.PI * 2);
  context.fill();
  context.stroke();
}

function drawVector(
  context: CanvasRenderingContext2D,
  startPoint: Point,
  x: number,
  y: number,
  strokeStyle: string,
): void {
  const endPoint = { x: startPoint.x + x, y: startPoint.y + y };
  context.strokeStyle = strokeStyle;
  context.fillStyle = strokeStyle;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(startPoint.x, startPoint.y);
  context.lineTo(endPoint.x, endPoint.y);
  context.stroke();

  const angle = Math.atan2(y, x);
  context.beginPath();
  context.moveTo(endPoint.x, endPoint.y);
  context.lineTo(endPoint.x - 9 * Math.cos(angle - 0.45), endPoint.y - 9 * Math.sin(angle - 0.45));
  context.lineTo(endPoint.x - 9 * Math.cos(angle + 0.45), endPoint.y - 9 * Math.sin(angle + 0.45));
  context.closePath();
  context.fill();
}

function calculateRadius(state: OrbitState): number {
  return Math.hypot(state.x, state.y);
}

function calculateSpecificEnergy(state: OrbitState, gravitationalParameter: number): number {
  const radius = calculateRadius(state);
  const speedSquared = state.velocityX * state.velocityX + state.velocityY * state.velocityY;
  return 0.5 * speedSquared - gravitationalParameter / radius;
}

function classifyOrbit(radius: number, energy: number): string {
  if (radius < 28) {
    return 'Collision risk';
  }
  if (energy > 3) {
    return 'Escape';
  }
  if (energy > -3) {
    return 'Near escape';
  }
  return 'Bound';
}

function updateOrbitOutputs(rootElement: HTMLElement): void {
  const parameters = readOrbitParameters(rootElement);
  setText(
    rootElement,
    '[data-orbit-output="centralMass"]',
    `${formatFixed(parameters.gravitationalParameter / baseGravitationalParameter, 2)}x`,
  );
  setText(
    rootElement,
    '[data-orbit-output="launchRadius"]',
    `${formatCompact(parameters.launchRadius, 0)} px`,
  );
  setText(
    rootElement,
    '[data-orbit-output="launchSpeed"]',
    `${formatFixed(parameters.launchSpeedFactor, 2)}x`,
  );
  setText(
    rootElement,
    '[data-orbit-output="launchAngle"]',
    `${formatCompact(parameters.launchAngle, 0)} deg`,
  );
}

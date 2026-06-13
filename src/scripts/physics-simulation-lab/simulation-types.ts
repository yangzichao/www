export type SimulationController = {
  start: () => void;
  stop: () => void;
  render: () => void;
};

export type Point = {
  x: number;
  y: number;
};

export const CANVAS_WIDTH = 900;
export const CANVAS_HEIGHT = 520;

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function formatFixed(value: number, digits = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatCompact(value: number, digits = 1): string {
  return value.toLocaleString('en-US', {
    maximumFractionDigits: digits,
  });
}

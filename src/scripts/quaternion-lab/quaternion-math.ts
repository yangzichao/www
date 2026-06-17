import type {
  AxisComponents,
  ComplexNumber,
  PauliMatrixEntries,
  QuaternionComponents,
} from './quaternion-types';

const EPSILON = 0.000001;

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function normalizeAxis(axis: AxisComponents): AxisComponents {
  const length = Math.hypot(axis.x, axis.y, axis.z);
  if (length < EPSILON) {
    return { x: 0, y: 1, z: 0 };
  }

  return {
    x: axis.x / length,
    y: axis.y / length,
    z: axis.z / length,
  };
}

export function quaternionFromAxisAngle(
  axis: AxisComponents,
  angleRadians: number,
): QuaternionComponents {
  const normalizedAxis = normalizeAxis(axis);
  const halfAngle = angleRadians / 2;
  const vectorScale = Math.sin(halfAngle);

  return normalizeQuaternion({
    w: Math.cos(halfAngle),
    x: normalizedAxis.x * vectorScale,
    y: normalizedAxis.y * vectorScale,
    z: normalizedAxis.z * vectorScale,
  });
}

export function normalizeQuaternion(quaternion: QuaternionComponents): QuaternionComponents {
  const length = Math.hypot(quaternion.w, quaternion.x, quaternion.y, quaternion.z);
  if (length < EPSILON) {
    return { w: 1, x: 0, y: 0, z: 0 };
  }

  return {
    w: quaternion.w / length,
    x: quaternion.x / length,
    y: quaternion.y / length,
    z: quaternion.z / length,
  };
}

export function pauliMatrixFromQuaternion(
  quaternion: QuaternionComponents,
): PauliMatrixEntries {
  const normalizedQuaternion = normalizeQuaternion(quaternion);
  const { w, x, y, z } = normalizedQuaternion;

  return {
    m00: { real: w, imaginary: -z },
    m01: { real: -y, imaginary: -x },
    m10: { real: y, imaginary: -x },
    m11: { real: w, imaginary: z },
  };
}

export function formatNumber(value: number, digits = 3): string {
  const displayValue = Math.abs(value) < 0.0005 ? 0 : value;
  return displayValue.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatDegrees(value: number, digits = 0): string {
  return `${value.toLocaleString('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })} deg`;
}

export function formatAxis(axis: AxisComponents): string {
  const normalizedAxis = normalizeAxis(axis);
  return `(${formatNumber(normalizedAxis.x, 2)}, ${formatNumber(normalizedAxis.y, 2)}, ${formatNumber(
    normalizedAxis.z,
    2,
  )})`;
}

export function formatQuaternion(quaternion: QuaternionComponents): string {
  const normalizedQuaternion = normalizeQuaternion(quaternion);
  return `q = (${formatNumber(normalizedQuaternion.w)}, ${formatNumber(
    normalizedQuaternion.x,
  )}, ${formatNumber(normalizedQuaternion.y)}, ${formatNumber(normalizedQuaternion.z)})`;
}

export function formatComplexNumber(complexNumber: ComplexNumber): string {
  const realPart = formatNumber(complexNumber.real);
  const imaginaryMagnitude = formatNumber(Math.abs(complexNumber.imaginary));
  const sign = complexNumber.imaginary >= 0 ? '+' : '-';
  return `${realPart} ${sign} ${imaginaryMagnitude}i`;
}

export function formatAxisAngleFormula(axis: AxisComponents, angleDegrees: number): string {
  const normalizedAxis = normalizeAxis(axis);
  const halfAngleDegrees = angleDegrees / 2;

  return `q = cos(${formatDegrees(halfAngleDegrees, 1)}) + (${formatNumber(
    normalizedAxis.x,
    2,
  )}i + ${formatNumber(normalizedAxis.y, 2)}j + ${formatNumber(
    normalizedAxis.z,
    2,
  )}k) sin(${formatDegrees(halfAngleDegrees, 1)})`;
}

export function formatSpinorPhase(angleDegrees: number): string {
  const phaseDegrees = ((angleDegrees / 2) % 360 + 360) % 360;
  const sign = Math.cos(degreesToRadians(angleDegrees / 2)) < 0 ? 'negative sheet' : 'positive sheet';
  return `${formatDegrees(phaseDegrees, 0)} / ${sign}`;
}

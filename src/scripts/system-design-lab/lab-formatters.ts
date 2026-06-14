import type { WorkloadControlDefinition } from './lab-types';

export function formatControlValue(control: WorkloadControlDefinition, value: number): string {
  switch (control.format) {
    case 'count':
      return `${formatCount(value)}${control.unit ? ` ${formatCountUnit(control.unit, value)}` : ''}`;
    case 'duration-seconds':
      return formatDuration(value);
    case 'kilobytes':
      return formatKilobytes(value);
    case 'milliseconds':
      return `${formatCount(value)} ms`;
    case 'multiplier':
      return `${value.toFixed(value < 10 ? 1 : 0)}x`;
    case 'operations-per-second':
      return `${formatRate(value)} ops/s`;
    case 'percentage':
      return `${value.toFixed(value < 10 ? 1 : 0)}%`;
    case 'requests-per-minute':
      return `${formatRate(value)}/min`;
    case 'requests-per-second':
      return `${formatRate(value)}/s`;
    default:
      return `${value.toFixed(1)}${control.unit ?? ''}`;
  }
}

export function formatRate(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 10_000) {
    return `${Math.round(value / 1_000)}k`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }
  if (value >= 10) {
    return `${Math.round(value)}`;
  }
  return value.toFixed(value < 1 ? 1 : 0);
}

export function formatCount(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 10_000) {
    return `${Math.round(value / 1_000)}k`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }
  return `${Math.round(value)}`;
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) {
    return '0 sec';
  }
  if (seconds >= 86_400) {
    return `${Math.round(seconds / 86_400)} days`;
  }
  if (seconds >= 3600) {
    return `${Math.round(seconds / 3600)} hr`;
  }
  if (seconds >= 60) {
    return `${Math.round(seconds / 60)} min`;
  }
  if (seconds >= 1) {
    return `${Math.round(seconds)} sec`;
  }
  return `${Math.round(seconds * 1000)} ms`;
}

export function formatKilobytes(kilobytes: number): string {
  if (kilobytes >= 1_048_576) {
    return `${(kilobytes / 1_048_576).toFixed(1)} GB`;
  }
  if (kilobytes >= 1024) {
    return `${(kilobytes / 1024).toFixed(1)} MB`;
  }
  return `${Math.round(kilobytes)} KB`;
}

export function formatStorageGigabytes(gigabytes: number): string {
  if (gigabytes >= 1_000) {
    return `${(gigabytes / 1_000).toFixed(1)} TB`;
  }
  if (gigabytes >= 10) {
    return `${Math.round(gigabytes)} GB`;
  }
  if (gigabytes >= 1) {
    return `${gigabytes.toFixed(1)} GB`;
  }

  const megabytes = gigabytes * 1000;
  if (megabytes >= 10) {
    return `${Math.round(megabytes)} MB`;
  }
  if (megabytes >= 1) {
    return `${megabytes.toFixed(1)} MB`;
  }
  return `${Math.round(megabytes * 1000)} KB`;
}

export function formatRatio(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatCountUnit(unit: string, value: number): string {
  if (Math.round(value) === 1 && unit.endsWith('s')) {
    return unit.slice(0, -1);
  }
  return unit;
}

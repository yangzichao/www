import type { BeachTarget, ClamKind, GameState, ToolConfig, ToolKind } from './types';

export const LOW_TIDE_LIMIT_FEET = -2;
export const TIDE_END_FEET = -1.25;
export const STARTING_ENERGY = 100;
export const DAILY_GEODUCK_LIMIT = 1;

export const toolConfigs: Record<ToolKind, ToolConfig> = {
  probe: {
    label: 'Probe',
    iconClass: 'ph ph-magnifying-glass',
    timeCostMinutes: 4,
    energyCost: 3,
  },
  tube: {
    label: 'Tube',
    iconClass: 'ph ph-circle-dashed',
    timeCostMinutes: 8,
    energyCost: 8,
  },
  shovel: {
    label: 'Shovel',
    iconClass: 'ph ph-shovel',
    timeCostMinutes: 7,
    energyCost: 12,
  },
  hand: {
    label: 'Hand',
    iconClass: 'ph ph-hand-palm',
    timeCostMinutes: 9,
    energyCost: 7,
  },
  refill: {
    label: 'Refill',
    iconClass: 'ph ph-arrow-arc-left',
    timeCostMinutes: 5,
    energyCost: 4,
  },
};

type TargetTemplate = {
  kind: ClamKind;
  x: number;
  y: number;
  showRadius: number;
  depthFeet: [number, number];
  visibleClue: string;
  probeClue: string;
};

const targetTemplates: TargetTemplate[] = [
  {
    kind: 'geoduck',
    x: 0.27,
    y: 0.58,
    showRadius: 0.052,
    depthFeet: [2.35, 2.95],
    visibleClue: 'Large oval show with a smooth wet rim.',
    probeClue: 'Smooth fleshy siphon, slow to pull back. This is a strong geoduck read.',
  },
  {
    kind: 'geoduck',
    x: 0.68,
    y: 0.72,
    showRadius: 0.047,
    depthFeet: [2.2, 2.8],
    visibleClue: 'Wide keyhole dimple with a heavy neck print.',
    probeClue: 'Boxy smooth siphon tip and no hard plates. Likely geoduck.',
  },
  {
    kind: 'horseClam',
    x: 0.54,
    y: 0.42,
    showRadius: 0.049,
    depthFeet: [1.45, 2.05],
    visibleClue: 'Round show with algae flecks near the opening.',
    probeClue: 'Hard leathery plates and a quick water jet. Horse clam decoy.',
  },
  {
    kind: 'horseClam',
    x: 0.82,
    y: 0.5,
    showRadius: 0.045,
    depthFeet: [1.35, 1.9],
    visibleClue: 'Big opening, but the rim looks plated and barnacled.',
    probeClue: 'The siphon retracts hard and spits water. Horse clam.',
  },
  {
    kind: 'butterClam',
    x: 0.36,
    y: 0.34,
    showRadius: 0.028,
    depthFeet: [0.45, 0.85],
    visibleClue: 'Small paired holes just under the surface.',
    probeClue: 'Shallow shell feel. Not a geoduck.',
  },
  {
    kind: 'empty',
    x: 0.18,
    y: 0.78,
    showRadius: 0.033,
    depthFeet: [0.35, 0.65],
    visibleClue: 'Tiny bubble patch in soft sand.',
    probeClue: 'No siphon pressure. Just bubbles and a ghost show.',
  },
  {
    kind: 'rock',
    x: 0.75,
    y: 0.27,
    showRadius: 0.035,
    depthFeet: [0.25, 0.5],
    visibleClue: 'Dark crescent under thin sand.',
    probeClue: 'Hard stop. Rock shelf.',
  },
  {
    kind: 'horseClam',
    x: 0.47,
    y: 0.83,
    showRadius: 0.041,
    depthFeet: [1.55, 2.1],
    visibleClue: 'Oval show with a rough lip.',
    probeClue: 'Rough plates around the siphon holes. Horse clam, not geoduck.',
  },
];

export function createInitialGameState(): GameState {
  const random = createSeededRandom(Date.now());
  const targets = targetTemplates.map((template, index) => createTarget(template, index, random));

  return {
    targets,
    selectedTargetId: null,
    selectedTool: 'probe',
    elapsedMinutes: 0,
    energy: STARTING_ENERGY,
    score: 0,
    harvestedGeoducks: 0,
    gameOutcome: 'playing',
    messageSequence: 0,
    random,
    messages: [
      {
        id: 0,
        text: 'Low tide is open. Pick a show, read it, then dig with care.',
        tone: 'normal',
      },
    ],
  };
}

export function getTideHeightFeet(elapsedMinutes: number): number {
  return -2.8 + elapsedMinutes * 0.018;
}

export function getTideLabel(elapsedMinutes: number): string {
  return `${getTideHeightFeet(elapsedMinutes).toFixed(1)} ft`;
}

export function getOpenHoleCount(state: GameState): number {
  return state.targets.filter((target) => target.dugDepthFeet > 0 && !target.filled).length;
}

export function getSelectedTarget(state: GameState): BeachTarget | null {
  return state.targets.find((target) => target.id === state.selectedTargetId) ?? null;
}

export function getTargetProgressPercent(target: BeachTarget): number {
  return Math.min(100, Math.round((target.dugDepthFeet / target.depthFeet) * 100));
}

function createTarget(
  template: TargetTemplate,
  index: number,
  random: () => number,
): BeachTarget {
  const [minDepth, maxDepth] = template.depthFeet;
  const xJitter = (random() - 0.5) * 0.045;
  const yJitter = (random() - 0.5) * 0.045;

  return {
    id: `${template.kind}-${index}`,
    kind: template.kind,
    x: clamp(template.x + xJitter, 0.1, 0.9),
    y: clamp(template.y + yJitter, 0.18, 0.88),
    showRadius: template.showRadius * (0.9 + random() * 0.24),
    depthFeet: minDepth + random() * (maxDepth - minDepth),
    dugDepthFeet: 0,
    stabilized: false,
    probed: false,
    harvested: false,
    filled: false,
    collapsed: false,
    visibleClue: template.visibleClue,
    probeClue: template.probeClue,
  };
}

function createSeededRandom(seedValue: number): () => number {
  let seed = seedValue % 2147483647;
  if (seed <= 0) {
    seed += 2147483646;
  }

  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

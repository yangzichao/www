export type ClamKind = 'geoduck' | 'horseClam' | 'butterClam' | 'empty' | 'rock';

export type ToolKind = 'probe' | 'tube' | 'shovel' | 'hand' | 'refill';

export type GameOutcome = 'playing' | 'success' | 'tideOut' | 'exhausted';

export type GameMessageTone = 'normal' | 'good' | 'warn' | 'bad';

export type BeachTarget = {
  id: string;
  kind: ClamKind;
  x: number;
  y: number;
  showRadius: number;
  depthFeet: number;
  dugDepthFeet: number;
  stabilized: boolean;
  probed: boolean;
  harvested: boolean;
  filled: boolean;
  collapsed: boolean;
  visibleClue: string;
  probeClue: string;
};

export type GameMessage = {
  id: number;
  text: string;
  tone: GameMessageTone;
};

export type GameState = {
  targets: BeachTarget[];
  selectedTargetId: string | null;
  selectedTool: ToolKind;
  elapsedMinutes: number;
  energy: number;
  score: number;
  harvestedGeoducks: number;
  gameOutcome: GameOutcome;
  messageSequence: number;
  random: () => number;
  messages: GameMessage[];
};

export type ToolConfig = {
  label: string;
  iconClass: string;
  timeCostMinutes: number;
  energyCost: number;
};

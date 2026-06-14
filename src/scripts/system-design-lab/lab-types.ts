export type ScaleType = 'linear' | 'log';

export type ControlValueFormat =
  | 'count'
  | 'duration-seconds'
  | 'kilobytes'
  | 'milliseconds'
  | 'multiplier'
  | 'operations-per-second'
  | 'percentage'
  | 'requests-per-second'
  | 'requests-per-minute';

export type NodeState = 'inactive' | 'ok' | 'warning' | 'needed' | 'overloaded';
export type FlowState = 'inactive' | 'active' | 'warning';
export type DecisionState = 'not-yet' | 'useful' | 'needed' | 'tradeoff';
export type Severity = 'ok' | 'warning' | 'danger';

export type WorkloadValues = Record<string, number | boolean>;

export type WorkloadControlDefinition = {
  id: string;
  label: string;
  help: string;
  min: number;
  max: number;
  defaultValue: number;
  scale: ScaleType;
  unit?: string;
  format: ControlValueFormat;
};

export type ToggleControlDefinition = {
  id: string;
  label: string;
  help: string;
  defaultValue: boolean;
};

export type ScenarioDefinition = {
  id: string;
  step: string;
  title: string;
  summary: string;
  values: WorkloadValues;
};

export type DiagramZoneDefinition = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  variant?: string;
};

export type DiagramFlowDefinition = {
  id: string;
  path: string;
  variant?: 'primary' | 'secondary' | 'direct';
};

export type DiagramNodeDefinition = {
  id: string;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MobileDiagramNodeDefinition = {
  id: string;
  title: string;
  summary: string;
};

export type MobileDiagramStageDefinition = {
  label: string;
  nodes: MobileDiagramNodeDefinition[];
};

export type DiagramDefinition = {
  title: string;
  description: string;
  viewBox: string;
  zones: DiagramZoneDefinition[];
  flows: DiagramFlowDefinition[];
  nodes: DiagramNodeDefinition[];
  mobileStages: MobileDiagramStageDefinition[];
};

export type MeterDefinition = {
  id: string;
  label: string;
};

export type DecisionDefinition = {
  id: string;
  title: string;
};

export type SourceBackedRule = {
  title: string;
  source: string;
  url: string;
  summary: string;
};

export type LabReason = {
  text: string;
  severity: Severity;
};

export type MeterAnalysis = {
  ratio: number;
  valueText: string;
  copy: string;
};

export type DecisionAnalysis = {
  state: DecisionState;
  copy: string;
};

export type LabAnalysis = {
  architectureTitle: string;
  architectureSummary: string;
  architecturePath: string;
  nodeStates: Record<string, NodeState>;
  flowStates: Record<string, FlowState>;
  meters: Record<string, MeterAnalysis>;
  decisions: Record<string, DecisionAnalysis>;
  reasons: LabReason[];
  nodeTitles?: Record<string, string>;
  nodeCopies?: Record<string, string>;
};

export type SystemDesignLabDefinition = {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  articleHref?: string;
  controls: WorkloadControlDefinition[];
  toggles: ToggleControlDefinition[];
  scenarios: ScenarioDefinition[];
  diagram: DiagramDefinition;
  meters: MeterDefinition[];
  decisions: DecisionDefinition[];
  sourceBackedRules: SourceBackedRule[];
  teachingAssumptions: string[];
  analyze: (workload: WorkloadValues) => LabAnalysis;
};

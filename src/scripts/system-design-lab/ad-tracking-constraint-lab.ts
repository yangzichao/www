type ScaleType = 'linear' | 'log';

type WorkloadValues = {
  eventsPerSecond: number;
  peakMultiplier: number;
  reportingQueriesPerMinute: number;
  retentionDays: number;
  hotCampaignShare: number;
  freshnessSeconds: number;
  duplicatePercent: number;
  billingGrade: boolean;
};

type DecisionState = 'not-yet' | 'useful' | 'needed' | 'tradeoff';
type NodeState = 'inactive' | 'ok' | 'warning' | 'needed' | 'overloaded';
type FlowState = 'inactive' | 'active' | 'warning';
type Severity = 'ok' | 'warning' | 'danger';
type ScenarioPreset = {
  id: string;
  values: WorkloadValues;
};

const capacityAssumptions = {
  singleHostEventsPerSecond: 1_200,
  sharedDatabaseEventsPerSecond: 5_500,
  logPartitionEventsPerSecond: 15_000,
  sharedDatabaseQueryBudgetPerMinute: 180,
  comfortableSingleStoreTerabytes: 0.6,
  eventSizeKilobytes: 1.2,
};

const scenarioPresets: ScenarioPreset[] = [
  {
    id: 'demo',
    values: {
      eventsPerSecond: 300,
      peakMultiplier: 1.5,
      reportingQueriesPerMinute: 12,
      retentionDays: 7,
      hotCampaignShare: 5,
      freshnessSeconds: 900,
      duplicatePercent: 0.4,
      billingGrade: false,
    },
  },
  {
    id: 'growth',
    values: {
      eventsPerSecond: 900,
      peakMultiplier: 2,
      reportingQueriesPerMinute: 30,
      retentionDays: 7,
      hotCampaignShare: 8,
      freshnessSeconds: 600,
      duplicatePercent: 0.6,
      billingGrade: false,
    },
  },
  {
    id: 'db-pressure',
    values: {
      eventsPerSecond: 1_500,
      peakMultiplier: 3,
      reportingQueriesPerMinute: 260,
      retentionDays: 3,
      hotCampaignShare: 8,
      freshnessSeconds: 300,
      duplicatePercent: 1,
      billingGrade: false,
    },
  },
  {
    id: 'launch-spike',
    values: {
      eventsPerSecond: 3_000,
      peakMultiplier: 6,
      reportingQueriesPerMinute: 120,
      retentionDays: 14,
      hotCampaignShare: 18,
      freshnessSeconds: 180,
      duplicatePercent: 2,
      billingGrade: false,
    },
  },
  {
    id: 'billing-realtime',
    values: {
      eventsPerSecond: 8_000,
      peakMultiplier: 8,
      reportingQueriesPerMinute: 500,
      retentionDays: 90,
      hotCampaignShare: 35,
      freshnessSeconds: 60,
      duplicatePercent: 4,
      billingGrade: true,
    },
  },
];

export function initAdTrackingConstraintLab(): void {
  document.querySelectorAll<HTMLElement>('[data-system-design-lab]').forEach((labElement) => {
    const rangeControls = Array.from(
      labElement.querySelectorAll<HTMLInputElement>('input[type="range"][data-control]'),
    );
    const billingGradeInput = labElement.querySelector<HTMLInputElement>(
      'input[type="checkbox"][data-control="billingGrade"]',
    );
    const scenarioButtons = Array.from(
      labElement.querySelectorAll<HTMLButtonElement>('[data-scenario-button]'),
    );

    if (rangeControls.length === 0 || !billingGradeInput) {
      return;
    }

    let activeScenarioId: string | null = 'demo';

    const render = (): void => {
      const workload = readWorkloadValues(rangeControls, billingGradeInput, labElement);
      const analysis = analyzeWorkload(workload);

      setText(labElement, '[data-architecture-title]', analysis.architectureTitle);
      setText(labElement, '[data-architecture-summary]', analysis.architectureSummary);
      setText(labElement, '[data-architecture-path]', analysis.architecturePath);

      updateNodes(labElement, analysis);
      updateFlows(labElement, analysis);
      updateMeters(labElement, analysis);
      updateReasons(labElement, analysis.reasons);
      updateDecisionCards(labElement, analysis);
      updateScenarioButtons(scenarioButtons, activeScenarioId);
    };

    const applyScenario = (scenarioId: string): void => {
      const scenario = scenarioPresets.find((preset) => preset.id === scenarioId);
      if (!scenario) {
        return;
      }

      rangeControls.forEach((inputElement) => {
        const controlId = inputElement.dataset.control as keyof Omit<WorkloadValues, 'billingGrade'>;
        inputElement.value = String(valueToSliderPosition(inputElement, scenario.values[controlId]));
      });
      billingGradeInput.checked = scenario.values.billingGrade;
      activeScenarioId = scenarioId;
      render();
    };

    scenarioButtons.forEach((buttonElement) => {
      buttonElement.addEventListener('click', () => {
        applyScenario(buttonElement.dataset.scenarioId ?? 'demo');
      });
    });

    rangeControls.forEach((inputElement) =>
      inputElement.addEventListener('input', () => {
        activeScenarioId = null;
        render();
      }),
    );
    billingGradeInput.addEventListener('change', () => {
      activeScenarioId = null;
      render();
    });

    applyScenario('demo');
  });
}

function readWorkloadValues(
  rangeControls: HTMLInputElement[],
  billingGradeInput: HTMLInputElement,
  labElement: HTMLElement,
): WorkloadValues {
  const values = {} as Record<keyof Omit<WorkloadValues, 'billingGrade'>, number>;

  rangeControls.forEach((inputElement) => {
    const controlId = inputElement.dataset.control as keyof Omit<WorkloadValues, 'billingGrade'>;
    const value = sliderPositionToValue(inputElement);
    values[controlId] = value;

    const outputElement = labElement.querySelector<HTMLOutputElement>(
      `[data-control-output="${controlId}"]`,
    );
    if (outputElement) {
      outputElement.value = formatControlValue(controlId, value, inputElement.dataset.unit ?? '');
    }
  });

  return {
    eventsPerSecond: values.eventsPerSecond,
    peakMultiplier: values.peakMultiplier,
    reportingQueriesPerMinute: values.reportingQueriesPerMinute,
    retentionDays: values.retentionDays,
    hotCampaignShare: values.hotCampaignShare,
    freshnessSeconds: values.freshnessSeconds,
    duplicatePercent: values.duplicatePercent,
    billingGrade: billingGradeInput.checked,
  };
}

function analyzeWorkload(workload: WorkloadValues) {
  const peakEventsPerSecond = workload.eventsPerSecond * workload.peakMultiplier;
  const gigabytesPerDay =
    (workload.eventsPerSecond * 86_400 * capacityAssumptions.eventSizeKilobytes) / 1_000_000;
  const retainedTerabytes = (gigabytesPerDay * workload.retentionDays) / 1_000;
  const hotCampaignEventsPerSecond = peakEventsPerSecond * (workload.hotCampaignShare / 100);

  const singleHostLoad = peakEventsPerSecond / capacityAssumptions.singleHostEventsPerSecond;
  const sharedDatabaseLoad =
    peakEventsPerSecond / capacityAssumptions.sharedDatabaseEventsPerSecond +
    workload.reportingQueriesPerMinute / capacityAssumptions.sharedDatabaseQueryBudgetPerMinute;
  const storageLoad = retainedTerabytes / capacityAssumptions.comfortableSingleStoreTerabytes;
  const hotPartitionLoad =
    hotCampaignEventsPerSecond / capacityAssumptions.logPartitionEventsPerSecond;
  const freshnessLoad = freshnessTargetToPressure(workload.freshnessSeconds);

  const needsMultiHost =
    singleHostLoad > 0.7 || workload.billingGrade || workload.peakMultiplier >= 8;
  const needsEventLog =
    sharedDatabaseLoad > 0.7 ||
    workload.peakMultiplier >= 6 ||
    workload.billingGrade ||
    workload.duplicatePercent >= 3;
  const needsPartitioning =
    peakEventsPerSecond > capacityAssumptions.logPartitionEventsPerSecond * 0.7 ||
    retainedTerabytes > 1 ||
    hotPartitionLoad > 0.65;
  const hotPartitionRisk = hotPartitionLoad > 0.65 || workload.hotCampaignShare >= 25;
  const needsStreaming =
    workload.freshnessSeconds <= 180 ||
    workload.duplicatePercent >= 2 ||
    (needsEventLog && workload.reportingQueriesPerMinute >= 60);
  const needsServingStores =
    workload.reportingQueriesPerMinute >= 120 ||
    (needsEventLog && retainedTerabytes >= 0.5) ||
    workload.retentionDays >= 45 ||
    workload.freshnessSeconds <= 120;

  const architecture = chooseArchitecture({
    needsMultiHost,
    needsEventLog,
    needsPartitioning,
    needsStreaming,
    needsServingStores,
  });

  const reasons = buildReasons({
    workload,
    peakEventsPerSecond,
    gigabytesPerDay,
    retainedTerabytes,
    hotCampaignEventsPerSecond,
    singleHostLoad,
    sharedDatabaseLoad,
    storageLoad,
    hotPartitionLoad,
    needsMultiHost,
    needsEventLog,
    needsPartitioning,
    hotPartitionRisk,
    needsStreaming,
    needsServingStores,
  });

  return {
    ...architecture,
    workload,
    peakEventsPerSecond,
    gigabytesPerDay,
    retainedTerabytes,
    hotCampaignEventsPerSecond,
    singleHostLoad,
    sharedDatabaseLoad,
    storageLoad,
    hotPartitionLoad,
    freshnessLoad,
    needsMultiHost,
    needsEventLog,
    needsPartitioning,
    hotPartitionRisk,
    needsStreaming,
    needsServingStores,
    reasons,
  };
}

function chooseArchitecture(flags: {
  needsMultiHost: boolean;
  needsEventLog: boolean;
  needsPartitioning: boolean;
  needsStreaming: boolean;
  needsServingStores: boolean;
}) {
  if (!flags.needsMultiHost && !flags.needsEventLog && !flags.needsPartitioning) {
    return {
      architectureTitle: 'Single host collector + one database',
      architecturePath: 'Ad events -> single collector -> shared database',
      architectureSummary:
        'The simplest design is still defensible: one service validates events and writes a local or managed database. You avoid distributed coordination until the workload proves it needs it.',
    };
  }

  if (flags.needsMultiHost && !flags.needsEventLog && !flags.needsPartitioning) {
    return {
      architectureTitle: 'Multiple collectors + shared database',
      architecturePath: 'Ad events -> load balancer -> collector fleet -> shared database',
      architectureSummary:
        'The first scale move is stateless collectors behind a load balancer. This solves host capacity and availability, but the shared database is now the place to watch.',
    };
  }

  if (flags.needsEventLog && !flags.needsPartitioning) {
    return {
      architectureTitle: 'Collector fleet + durable event log',
      architecturePath: 'Ad events -> load balancer -> collector fleet -> event log -> reporting database',
      architectureSummary:
        'The system should stop writing every request directly into the reporting store. Append first, then let consumers dedupe, aggregate, and retry without blocking ingestion.',
    };
  }

  if (flags.needsPartitioning && !flags.needsServingStores && !flags.needsStreaming) {
    return {
      architectureTitle: 'Partitioned event log + partitioned consumers',
      architecturePath:
        'Ad events -> collector fleet -> partitioned event log -> partitioned consumers -> reports',
      architectureSummary:
        'One stream or one database shard is no longer enough. Partitioning spreads throughput and storage, but now the partition key controls ordering, hot spots, and rebalancing cost.',
    };
  }

  return {
    architectureTitle: 'Partitioned pipeline + realtime serving views',
    architecturePath:
      'Ad events -> collector fleet -> partitioned event log -> stream workers -> serving stores + warehouse',
    architectureSummary:
      'Ingestion, replay, aggregation, and reporting need separate shapes. Raw events flow through partitioned logs; stream workers build fast counters; OLAP or warehouse stores handle heavier reads.',
  };
}

function buildReasons(analysis: {
  workload: WorkloadValues;
  peakEventsPerSecond: number;
  gigabytesPerDay: number;
  retainedTerabytes: number;
  hotCampaignEventsPerSecond: number;
  singleHostLoad: number;
  sharedDatabaseLoad: number;
  storageLoad: number;
  hotPartitionLoad: number;
  needsMultiHost: boolean;
  needsEventLog: boolean;
  needsPartitioning: boolean;
  hotPartitionRisk: boolean;
  needsStreaming: boolean;
  needsServingStores: boolean;
}) {
  const reasons: Array<{ text: string; severity: Severity }> = [];

  if (analysis.needsMultiHost) {
    reasons.push({
      severity: analysis.singleHostLoad > 1 ? 'danger' : 'warning',
      text: `Peak load is ${formatRate(analysis.peakEventsPerSecond)}, which is ${formatRatio(
        analysis.singleHostLoad,
      )} of the teaching model's single-host ingestion budget. Multi host is justified by capacity or availability, not by taste.`,
    });
  } else {
    reasons.push({
      severity: 'ok',
      text: `Peak load is ${formatRate(analysis.peakEventsPerSecond)}, below the single-host threshold. Single machine is still a reasonable starting point.`,
    });
  }

  if (analysis.sharedDatabaseLoad > 0.7) {
    reasons.push({
      severity: analysis.sharedDatabaseLoad > 1 ? 'danger' : 'warning',
      text: `The shared database is at ${formatRatio(
        analysis.sharedDatabaseLoad,
      )} after combining raw writes and report queries. Adding collectors alone would move the bottleneck into the database.`,
    });
  }

  if (analysis.workload.billingGrade) {
    reasons.push({
      severity: 'warning',
      text: 'Billing-grade durability means accepted events need audit and replay. A direct request-to-row write path is too fragile for collector restarts and downstream outages.',
    });
  }

  if (analysis.needsEventLog) {
    reasons.push({
      severity: 'warning',
      text: 'A durable event log buys buffering, replay, and independent consumers. The tradeoff is lag, consumer ownership, and eventual consistency in reports.',
    });
  }

  if (analysis.needsPartitioning) {
    reasons.push({
      severity: analysis.hotPartitionRisk ? 'danger' : 'warning',
      text: `Partitioning becomes relevant at ${formatRate(
        analysis.peakEventsPerSecond,
      )} peak and ${formatStorage(analysis.retainedTerabytes)} retained raw data. It scales throughput, but forces a partition-key decision.`,
    });
  }

  if (analysis.hotPartitionRisk) {
    reasons.push({
      severity: 'danger',
      text: `The hottest campaign receives about ${formatRate(
        analysis.hotCampaignEventsPerSecond,
      )}. Partitioning by campaign preserves campaign-local aggregation, but can create a hot partition; bucketing by event id spreads load but requires later grouping.`,
    });
  }

  if (analysis.needsStreaming) {
    reasons.push({
      severity: 'warning',
      text: `A ${formatFreshness(
        analysis.workload.freshnessSeconds,
      )} freshness target or duplicate pressure makes batch-only reporting weak. Stream workers handle dedupe windows and near-realtime counters.`,
    });
  }

  if (analysis.needsServingStores) {
    reasons.push({
      severity: 'warning',
      text: `${formatStorage(
        analysis.retainedTerabytes,
      )} of retained raw data and ${formatQueries(
        analysis.workload.reportingQueriesPerMinute,
      )} should not fight the ingest path. Separate serving stores protect writes from reads.`,
    });
  }

  return reasons.slice(0, 7);
}

function updateNodes(labElement: HTMLElement, analysis: ReturnType<typeof analyzeWorkload>): void {
  setNodeState(labElement, 'source', 'ok');

  const collectorState = analysis.singleHostLoad > 1 && !analysis.needsMultiHost ? 'overloaded' : 'ok';
  setNodeState(labElement, 'collectors', analysis.needsMultiHost ? 'needed' : collectorState);
  setText(
    labElement,
    '[data-node-title="collectors"]',
    analysis.needsMultiHost ? 'Collector fleet' : 'Single collector',
  );
  setText(
    labElement,
    '[data-node-copy="collectors"]',
    analysis.needsMultiHost ? 'stateless validators' : 'validate + write',
  );

  setNodeState(labElement, 'loadBalancer', analysis.needsMultiHost ? 'needed' : 'inactive');

  let sharedDatabaseState: NodeState = 'ok';
  if (analysis.sharedDatabaseLoad > 1) {
    sharedDatabaseState = 'overloaded';
  } else if (analysis.sharedDatabaseLoad > 0.7) {
    sharedDatabaseState = 'warning';
  }
  if (analysis.needsServingStores) {
    sharedDatabaseState = 'inactive';
  }
  setNodeState(labElement, 'sharedDatabase', sharedDatabaseState);
  setText(
    labElement,
    '[data-node-copy="sharedDatabase"]',
    analysis.needsEventLog ? 'consumer sink' : 'raw events + reports',
  );

  setNodeState(labElement, 'eventLog', analysis.needsEventLog ? 'needed' : 'inactive');
  setNodeState(labElement, 'partitioning', analysis.needsPartitioning ? 'needed' : 'inactive');
  setNodeState(labElement, 'streaming', analysis.needsStreaming ? 'needed' : 'inactive');
  setNodeState(labElement, 'servingStores', analysis.needsServingStores ? 'needed' : 'inactive');
  setNodeState(
    labElement,
    'warehouse',
    analysis.workload.retentionDays >= 45 || analysis.workload.billingGrade ? 'needed' : 'inactive',
  );
}

function updateFlows(labElement: HTMLElement, analysis: ReturnType<typeof analyzeWorkload>): void {
  setFlowState(labElement, 'clientToLoadBalancer', analysis.needsMultiHost ? 'active' : 'inactive');
  setFlowState(labElement, 'loadBalancerToCollectors', analysis.needsMultiHost ? 'active' : 'inactive');
  setFlowState(labElement, 'collectorsToDatabase', analysis.needsEventLog ? 'inactive' : 'active');
  setFlowState(labElement, 'collectorsToEventLog', analysis.needsEventLog ? 'active' : 'inactive');
  setFlowState(labElement, 'eventLogToStreaming', analysis.needsStreaming ? 'active' : 'inactive');
  setFlowState(labElement, 'streamingToServing', analysis.needsServingStores ? 'active' : 'inactive');
  setFlowState(labElement, 'eventLogToPartitioning', analysis.needsPartitioning ? 'active' : 'inactive');
  setFlowState(
    labElement,
    'partitioningToStreaming',
    analysis.hotPartitionRisk ? 'warning' : analysis.needsPartitioning ? 'active' : 'inactive',
  );
  setFlowState(labElement, 'streamingToWarehouse', analysis.needsServingStores ? 'active' : 'inactive');
  setFlowState(
    labElement,
    'streamingToArchive',
    analysis.workload.retentionDays >= 45 || analysis.workload.billingGrade ? 'active' : 'inactive',
  );
  setFlowState(labElement, 'clientToCollectors', analysis.needsMultiHost ? 'inactive' : 'active');
  setFlowState(
    labElement,
    'eventLogToDatabase',
    analysis.needsEventLog && !analysis.needsStreaming ? 'active' : 'inactive',
  );
  setFlowState(
    labElement,
    'streamingToDatabase',
    analysis.needsStreaming && !analysis.needsServingStores ? 'active' : 'inactive',
  );
}

function updateMeters(labElement: HTMLElement, analysis: ReturnType<typeof analyzeWorkload>): void {
  updateMeter(
    labElement,
    'singleHost',
    analysis.singleHostLoad,
    formatRatio(analysis.singleHostLoad),
    `${formatRate(analysis.peakEventsPerSecond)} peak / ${formatRate(
      capacityAssumptions.singleHostEventsPerSecond,
    )} single-host teaching budget.`,
  );
  updateMeter(
    labElement,
    'sharedDatabase',
    analysis.sharedDatabaseLoad,
    formatRatio(analysis.sharedDatabaseLoad),
    'Combines raw event writes and report reads against one shared database path.',
  );
  updateMeter(
    labElement,
    'storage',
    analysis.storageLoad,
    formatStorage(analysis.retainedTerabytes),
    `${formatGigabytes(analysis.gigabytesPerDay)} per day at the current normal rate.`,
  );
  updateMeter(
    labElement,
    'hotPartition',
    analysis.hotPartitionLoad,
    formatRatio(analysis.hotPartitionLoad),
    `${analysis.workload.hotCampaignShare.toFixed(0)}% of peak traffic maps to the hottest campaign.`,
  );
  updateMeter(
    labElement,
    'freshness',
    analysis.freshnessLoad,
    formatFreshness(analysis.workload.freshnessSeconds),
    'Lower freshness targets increase the need for streaming instead of batch correction only.',
  );
}

function updateDecisionCards(
  labElement: HTMLElement,
  analysis: ReturnType<typeof analyzeWorkload>,
): void {
  setDecision(
    labElement,
    'multiHost',
    analysis.needsMultiHost ? 'needed' : 'not-yet',
    analysis.needsMultiHost
      ? 'Needed once one host lacks headroom or availability matters. Cost: load balancing, health checks, and idempotent retries.'
      : 'Do not add hosts yet. One process is easier to reason about while capacity and availability are acceptable.',
  );

  setDecision(
    labElement,
    'sharedDatabase',
    analysis.sharedDatabaseLoad > 0.7 ? 'tradeoff' : 'useful',
    analysis.sharedDatabaseLoad > 0.7
      ? 'Shared DB is now the bottleneck. It is simple, but writes and report reads contend for the same resource.'
      : 'A shared DB is acceptable at this load. It keeps the system simple before replay or fanout is required.',
  );

  setDecision(
    labElement,
    'eventLog',
    analysis.needsEventLog ? 'needed' : 'not-yet',
    analysis.needsEventLog
      ? 'Use an append-only log to absorb spikes and replay consumers. Cost: consumer lag and eventual consistency.'
      : 'Direct writes are still fine. A log would add operational surface before it buys enough value.',
  );

  setDecision(
    labElement,
    'partitioning',
    analysis.needsPartitioning ? 'needed' : 'not-yet',
    analysis.needsPartitioning
      ? 'Partition to spread writes and storage. Tradeoff: the key decides ordering, grouping, and hot-shard behavior.'
      : 'A single partition or shard is still within the model. Avoid sharding until the pressure is visible.',
  );

  setDecision(
    labElement,
    'streaming',
    analysis.needsStreaming ? 'needed' : 'not-yet',
    analysis.needsStreaming
      ? 'Stream workers maintain dedupe windows and rolling counters. Cost: late-event correction and state management.'
      : 'Batch or simple queries are enough while freshness and duplicate pressure are loose.',
  );

  setDecision(
    labElement,
    'servingStores',
    analysis.needsServingStores ? 'needed' : 'not-yet',
    analysis.needsServingStores
      ? 'Split OLAP, billing, risk, and warehouse views so reads do not damage ingestion.'
      : 'One store can still serve the product. Split stores when query volume or retention makes the read path heavy.',
  );
}

function updateReasons(
  labElement: HTMLElement,
  reasons: Array<{ text: string; severity: Severity }>,
): void {
  const reasonsElement = labElement.querySelector<HTMLUListElement>('[data-reasons]');
  if (!reasonsElement) {
    return;
  }

  reasonsElement.replaceChildren(
    ...reasons.map((reason) => {
      const itemElement = document.createElement('li');
      itemElement.textContent = reason.text;
      itemElement.dataset.severity = reason.severity;
      return itemElement;
    }),
  );
}

function updateScenarioButtons(
  scenarioButtons: HTMLButtonElement[],
  activeScenarioId: string | null,
): void {
  scenarioButtons.forEach((buttonElement) => {
    buttonElement.setAttribute(
      'aria-pressed',
      String(buttonElement.dataset.scenarioId === activeScenarioId),
    );
  });
}

function updateMeter(
  labElement: HTMLElement,
  meterId: string,
  ratio: number,
  valueText: string,
  copy: string,
): void {
  const fillElement = labElement.querySelector<HTMLElement>(`[data-meter="${meterId}"]`);
  const valueElement = labElement.querySelector<HTMLElement>(`[data-meter-value="${meterId}"]`);
  const copyElement = labElement.querySelector<HTMLElement>(`[data-meter-copy="${meterId}"]`);
  const severity = ratio > 1 ? 'danger' : ratio > 0.7 ? 'warning' : 'ok';

  fillElement?.style.setProperty('--meter-level', `${Math.min(ratio * 100, 100)}%`);
  if (fillElement) {
    fillElement.dataset.severity = severity;
  }
  if (valueElement) {
    valueElement.textContent = valueText;
  }
  if (copyElement) {
    copyElement.textContent = copy;
  }
}

function setNodeState(labElement: HTMLElement, nodeId: string, state: NodeState): void {
  const nodeElements = labElement.querySelectorAll<HTMLElement>(
    `[data-node="${nodeId}"], [data-mobile-node="${nodeId}"]`,
  );
  nodeElements.forEach((nodeElement) => {
    nodeElement.dataset.state = state;
  });
}

function setFlowState(labElement: HTMLElement, flowId: string, state: FlowState): void {
  const flowElement = labElement.querySelector<HTMLElement>(`[data-flow="${flowId}"]`);
  if (flowElement) {
    flowElement.dataset.state = state;
  }
}

function setDecision(
  labElement: HTMLElement,
  decisionId: string,
  state: DecisionState,
  copy: string,
): void {
  const decisionElement = labElement.querySelector<HTMLElement>(`[data-decision="${decisionId}"]`);
  const copyElement = labElement.querySelector<HTMLElement>(`[data-decision-copy="${decisionId}"]`);
  if (decisionElement) {
    decisionElement.dataset.state = state;
  }
  if (copyElement) {
    copyElement.textContent = copy;
  }
}

function setText(labElement: HTMLElement, selector: string, text: string): void {
  const element = labElement.querySelector<HTMLElement>(selector);
  if (element) {
    element.textContent = text;
  }
}

function sliderPositionToValue(inputElement: HTMLInputElement): number {
  const sliderPosition = Number(inputElement.value);
  const minValue = Number(inputElement.dataset.minValue ?? '0');
  const maxValue = Number(inputElement.dataset.maxValue ?? '100');
  const scale = (inputElement.dataset.scale ?? 'linear') as ScaleType;

  if (scale === 'log' && minValue > 0) {
    return minValue * Math.pow(maxValue / minValue, sliderPosition / 100);
  }

  return minValue + (maxValue - minValue) * (sliderPosition / 100);
}

function valueToSliderPosition(inputElement: HTMLInputElement, value: number): number {
  const minValue = Number(inputElement.dataset.minValue ?? '0');
  const maxValue = Number(inputElement.dataset.maxValue ?? '100');
  const scale = (inputElement.dataset.scale ?? 'linear') as ScaleType;

  if (scale === 'log' && minValue > 0) {
    return clamp((Math.log(value / minValue) / Math.log(maxValue / minValue)) * 100, 0, 100);
  }

  return clamp(((value - minValue) / (maxValue - minValue)) * 100, 0, 100);
}

function freshnessTargetToPressure(seconds: number): number {
  if (seconds <= 15) {
    return 1;
  }
  if (seconds <= 60) {
    return 0.82;
  }
  if (seconds <= 180) {
    return 0.62;
  }
  if (seconds <= 600) {
    return 0.34;
  }
  return 0.16;
}

function formatControlValue(controlId: string, value: number, unit: string): string {
  if (controlId === 'eventsPerSecond') {
    return formatRate(value);
  }
  if (controlId === 'reportingQueriesPerMinute') {
    return formatQueries(value);
  }
  if (controlId === 'freshnessSeconds') {
    return formatFreshness(value);
  }
  if (controlId === 'peakMultiplier') {
    return `${value.toFixed(value < 10 ? 1 : 0)}${unit}`;
  }
  if (controlId === 'retentionDays') {
    return `${Math.round(value)} ${unit}`;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)}${unit}`;
}

function formatRate(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M/s`;
  }
  if (value >= 10_000) {
    return `${Math.round(value / 1_000)}k/s`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k/s`;
  }
  return `${Math.round(value)}/s`;
}

function formatQueries(value: number): string {
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k/min`;
  }
  return `${Math.round(value)}/min`;
}

function formatFreshness(seconds: number): string {
  if (seconds >= 3600) {
    return `${Math.round(seconds / 3600)} hr`;
  }
  if (seconds >= 60) {
    return `${Math.round(seconds / 60)} min`;
  }
  return `${Math.round(seconds)} sec`;
}

function formatGigabytes(gigabytes: number): string {
  if (gigabytes >= 1_000) {
    return `${(gigabytes / 1_000).toFixed(1)} TB`;
  }
  if (gigabytes >= 10) {
    return `${Math.round(gigabytes)} GB`;
  }
  return `${gigabytes.toFixed(1)} GB`;
}

function formatStorage(terabytes: number): string {
  if (terabytes >= 1) {
    return `${terabytes.toFixed(1)} TB`;
  }
  return `${Math.round(terabytes * 1_000)} GB`;
}

function formatRatio(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

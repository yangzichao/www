import {
  formatCount,
  formatDuration,
  formatKilobytes,
  formatRate,
  formatStorageGigabytes,
} from '../lab-formatters';
import type {
  DecisionState,
  LabAnalysis,
  LabReason,
  NodeState,
  SystemDesignLabDefinition,
  WorkloadValues,
} from '../lab-types';

const roomOperationBudgetPerSecond = 2_000;
const presenceFanoutBudgetPerSecond = 10_000;
const fastRecoveryLogBudgetMegabytes = 64;
const operationBytes = 240;

export const googleDocsLabDefinition: SystemDesignLabDefinition = {
  id: 'google-docs',
  eyebrow: 'System Design Lab',
  title: 'Google Docs changes shape when edit ordering becomes the constraint.',
  summary:
    'Start with one editable document. Increase collaborators, offline time, and reader fanout to see why the design needs WebSocket routing, a document room, OT/CRDT, an operation log, snapshots, and a separate presence path.',
  articleHref: '/blog/system-design/google-docs/',
  controls: [
    {
      id: 'concurrentEditors',
      label: 'Concurrent editors',
      help: 'People actively editing the same document, not total document viewers.',
      min: 1,
      max: 2_000,
      defaultValue: 4,
      scale: 'log',
      unit: 'editors',
      format: 'count',
    },
    {
      id: 'operationsPerEditorSecond',
      label: 'Edit rate per editor',
      help: 'Small operations such as insert, delete, format, or composition batches.',
      min: 0.2,
      max: 10,
      defaultValue: 2,
      scale: 'linear',
      format: 'operations-per-second',
    },
    {
      id: 'documentSizeKilobytes',
      label: 'Document size',
      help: 'The current snapshot size; operation history can be much larger.',
      min: 4,
      max: 50_000,
      defaultValue: 100,
      scale: 'log',
      format: 'kilobytes',
    },
    {
      id: 'offlineSeconds',
      label: 'Offline edit window',
      help: 'How long clients may keep editing locally before reconnecting.',
      min: 0,
      max: 86_400,
      defaultValue: 300,
      scale: 'linear',
      format: 'duration-seconds',
    },
    {
      id: 'presenceUpdatesSecond',
      label: 'Presence update rate',
      help: 'Cursor, selection, and typing indicators per active editor.',
      min: 0,
      max: 20,
      defaultValue: 2,
      scale: 'linear',
      format: 'operations-per-second',
    },
    {
      id: 'viewerFanout',
      label: 'Passive viewers',
      help: 'Users watching the document without actively editing; important for hot documents.',
      min: 1,
      max: 100_000,
      defaultValue: 8,
      scale: 'log',
      unit: 'viewers',
      format: 'count',
    },
  ],
  toggles: [
    {
      id: 'durableAck',
      label: 'Ack after durable append',
      help: 'The server only confirms an edit after the operation is in a recoverable log.',
      defaultValue: true,
    },
  ],
  scenarios: [
    {
      id: 'solo',
      step: '01',
      title: 'Solo draft',
      summary: 'Saving the latest document body is still enough.',
      values: {
        concurrentEditors: 1,
        operationsPerEditorSecond: 0.5,
        documentSizeKilobytes: 24,
        offlineSeconds: 0,
        presenceUpdatesSecond: 0,
        viewerFanout: 1,
        durableAck: false,
      },
    },
    {
      id: 'team',
      step: '02',
      title: 'Small team',
      summary: 'WebSocket routing and one document owner become useful.',
      values: {
        concurrentEditors: 4,
        operationsPerEditorSecond: 2,
        documentSizeKilobytes: 100,
        offlineSeconds: 300,
        presenceUpdatesSecond: 2,
        viewerFanout: 8,
        durableAck: true,
      },
    },
    {
      id: 'offline',
      step: '03',
      title: 'Offline edits',
      summary: 'Base versions drift, so transformation or merge logic matters.',
      values: {
        concurrentEditors: 24,
        operationsPerEditorSecond: 3,
        documentSizeKilobytes: 480,
        offlineSeconds: 10_800,
        presenceUpdatesSecond: 2,
        viewerFanout: 30,
        durableAck: true,
      },
    },
    {
      id: 'public-doc',
      step: '04',
      title: 'Public document',
      summary: 'Presence and broadcast fanout should not overload the edit room.',
      values: {
        concurrentEditors: 220,
        operationsPerEditorSecond: 2,
        documentSizeKilobytes: 900,
        offlineSeconds: 1800,
        presenceUpdatesSecond: 4,
        viewerFanout: 18_000,
        durableAck: true,
      },
    },
    {
      id: 'hot-doc',
      step: '05',
      title: 'Hot document',
      summary: 'One room is still the ordering point, but reads and presence need fanout tiers.',
      values: {
        concurrentEditors: 900,
        operationsPerEditorSecond: 4,
        documentSizeKilobytes: 2_000,
        offlineSeconds: 3600,
        presenceUpdatesSecond: 6,
        viewerFanout: 70_000,
        durableAck: true,
      },
    },
  ],
  diagram: {
    title: 'Google Docs collaborative editing architecture diagram',
    description:
      'Whiteboard-style architecture diagram for real-time document collaboration with room ordering, operation transform, logs, snapshots, and presence fanout.',
    viewBox: '0 0 1040 560',
    zones: [
      { id: 'clients', label: 'Clients', x: 20, y: 65, width: 150, height: 370, variant: 'clients' },
      { id: 'edge', label: 'Realtime edge', x: 210, y: 45, width: 180, height: 430, variant: 'edge' },
      { id: 'coordination', label: 'Doc coordination', x: 430, y: 70, width: 205, height: 380, variant: 'backbone' },
      { id: 'reliability', label: 'Recovery', x: 675, y: 70, width: 165, height: 380, variant: 'processing' },
      { id: 'serving', label: 'Storage + fanout', x: 875, y: 45, width: 145, height: 430, variant: 'storage' },
    ],
    flows: [
      { id: 'clientsToGateway', path: 'M155 238 C190 238 190 150 225 150', variant: 'primary' },
      { id: 'gatewayToRoom', path: 'M365 185 C400 185 405 205 445 205', variant: 'primary' },
      { id: 'roomToTransform', path: 'M535 250 L535 315', variant: 'primary' },
      { id: 'transformToLog', path: 'M620 352 C655 352 660 212 690 212', variant: 'primary' },
      { id: 'logToSnapshot', path: 'M770 252 L770 330', variant: 'secondary' },
      { id: 'snapshotToStore', path: 'M835 365 C858 365 858 380 890 380', variant: 'secondary' },
      { id: 'roomToStore', path: 'M620 205 C715 120 800 120 890 120', variant: 'secondary' },
      { id: 'roomToPresence', path: 'M620 235 C750 250 792 260 890 260', variant: 'secondary' },
      { id: 'presenceToGateway', path: 'M890 285 C720 470 390 470 300 220', variant: 'secondary' },
      { id: 'directToStore', path: 'M155 255 C390 175 640 135 890 120', variant: 'direct' },
    ],
    nodes: [
      { id: 'clients', title: 'Browsers', subtitle: 'local optimistic edits', x: 48, y: 205, width: 108, height: 92 },
      { id: 'gateway', title: 'WebSocket', subtitle: 'auth + doc routing', x: 225, y: 125, width: 140, height: 92 },
      { id: 'room', title: 'Doc room', subtitle: 'authoritative order', x: 445, y: 165, width: 175, height: 96 },
      { id: 'transform', title: 'OT / CRDT', subtitle: 'stale position repair', x: 445, y: 315, width: 175, height: 88 },
      { id: 'operationLog', title: 'Op log', subtitle: 'durable versions', x: 690, y: 175, width: 130, height: 88 },
      { id: 'snapshot', title: 'Snapshotter', subtitle: 'fast recovery', x: 690, y: 330, width: 130, height: 82 },
      { id: 'documentStore', title: 'Doc store', subtitle: 'metadata + blobs', x: 890, y: 85, width: 112, height: 82 },
      { id: 'presence', title: 'Presence', subtitle: 'best-effort fanout', x: 890, y: 250, width: 112, height: 92 },
      { id: 'archive', title: 'History', subtitle: 'versions + audit', x: 890, y: 375, width: 112, height: 82 },
    ],
    mobileStages: [
      {
        label: 'Clients',
        nodes: [{ id: 'clients', title: 'Browsers', summary: 'optimistically apply local edits and send operations' }],
      },
      {
        label: 'Realtime edge',
        nodes: [{ id: 'gateway', title: 'WebSocket gateway', summary: 'keeps connections and routes by document id' }],
      },
      {
        label: 'Document coordination',
        nodes: [
          { id: 'room', title: 'Document room', summary: 'serializes operations for one document' },
          { id: 'transform', title: 'OT / CRDT', summary: 'repairs stale positions or merges offline edits' },
        ],
      },
      {
        label: 'Recovery',
        nodes: [
          { id: 'operationLog', title: 'Operation log', summary: 'durable ordered history' },
          { id: 'snapshot', title: 'Snapshotter', summary: 'periodic full-document checkpoints' },
        ],
      },
      {
        label: 'Storage + fanout',
        nodes: [
          { id: 'documentStore', title: 'Document store', summary: 'metadata, permissions, and current body blobs' },
          { id: 'presence', title: 'Presence fanout', summary: 'ephemeral cursors and viewer broadcast' },
          { id: 'archive', title: 'History', summary: 'version history and recovery data' },
        ],
      },
    ],
  },
  meters: [
    { id: 'roomThroughput', label: 'Room throughput' },
    { id: 'staleOperations', label: 'Stale-operation risk' },
    { id: 'operationLog', label: 'Operation log' },
    { id: 'presenceFanout', label: 'Presence fanout' },
    { id: 'recoveryCost', label: 'Recovery cost' },
  ],
  decisions: [
    { id: 'websocket', title: 'WebSocket edge' },
    { id: 'documentRoom', title: 'Document room' },
    { id: 'otOrCrdt', title: 'OT / CRDT' },
    { id: 'durableLog', title: 'Durable op log' },
    { id: 'snapshot', title: 'Snapshots' },
    { id: 'presence', title: 'Presence path' },
  ],
  sourceBackedRules: [
    {
      title: 'WebSocket fits low-latency bidirectional collaboration',
      source: 'MDN Web Docs',
      url: 'https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API',
      summary:
        'The browser and server both need to send messages without opening a fresh HTTP request for every edit or cursor update.',
    },
    {
      title: 'One authority per file keeps collaboration ordering understandable',
      source: 'Figma Engineering',
      url: 'https://www.figma.com/blog/how-figmas-multiplayer-technology-works/',
      summary:
        'Figma describes routing all clients for a file to a multiplayer server so the system has a clear coordination point for that file.',
    },
    {
      title: 'OT transforms operations generated against older versions',
      source: 'TinyMCE',
      url: 'https://www.tiny.cloud/blog/real-time-collaboration-ot-vs-crdt/',
      summary:
        'Operational Transformation adjusts incoming operations against changes that already happened, matching the stale-position risk in the lab.',
    },
    {
      title: 'CRDTs trade central transforms for mergeable data structures',
      source: 'System Design Sandbox',
      url: 'https://www.systemdesignsandbox.com/learn/ot-vs-crdt',
      summary:
        'CRDT-based editors attach stable ordering metadata so replicas can merge edits and converge even when operations arrive in different orders.',
    },
  ],
  teachingAssumptions: [
    'The thresholds are teaching thresholds, not Google production numbers.',
    'One document room is the ordering point for edits; large read or presence fanout can be split away from that room.',
    'Presence is modeled as best effort because cursor updates are ephemeral, unlike document operations.',
  ],
  analyze: analyzeGoogleDocsWorkload,
};

function analyzeGoogleDocsWorkload(workload: WorkloadValues): LabAnalysis {
  const concurrentEditors = numericValue(workload, 'concurrentEditors');
  const operationsPerEditorSecond = numericValue(workload, 'operationsPerEditorSecond');
  const documentSizeKilobytes = numericValue(workload, 'documentSizeKilobytes');
  const offlineSeconds = numericValue(workload, 'offlineSeconds');
  const offlineMinutes = offlineSeconds / 60;
  const presenceUpdatesSecond = numericValue(workload, 'presenceUpdatesSecond');
  const viewerFanout = numericValue(workload, 'viewerFanout');
  const durableAck = Boolean(workload.durableAck);

  const editOperationsPerSecond = concurrentEditors * operationsPerEditorSecond;
  const presenceMessagesPerSecond =
    concurrentEditors * presenceUpdatesSecond * Math.max(1, Math.log10(viewerFanout + 1));
  const staleOperationRisk = Math.min(1.6, (offlineMinutes / 90) + (concurrentEditors / 80));
  const operationLogMegabytesPerHour =
    (editOperationsPerSecond * 3600 * operationBytes) / (1024 * 1024);
  const recoveryMegabytes =
    documentSizeKilobytes / 1024 + operationLogMegabytesPerHour * Math.max(1, offlineMinutes / 60);

  const needsRealtimeGateway = concurrentEditors > 1 || editOperationsPerSecond >= 2;
  const needsDocumentRoom = concurrentEditors > 1 || editOperationsPerSecond >= 5;
  const needsTransform = concurrentEditors > 1 || offlineMinutes > 0;
  const needsDurableLog = durableAck || concurrentEditors > 2 || offlineMinutes > 0;
  const needsSnapshot = recoveryMegabytes > fastRecoveryLogBudgetMegabytes || documentSizeKilobytes > 1024;
  const needsPresenceFanout =
    presenceMessagesPerSecond > presenceFanoutBudgetPerSecond * 0.35 || viewerFanout >= 2_000;
  const needsHistoryArchive = needsDurableLog && (offlineMinutes >= 30 || documentSizeKilobytes >= 512);

  return {
    architectureTitle: chooseArchitectureTitle({
      needsRealtimeGateway,
      needsDocumentRoom,
      needsTransform,
      needsDurableLog,
      needsSnapshot,
      needsPresenceFanout,
    }),
    architectureSummary: chooseArchitectureSummary({
      needsRealtimeGateway,
      needsDocumentRoom,
      needsTransform,
      needsDurableLog,
      needsSnapshot,
      needsPresenceFanout,
    }),
    architecturePath: chooseArchitecturePath({
      needsRealtimeGateway,
      needsDocumentRoom,
      needsTransform,
      needsDurableLog,
      needsSnapshot,
      needsPresenceFanout,
    }),
    nodeStates: {
      clients: 'ok',
      gateway: stateWhen(needsRealtimeGateway),
      room: stateWhen(needsDocumentRoom),
      transform: stateWhen(needsTransform),
      operationLog: durableAck ? 'needed' : stateWhen(needsDurableLog),
      snapshot: stateWhen(needsSnapshot),
      documentStore: 'ok',
      presence: stateWhen(needsPresenceFanout || presenceUpdatesSecond > 0),
      archive: stateWhen(needsHistoryArchive),
    },
    flowStates: {
      clientsToGateway: needsRealtimeGateway ? 'active' : 'inactive',
      gatewayToRoom: needsDocumentRoom ? 'active' : 'inactive',
      roomToTransform: needsTransform ? 'active' : 'inactive',
      transformToLog: needsDurableLog ? 'active' : 'inactive',
      logToSnapshot: needsSnapshot ? 'active' : 'inactive',
      snapshotToStore: needsSnapshot ? 'active' : 'inactive',
      roomToStore: needsDurableLog ? 'active' : 'inactive',
      roomToPresence: needsPresenceFanout || presenceUpdatesSecond > 0 ? 'active' : 'inactive',
      presenceToGateway: needsPresenceFanout ? 'warning' : presenceUpdatesSecond > 0 ? 'active' : 'inactive',
      directToStore: needsRealtimeGateway ? 'inactive' : 'active',
    },
    meters: {
      roomThroughput: {
        ratio: editOperationsPerSecond / roomOperationBudgetPerSecond,
        valueText: `${formatRate(editOperationsPerSecond)} ops/s`,
        copy: `${formatCount(concurrentEditors)} active ${pluralize(
          'editor',
          concurrentEditors,
        )} at ${operationsPerEditorSecond.toFixed(
          1,
        )} operations per second each.`,
      },
      staleOperations: {
        ratio: staleOperationRisk,
        valueText: offlineMinutes === 0 ? 'live only' : formatDuration(offlineSeconds),
        copy: 'More editors and longer offline windows increase the chance that baseVersion is stale.',
      },
      operationLog: {
        ratio: operationLogMegabytesPerHour / fastRecoveryLogBudgetMegabytes,
        valueText: `${formatStorageGigabytes(operationLogMegabytesPerHour / 1024)}/hr`,
        copy: 'Append-only operation history grows with edit rate even when the current document body is small.',
      },
      presenceFanout: {
        ratio: presenceMessagesPerSecond / presenceFanoutBudgetPerSecond,
        valueText: `${formatRate(presenceMessagesPerSecond)} msg/s`,
        copy: 'Cursor and selection updates multiply by editors and viewers, so they should stay best-effort.',
      },
      recoveryCost: {
        ratio: recoveryMegabytes / fastRecoveryLogBudgetMegabytes,
        valueText: `${formatStorageGigabytes(recoveryMegabytes / 1024)}`,
        copy: `${formatKilobytes(documentSizeKilobytes)} document plus operation replay since the last useful checkpoint.`,
      },
    },
    decisions: buildDecisions({
      needsRealtimeGateway,
      needsDocumentRoom,
      needsTransform,
      needsDurableLog,
      needsSnapshot,
      needsPresenceFanout,
      durableAck,
      offlineMinutes,
    }),
    reasons: buildReasons({
      concurrentEditors,
      editOperationsPerSecond,
      offlineMinutes,
      operationLogMegabytesPerHour,
      presenceMessagesPerSecond,
      needsRealtimeGateway,
      needsDocumentRoom,
      needsTransform,
      needsDurableLog,
      needsSnapshot,
      needsPresenceFanout,
      durableAck,
    }),
  };
}

function buildReasons(analysis: {
  concurrentEditors: number;
  editOperationsPerSecond: number;
  offlineMinutes: number;
  operationLogMegabytesPerHour: number;
  presenceMessagesPerSecond: number;
  needsRealtimeGateway: boolean;
  needsDocumentRoom: boolean;
  needsTransform: boolean;
  needsDurableLog: boolean;
  needsSnapshot: boolean;
  needsPresenceFanout: boolean;
  durableAck: boolean;
}): LabReason[] {
  const reasons: LabReason[] = [];

  if (analysis.needsDocumentRoom) {
    reasons.push({
      severity: analysis.concurrentEditors > 100 ? 'warning' : 'ok',
      text: `${formatCount(
        analysis.concurrentEditors,
      )} editors create ${formatRate(
        analysis.editOperationsPerSecond,
      )} ops/s. All operations for one document need one authoritative order before broadcast.`,
    });
  } else {
    reasons.push({
      severity: 'ok',
      text: 'With one editor and no realtime fanout, saving the latest body is still a defensible starting point.',
    });
  }

  if (analysis.needsTransform) {
    reasons.push({
      severity: analysis.offlineMinutes >= 60 ? 'danger' : 'warning',
      text: `Operations can arrive with stale base versions${
        analysis.offlineMinutes > 0 ? ` after ${Math.round(analysis.offlineMinutes)} offline minutes` : ''
      }. The system needs OT-style transform or CRDT-style merge rules.`,
    });
  }

  if (analysis.needsDurableLog) {
    reasons.push({
      severity: analysis.durableAck ? 'warning' : 'ok',
      text: analysis.durableAck
        ? 'Ack-after-append protects confirmed edits from room crashes, at the cost of one durable write on the critical path.'
        : 'An operation log becomes useful once history, retries, or offline reconciliation matter.',
    });
  }

  if (analysis.needsSnapshot) {
    reasons.push({
      severity: 'warning',
      text: `${formatStorageGigabytes(
        analysis.operationLogMegabytesPerHour / 1024,
      )} of operation history per hour makes replay-only recovery slow. Snapshots cap open and recovery time.`,
    });
  }

  if (analysis.needsPresenceFanout) {
    reasons.push({
      severity: analysis.presenceMessagesPerSecond > presenceFanoutBudgetPerSecond ? 'danger' : 'warning',
      text: `Presence traffic is about ${formatRate(
        analysis.presenceMessagesPerSecond,
      )} messages/s in the teaching model. Cursor updates should be best-effort and split away from durable document operations.`,
    });
  }

  return reasons.slice(0, 6);
}

function buildDecisions(flags: {
  needsRealtimeGateway: boolean;
  needsDocumentRoom: boolean;
  needsTransform: boolean;
  needsDurableLog: boolean;
  needsSnapshot: boolean;
  needsPresenceFanout: boolean;
  durableAck: boolean;
  offlineMinutes: number;
}): Record<string, { state: DecisionState; copy: string }> {
  return {
    websocket: {
      state: flags.needsRealtimeGateway ? 'needed' : 'not-yet',
      copy: flags.needsRealtimeGateway
        ? 'Use a WebSocket edge because clients and server both push edits and cursor updates continuously.'
        : 'Plain save/load requests are enough until another collaborator needs low-latency updates.',
    },
    documentRoom: {
      state: flags.needsDocumentRoom ? 'needed' : 'not-yet',
      copy: flags.needsDocumentRoom
        ? 'Route one document to one room or actor so operations receive one authoritative version order.'
        : 'Do not add an owner process yet; a single-writer save path is simpler for solo editing.',
    },
    otOrCrdt: {
      state: flags.needsTransform ? 'needed' : 'not-yet',
      copy: flags.needsTransform
        ? `Use OT or CRDT rules because operations may be based on older versions${
            flags.offlineMinutes > 0 ? ' after offline edits' : ''
          }.`
        : 'No concurrent edits means there is no stale-position problem to solve yet.',
    },
    durableLog: {
      state: flags.needsDurableLog ? 'needed' : 'not-yet',
      copy: flags.durableAck
        ? 'Append before ack so confirmed edits can be replayed after a room crash.'
        : 'A log is optional while losing an unconfirmed edit is acceptable and history is small.',
    },
    snapshot: {
      state: flags.needsSnapshot ? 'needed' : 'useful',
      copy: flags.needsSnapshot
        ? 'Create periodic snapshots so open, replay, and recovery do not scan the whole operation history.'
        : 'Snapshots are useful but can be infrequent while documents and histories are small.',
    },
    presence: {
      state: flags.needsPresenceFanout ? 'tradeoff' : 'useful',
      copy: flags.needsPresenceFanout
        ? 'Split presence into a best-effort fanout path so cursors do not compete with durable edits.'
        : 'Presence can share the room while fanout is small, but it should still stay out of the durable log.',
    },
  };
}

function chooseArchitectureTitle(flags: {
  needsRealtimeGateway: boolean;
  needsDocumentRoom: boolean;
  needsTransform: boolean;
  needsDurableLog: boolean;
  needsSnapshot: boolean;
  needsPresenceFanout: boolean;
}): string {
  if (!flags.needsRealtimeGateway) {
    return 'Single document service + document store';
  }
  if (!flags.needsTransform && !flags.needsDurableLog) {
    return 'WebSocket gateway + document room';
  }
  if (!flags.needsSnapshot && !flags.needsPresenceFanout) {
    return 'Document room + OT + durable operation log';
  }
  if (!flags.needsPresenceFanout) {
    return 'Document room + operation log + snapshots';
  }
  return 'Document room + durable edits + separate presence fanout';
}

function chooseArchitectureSummary(flags: {
  needsRealtimeGateway: boolean;
  needsDocumentRoom: boolean;
  needsTransform: boolean;
  needsDurableLog: boolean;
  needsSnapshot: boolean;
  needsPresenceFanout: boolean;
}): string {
  if (!flags.needsRealtimeGateway) {
    return 'The simplest system can load a document, accept one writer, and save the latest body. No realtime coordination is justified yet.';
  }
  if (!flags.needsTransform && !flags.needsDurableLog) {
    return 'Low-latency collaboration needs a persistent channel and one room to broadcast edits, but history and recovery are still light.';
  }
  if (!flags.needsSnapshot && !flags.needsPresenceFanout) {
    return 'The room serializes operations, transform logic repairs stale positions, and a log lets clients replay missed edits.';
  }
  if (!flags.needsPresenceFanout) {
    return 'Operation history now needs snapshots so open and recovery time stay bounded as the document evolves.';
  }
  return 'The edit room remains the ordering authority, while snapshots, durable logs, and best-effort presence fanout scale different concerns separately.';
}

function chooseArchitecturePath(flags: {
  needsRealtimeGateway: boolean;
  needsDocumentRoom: boolean;
  needsTransform: boolean;
  needsDurableLog: boolean;
  needsSnapshot: boolean;
  needsPresenceFanout: boolean;
}): string {
  if (!flags.needsRealtimeGateway) {
    return 'Browser -> document service -> document store';
  }
  if (!flags.needsDocumentRoom) {
    return 'Browser -> WebSocket gateway -> document store';
  }
  if (!flags.needsTransform) {
    return 'Browser -> WebSocket gateway -> document room -> document store';
  }
  if (!flags.needsSnapshot && !flags.needsPresenceFanout) {
    return 'Browser -> gateway -> document room -> OT -> operation log';
  }
  if (!flags.needsPresenceFanout) {
    return 'Browser -> gateway -> room -> OT -> op log -> snapshots';
  }
  return 'Browser -> gateway -> room -> durable edits + presence fanout + snapshots';
}

function stateWhen(needed: boolean): NodeState {
  return needed ? 'needed' : 'inactive';
}

function numericValue(workload: WorkloadValues, key: string): number {
  const value = workload[key];
  return typeof value === 'number' ? value : 0;
}

function pluralize(unit: string, value: number): string {
  return Math.round(value) === 1 ? unit : `${unit}s`;
}

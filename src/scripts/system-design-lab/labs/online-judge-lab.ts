import {
  formatCount,
  formatDuration,
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

const comfortableWorkerSlots = 250;
const resultLookupBudgetPerSecond = 50_000;
const testBlobReadBudgetPerSecond = 25_000;
const metadataRowsPerGigabyte = 1_200_000;

export const onlineJudgeLabDefinition: SystemDesignLabDefinition = {
  id: 'leetcode-online-judge',
  eyebrow: 'System Design Lab',
  title: 'Online Judge scaling is mostly worker economics, not API traffic.',
  summary:
    'Move the sliders from a toy judge to a LeetCode-like workload. The design changes when compilation and sandboxed execution dominate: submit asynchronously, queue work, prewarm containers, cache immutable results, and split heavy submit from light run-code traffic.',
  articleHref: '/blog/system-design/leetcode-online-judge/',
  controls: [
    {
      id: 'submissionsPerMinute',
      label: 'Submissions',
      help: 'Formal submit requests entering the judge pipeline.',
      min: 1,
      max: 200_000,
      defaultValue: 240,
      scale: 'log',
      format: 'requests-per-minute',
    },
    {
      id: 'workerSecondsPerSubmission',
      label: 'Worker time',
      help: 'Average compile plus test execution time for one submission.',
      min: 0.2,
      max: 60,
      defaultValue: 2,
      scale: 'log',
      format: 'duration-seconds',
    },
    {
      id: 'testCasesPerSubmission',
      label: 'Test cases',
      help: 'How many tests a full submission may run before a final verdict.',
      min: 1,
      max: 500,
      defaultValue: 40,
      scale: 'log',
      unit: 'cases',
      format: 'count',
    },
    {
      id: 'languageCount',
      label: 'Languages',
      help: 'Each language tends to need its own runtime image and warm pool.',
      min: 1,
      max: 30,
      defaultValue: 6,
      scale: 'linear',
      unit: 'languages',
      format: 'count',
    },
    {
      id: 'resultPollsPerSubmission',
      label: 'Result polls',
      help: 'Average GET /submissions/{token} calls before the user sees a final result.',
      min: 1,
      max: 30,
      defaultValue: 4,
      scale: 'linear',
      unit: 'polls',
      format: 'count',
    },
    {
      id: 'queueSlaSeconds',
      label: 'Queue wait target',
      help: 'How long users should wait in queue before execution starts.',
      min: 1,
      max: 600,
      defaultValue: 30,
      scale: 'log',
      format: 'duration-seconds',
    },
  ],
  toggles: [
    {
      id: 'strictSandbox',
      label: 'Strict sandbox isolation',
      help: 'User code runs with resource limits, filesystem isolation, and blocked dangerous syscalls.',
      defaultValue: true,
    },
    {
      id: 'persistEverySubmission',
      label: 'Persist every submission',
      help: 'The final verdict and source metadata must survive cache expiry and worker failure.',
      defaultValue: true,
    },
  ],
  scenarios: [
    {
      id: 'toy',
      step: '01',
      title: 'Toy judge',
      summary: 'A synchronous prototype is still possible.',
      values: {
        submissionsPerMinute: 4,
        workerSecondsPerSubmission: 0.4,
        testCasesPerSubmission: 5,
        languageCount: 1,
        resultPollsPerSubmission: 1,
        queueSlaSeconds: 30,
        strictSandbox: false,
        persistEverySubmission: false,
      },
    },
    {
      id: 'async',
      step: '02',
      title: 'Async submit',
      summary: 'POST returns a token; workers finish later.',
      values: {
        submissionsPerMinute: 240,
        workerSecondsPerSubmission: 2,
        testCasesPerSubmission: 40,
        languageCount: 6,
        resultPollsPerSubmission: 4,
        queueSlaSeconds: 30,
        strictSandbox: true,
        persistEverySubmission: true,
      },
    },
    {
      id: 'contest',
      step: '03',
      title: 'Contest spike',
      summary: 'Queue depth, not API CPU, controls user wait time.',
      values: {
        submissionsPerMinute: 8_000,
        workerSecondsPerSubmission: 3,
        testCasesPerSubmission: 80,
        languageCount: 8,
        resultPollsPerSubmission: 6,
        queueSlaSeconds: 20,
        strictSandbox: true,
        persistEverySubmission: true,
      },
    },
    {
      id: 'many-languages',
      step: '04',
      title: 'Many languages',
      summary: 'Runtime images and cold starts push toward language-specific pools.',
      values: {
        submissionsPerMinute: 18_000,
        workerSecondsPerSubmission: 4,
        testCasesPerSubmission: 120,
        languageCount: 20,
        resultPollsPerSubmission: 7,
        queueSlaSeconds: 18,
        strictSandbox: true,
        persistEverySubmission: true,
      },
    },
    {
      id: 'leetcode-scale',
      step: '05',
      title: 'LeetCode scale',
      summary: 'Workers, result cache, metadata partitions, and queue isolation all matter.',
      values: {
        submissionsPerMinute: 90_000,
        workerSecondsPerSubmission: 5,
        testCasesPerSubmission: 200,
        languageCount: 24,
        resultPollsPerSubmission: 8,
        queueSlaSeconds: 12,
        strictSandbox: true,
        persistEverySubmission: true,
      },
    },
  ],
  diagram: {
    title: 'Online Judge architecture diagram',
    description:
      'Whiteboard-style architecture diagram for asynchronous code submission, queueing, sandbox workers, result cache, and persistent submission metadata.',
    viewBox: '0 0 1040 560',
    zones: [
      { id: 'clients', label: 'Clients', x: 20, y: 70, width: 150, height: 360, variant: 'clients' },
      { id: 'api', label: 'API', x: 210, y: 45, width: 185, height: 410, variant: 'edge' },
      { id: 'queue', label: 'Queueing', x: 435, y: 70, width: 170, height: 385, variant: 'backbone' },
      { id: 'execution', label: 'Execution', x: 645, y: 70, width: 185, height: 385, variant: 'processing' },
      { id: 'storage', label: 'Storage + results', x: 870, y: 45, width: 150, height: 440, variant: 'storage' },
    ],
    flows: [
      { id: 'clientToApi', path: 'M155 245 C190 245 190 160 225 160', variant: 'primary' },
      { id: 'apiToQueue', path: 'M365 160 C405 160 405 205 450 205', variant: 'primary' },
      { id: 'queueToScheduler', path: 'M570 205 C615 205 615 175 660 175', variant: 'primary' },
      { id: 'schedulerToWorkers', path: 'M735 222 L735 285', variant: 'primary' },
      { id: 'workersToContainers', path: 'M735 365 L735 425', variant: 'primary' },
      { id: 'apiToMetadata', path: 'M365 175 C545 112 742 110 885 120', variant: 'secondary' },
      { id: 'workersToResultCache', path: 'M820 330 C850 315 852 270 885 270', variant: 'secondary' },
      { id: 'workersToMetadata', path: 'M820 315 C850 250 852 150 885 125', variant: 'secondary' },
      { id: 'workersToObjectStore', path: 'M820 355 C855 385 860 420 885 420', variant: 'secondary' },
      { id: 'pollToResultCache', path: 'M155 260 C420 500 720 300 885 270', variant: 'direct' },
      { id: 'syncDirect', path: 'M155 276 C420 210 540 325 660 325', variant: 'direct' },
    ],
    nodes: [
      { id: 'client', title: 'User', subtitle: 'submit + poll', x: 48, y: 210, width: 108, height: 92 },
      { id: 'api', title: 'API server', subtitle: '202 token + status', x: 225, y: 125, width: 140, height: 92 },
      { id: 'metadataDb', title: 'Submission DB', subtitle: 'append metadata', x: 885, y: 85, width: 120, height: 86 },
      { id: 'queue', title: 'Queue', subtitle: 'backpressure', x: 450, y: 165, width: 120, height: 90 },
      { id: 'scheduler', title: 'Scheduler', subtitle: 'priority + fairness', x: 660, y: 135, width: 150, height: 92 },
      { id: 'workers', title: 'Worker pool', subtitle: 'compile + run', x: 660, y: 285, width: 150, height: 96 },
      { id: 'containers', title: 'Warm runners', subtitle: 'per language', x: 660, y: 420, width: 150, height: 82 },
      { id: 'resultCache', title: 'Result cache', subtitle: 'immutable verdicts', x: 885, y: 250, width: 120, height: 90 },
      { id: 'objectStore', title: 'Object store', subtitle: 'code + tests', x: 885, y: 400, width: 120, height: 82 },
    ],
    mobileStages: [
      {
        label: 'Clients',
        nodes: [{ id: 'client', title: 'User', summary: 'submits code and polls for immutable verdicts' }],
      },
      {
        label: 'API',
        nodes: [{ id: 'api', title: 'API server', summary: 'validates request, stores metadata, and returns a token' }],
      },
      {
        label: 'Queueing',
        nodes: [{ id: 'queue', title: 'Queue', summary: 'absorbs spikes and gives workers a pull-based backlog' }],
      },
      {
        label: 'Execution',
        nodes: [
          { id: 'scheduler', title: 'Scheduler', summary: 'applies fairness, priority, and queue selection' },
          { id: 'workers', title: 'Worker pool', summary: 'CPU and memory heavy compilation and execution' },
          { id: 'containers', title: 'Warm runners', summary: 'language-specific sandbox containers' },
        ],
      },
      {
        label: 'Storage + results',
        nodes: [
          { id: 'metadataDb', title: 'Submission DB', summary: 'durable append-only verdict history' },
          { id: 'resultCache', title: 'Result cache', summary: 'cheap polling reads with TTL' },
          { id: 'objectStore', title: 'Object store', summary: 'large source, problem, and testcase blobs' },
        ],
      },
    ],
  },
  meters: [
    { id: 'workerCapacity', label: 'Worker capacity' },
    { id: 'queuePressure', label: 'Queue pressure' },
    { id: 'resultLookup', label: 'Result lookup' },
    { id: 'sandboxPool', label: 'Sandbox pool' },
    { id: 'submissionStorage', label: 'Submission storage' },
  ],
  decisions: [
    { id: 'asyncApi', title: 'Async API' },
    { id: 'messageQueue', title: 'Message queue' },
    { id: 'prewarmedContainers', title: 'Pre-warmed runners' },
    { id: 'sandbox', title: 'Sandbox isolation' },
    { id: 'resultCache', title: 'Result cache' },
    { id: 'runSubmitSplit', title: 'Run / submit split' },
  ],
  sourceBackedRules: [
    {
      title: 'Container resource limits are the unit of TLE and MLE enforcement',
      source: 'Docker Docs',
      url: 'https://docs.docker.com/engine/containers/resource_constraints/',
      summary:
        'CPU and memory limits give worker infrastructure a concrete way to stop submissions that exceed problem constraints.',
    },
    {
      title: 'Seccomp reduces the syscall surface for untrusted code',
      source: 'Docker Docs',
      url: 'https://docs.docker.com/engine/security/seccomp/',
      summary:
        'A sandbox should block dangerous system calls instead of merely trusting language runtimes or process permissions.',
    },
    {
      title: 'Queues decouple submit traffic from worker execution',
      source: 'AWS SQS Docs',
      url: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html',
      summary:
        'A queue absorbs bursts and lets workers consume at their own pace, which matches asynchronous judging.',
    },
    {
      title: 'TTL-backed key-value results make polling cheap',
      source: 'Redis Docs',
      url: 'https://redis.io/docs/latest/commands/expire/',
      summary:
        'A final verdict is immutable, so short polling can read a small cached object until the key expires.',
    },
  ],
  teachingAssumptions: [
    'Worker slot thresholds are teaching thresholds; real capacity depends on language mix, testcase size, CPU model, and isolation overhead.',
    'The result cache stores final or in-progress verdict objects, not the source code blob.',
    'Kafka is deliberately not required here unless the design needs replay, analytics fanout, or multiple consumers.',
  ],
  analyze: analyzeOnlineJudgeWorkload,
};

function analyzeOnlineJudgeWorkload(workload: WorkloadValues): LabAnalysis {
  const submissionsPerMinute = numericValue(workload, 'submissionsPerMinute');
  const workerSecondsPerSubmission = numericValue(workload, 'workerSecondsPerSubmission');
  const testCasesPerSubmission = numericValue(workload, 'testCasesPerSubmission');
  const languageCount = numericValue(workload, 'languageCount');
  const resultPollsPerSubmission = numericValue(workload, 'resultPollsPerSubmission');
  const queueSlaSeconds = numericValue(workload, 'queueSlaSeconds');
  const strictSandbox = Boolean(workload.strictSandbox);
  const persistEverySubmission = Boolean(workload.persistEverySubmission);

  const submissionsPerSecond = submissionsPerMinute / 60;
  const workerSlotDemand = submissionsPerSecond * workerSecondsPerSubmission;
  const workerPressure = workerSlotDemand / comfortableWorkerSlots;
  const pollingReadsPerSecond = submissionsPerSecond * resultPollsPerSubmission;
  const testBlobReadsPerSecond = submissionsPerSecond * testCasesPerSubmission;
  const dailySubmissions = submissionsPerMinute * 60 * 24;
  const submissionMetadataGigabytesPerDay = dailySubmissions / metadataRowsPerGigabyte;
  const coldStartRisk = languageCount / 8 + Math.max(0, 15 - queueSlaSeconds) / 15;

  const needsAsyncApi = workerSecondsPerSubmission > 0.8 || submissionsPerMinute >= 30;
  const needsQueue = needsAsyncApi || workerPressure > 0.05;
  const needsWorkers = workerSlotDemand >= 1 || languageCount > 1;
  const needsPrewarmedContainers =
    strictSandbox && (languageCount > 2 || queueSlaSeconds <= 45 || workerSlotDemand > 20);
  const needsResultCache = pollingReadsPerSecond >= 5 || resultPollsPerSubmission > 1;
  const needsPersistentMetadata = persistEverySubmission || submissionMetadataGigabytesPerDay >= 1;
  const needsPriorityScheduling = submissionsPerMinute >= 5_000 || queueSlaSeconds <= 20;
  const needsObjectStore = testCasesPerSubmission >= 10 || languageCount > 1;

  return {
    architectureTitle: chooseArchitectureTitle({
      needsAsyncApi,
      needsQueue,
      needsPrewarmedContainers,
      needsPriorityScheduling,
      needsResultCache,
    }),
    architectureSummary: chooseArchitectureSummary({
      needsAsyncApi,
      needsQueue,
      needsPrewarmedContainers,
      needsPriorityScheduling,
      needsResultCache,
    }),
    architecturePath: chooseArchitecturePath({
      needsAsyncApi,
      needsQueue,
      needsPrewarmedContainers,
      needsPriorityScheduling,
      needsResultCache,
    }),
    nodeStates: {
      client: 'ok',
      api: 'ok',
      metadataDb: stateFor(needsPersistentMetadata),
      queue: stateFor(needsQueue),
      scheduler: stateFor(needsPriorityScheduling),
      workers: needsWorkers ? (workerPressure > 1 ? 'overloaded' : 'needed') : 'inactive',
      containers: stateFor(needsPrewarmedContainers),
      resultCache: stateFor(needsResultCache),
      objectStore: stateFor(needsObjectStore),
    },
    flowStates: {
      clientToApi: 'active',
      apiToQueue: needsQueue ? 'active' : 'inactive',
      queueToScheduler: needsPriorityScheduling ? 'active' : needsQueue ? 'active' : 'inactive',
      schedulerToWorkers: needsQueue || needsWorkers ? 'active' : 'inactive',
      workersToContainers: needsPrewarmedContainers ? 'active' : 'inactive',
      apiToMetadata: needsPersistentMetadata ? 'active' : 'inactive',
      workersToResultCache: needsResultCache ? 'active' : 'inactive',
      workersToMetadata: needsPersistentMetadata ? 'active' : 'inactive',
      workersToObjectStore: needsObjectStore ? 'active' : 'inactive',
      pollToResultCache: needsResultCache ? 'active' : 'inactive',
      syncDirect: needsAsyncApi ? 'inactive' : 'active',
    },
    meters: {
      workerCapacity: {
        ratio: workerPressure,
        valueText: `${formatCount(workerSlotDemand)} slots`,
        copy: `${formatRate(submissionsPerSecond)} submissions/s times ${formatDuration(
          workerSecondsPerSubmission,
        )} average worker time.`,
      },
      queuePressure: {
        ratio: workerPressure * (30 / Math.max(queueSlaSeconds, 1)),
        valueText: formatDuration(queueSlaSeconds),
        copy: 'Tighter queue wait targets require more idle worker headroom before spikes arrive.',
      },
      resultLookup: {
        ratio: pollingReadsPerSecond / resultLookupBudgetPerSecond,
        valueText: `${formatRate(pollingReadsPerSecond)}/s`,
        copy: 'Polling stays cheap when it is a TTL key-value lookup against immutable verdict objects.',
      },
      sandboxPool: {
        ratio: coldStartRisk,
        valueText: `${formatCount(languageCount)} languages`,
        copy: 'More languages and tighter wait targets make cold starts visible to users.',
      },
      submissionStorage: {
        ratio: submissionMetadataGigabytesPerDay / 50,
        valueText: `${formatStorageGigabytes(submissionMetadataGigabytesPerDay)}/day`,
        copy: `${formatCount(dailySubmissions)} daily submission rows before source and testcase blobs.`,
      },
    },
    decisions: buildDecisions({
      needsAsyncApi,
      needsQueue,
      needsPrewarmedContainers,
      needsPriorityScheduling,
      needsResultCache,
      strictSandbox,
      persistEverySubmission,
    }),
    reasons: buildReasons({
      submissionsPerSecond,
      workerSecondsPerSubmission,
      workerSlotDemand,
      workerPressure,
      pollingReadsPerSecond,
      testBlobReadsPerSecond,
      languageCount,
      queueSlaSeconds,
      needsAsyncApi,
      needsQueue,
      needsPrewarmedContainers,
      needsPriorityScheduling,
      needsResultCache,
      strictSandbox,
      persistEverySubmission,
    }),
  };
}

function buildReasons(analysis: {
  submissionsPerSecond: number;
  workerSecondsPerSubmission: number;
  workerSlotDemand: number;
  workerPressure: number;
  pollingReadsPerSecond: number;
  testBlobReadsPerSecond: number;
  languageCount: number;
  queueSlaSeconds: number;
  needsAsyncApi: boolean;
  needsQueue: boolean;
  needsPrewarmedContainers: boolean;
  needsPriorityScheduling: boolean;
  needsResultCache: boolean;
  strictSandbox: boolean;
  persistEverySubmission: boolean;
}): LabReason[] {
  const reasons: LabReason[] = [];

  if (analysis.needsAsyncApi) {
    reasons.push({
      severity: 'warning',
      text: `Each submission holds worker resources for about ${formatDuration(
        analysis.workerSecondsPerSubmission,
      )}. Return 202 plus a token instead of keeping the API request open.`,
    });
  } else {
    reasons.push({
      severity: 'ok',
      text: 'A tiny prototype can run synchronously, but this stops being attractive as soon as execution time dominates request time.',
    });
  }

  if (analysis.needsQueue) {
    reasons.push({
      severity: analysis.workerPressure > 1 ? 'danger' : 'warning',
      text: `The workload needs about ${formatCount(
        analysis.workerSlotDemand,
      )} concurrent worker slots. Queue depth is the direct signal for scale-out.`,
    });
  }

  if (analysis.needsPrewarmedContainers) {
    reasons.push({
      severity: 'warning',
      text: `${formatCount(
        analysis.languageCount,
      )} supported languages make cold starts and image management visible. Keep language-specific warm runner pools.`,
    });
  }

  if (analysis.strictSandbox) {
    reasons.push({
      severity: 'warning',
      text: 'Strict sandboxing is non-negotiable for untrusted code: resource limits, filesystem/network isolation, and syscall filtering belong in the worker path.',
    });
  }

  if (analysis.needsResultCache) {
    reasons.push({
      severity: analysis.pollingReadsPerSecond > resultLookupBudgetPerSecond ? 'danger' : 'ok',
      text: `${formatRate(
        analysis.pollingReadsPerSecond,
      )} result polls/s should be cheap key-value reads. The verdict is immutable, so polling does not need to hit workers or heavy application logic.`,
    });
  }

  if (analysis.needsPriorityScheduling) {
    reasons.push({
      severity: 'warning',
      text: `A ${formatDuration(
        analysis.queueSlaSeconds,
      )} queue target under spike traffic needs priority queues or a split Run Code / Submit pipeline.`,
    });
  }

  if (analysis.testBlobReadsPerSecond > testBlobReadBudgetPerSecond * 0.6) {
    reasons.push({
      severity: analysis.testBlobReadsPerSecond > testBlobReadBudgetPerSecond ? 'danger' : 'warning',
      text: `${formatRate(
        analysis.testBlobReadsPerSecond,
      )} testcase reads/s should come from object storage or local worker cache, not from the metadata database.`,
    });
  }

  return reasons.slice(0, 7);
}

function buildDecisions(flags: {
  needsAsyncApi: boolean;
  needsQueue: boolean;
  needsPrewarmedContainers: boolean;
  needsPriorityScheduling: boolean;
  needsResultCache: boolean;
  strictSandbox: boolean;
  persistEverySubmission: boolean;
}): Record<string, { state: DecisionState; copy: string }> {
  return {
    asyncApi: {
      state: flags.needsAsyncApi ? 'needed' : 'not-yet',
      copy: flags.needsAsyncApi
        ? 'POST should return 202 and a token because compile and execution are much heavier than API validation.'
        : 'Synchronous execution is acceptable only for a local prototype with tiny jobs.',
    },
    messageQueue: {
      state: flags.needsQueue ? 'needed' : 'not-yet',
      copy: flags.needsQueue
        ? 'Use a queue to absorb spikes, apply backpressure, and let workers pull at their real capacity.'
        : 'A queue adds little value while there is no meaningful backlog or worker pool.',
    },
    prewarmedContainers: {
      state: flags.needsPrewarmedContainers ? 'needed' : 'useful',
      copy: flags.needsPrewarmedContainers
        ? 'Prewarm per-language runner containers so cold starts do not become false latency or TLE signals.'
        : 'Cold starts are tolerable while language count and latency expectations are small.',
    },
    sandbox: {
      state: flags.strictSandbox ? 'needed' : 'tradeoff',
      copy: flags.strictSandbox
        ? 'Run untrusted code inside constrained containers with CPU, memory, filesystem, network, and syscall boundaries.'
        : 'Turning sandboxing off is only acceptable for a trusted classroom prototype.',
    },
    resultCache: {
      state: flags.needsResultCache ? 'needed' : 'not-yet',
      copy: flags.needsResultCache
        ? 'Store in-progress and final verdict objects in a TTL cache so polling is a cheap lookup.'
        : 'The API can read its local result for a toy synchronous judge.',
    },
    runSubmitSplit: {
      state: flags.needsPriorityScheduling ? 'needed' : 'useful',
      copy: flags.needsPriorityScheduling
        ? 'Split Run Code from Submit so light sample runs do not block heavyweight judged submissions.'
        : 'A split pipeline is useful later, but one queue is enough before traffic classes diverge.',
    },
  };
}

function chooseArchitectureTitle(flags: {
  needsAsyncApi: boolean;
  needsQueue: boolean;
  needsPrewarmedContainers: boolean;
  needsPriorityScheduling: boolean;
  needsResultCache: boolean;
}): string {
  if (!flags.needsAsyncApi) {
    return 'Synchronous API prototype';
  }
  if (!flags.needsQueue) {
    return 'Async API with lightweight worker handoff';
  }
  if (!flags.needsPrewarmedContainers) {
    return 'Async submit + queue + worker pool';
  }
  if (!flags.needsPriorityScheduling && flags.needsResultCache) {
    return 'Queue-backed judge with warm sandbox runners';
  }
  return 'Priority queues + warm runner pools + cached verdicts';
}

function chooseArchitectureSummary(flags: {
  needsAsyncApi: boolean;
  needsQueue: boolean;
  needsPrewarmedContainers: boolean;
  needsPriorityScheduling: boolean;
  needsResultCache: boolean;
}): string {
  if (!flags.needsAsyncApi) {
    return 'For a toy workload, the API can execute and return a result directly. This is useful for proving the judging logic, not for production.';
  }
  if (!flags.needsQueue) {
    return 'The API should stop holding the client request open, but the worker path is still simple enough to hand off directly.';
  }
  if (!flags.needsPrewarmedContainers) {
    return 'The queue decouples user traffic from worker throughput. Scale decisions now follow queue depth and worker slot demand.';
  }
  if (!flags.needsPriorityScheduling && flags.needsResultCache) {
    return 'Workers pull jobs, run code in warm sandbox containers, and write immutable verdicts into a cache for polling.';
  }
  return 'At scale, independent queues, fair scheduling, warm language pools, result cache, and durable metadata protect each workload class from the others.';
}

function chooseArchitecturePath(flags: {
  needsAsyncApi: boolean;
  needsQueue: boolean;
  needsPrewarmedContainers: boolean;
  needsPriorityScheduling: boolean;
  needsResultCache: boolean;
}): string {
  if (!flags.needsAsyncApi) {
    return 'Client -> API -> local judge -> response';
  }
  if (!flags.needsQueue) {
    return 'Client -> API 202 token -> worker -> status';
  }
  if (!flags.needsPrewarmedContainers) {
    return 'Client -> API -> queue -> worker pool -> metadata DB';
  }
  if (!flags.needsPriorityScheduling && flags.needsResultCache) {
    return 'Client -> API -> queue -> warm runner -> result cache + DB';
  }
  return 'Client -> API -> priority queues -> scheduler -> warm runners -> cache + DB + blobs';
}

function stateFor(needed: boolean): NodeState {
  return needed ? 'needed' : 'inactive';
}

function numericValue(workload: WorkloadValues, key: string): number {
  const value = workload[key];
  return typeof value === 'number' ? value : 0;
}

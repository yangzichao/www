import {
  formatCount,
  formatRate,
  formatStorageGigabytes,
} from '../lab-formatters';
import type {
  DecisionState,
  LabAnalysis,
  LabReason,
  SystemDesignLabDefinition,
  WorkloadValues,
} from '../lab-types';

const atomicStoreBudgetPerSecond = 120_000;
const hotKeyComfortableRps = 5_000;
const stateBytesPerKey = 112;
const comfortableStateGigabytes = 4;

export const rateLimiterLabDefinition: SystemDesignLabDefinition = {
  id: 'rate-limiter',
  eyebrow: 'System Design Lab',
  title: 'Rate limiter design is a latency-sensitive atomic state problem.',
  summary:
    'Change request volume, quota, burst tolerance, key cardinality, hot-key skew, regions, and latency target. The architecture shifts from a local counter to Redis/Lua, sharded state, local pre-checks, and a quota service when global correctness matters.',
  articleHref: '/blog/system-design/rate-limiter/',
  controls: [
    {
      id: 'requestsPerSecond',
      label: 'Request rate',
      help: 'Synchronous allow/deny checks on the enforcement path.',
      min: 10,
      max: 1_000_000,
      defaultValue: 500,
      scale: 'log',
      format: 'requests-per-second',
    },
    {
      id: 'quotaPerMinute',
      label: 'Quota per key',
      help: 'Allowed requests for one enforcement key in a one-minute window.',
      min: 1,
      max: 100_000,
      defaultValue: 60,
      scale: 'log',
      format: 'requests-per-minute',
    },
    {
      id: 'burstAllowanceSeconds',
      label: 'Burst allowance',
      help: 'How much short burst above the steady quota should be tolerated.',
      min: 0,
      max: 300,
      defaultValue: 10,
      scale: 'linear',
      format: 'duration-seconds',
    },
    {
      id: 'apiServerCount',
      label: 'API servers',
      help: 'Independent servers making allow/deny decisions.',
      min: 1,
      max: 500,
      defaultValue: 4,
      scale: 'log',
      unit: 'servers',
      format: 'count',
    },
    {
      id: 'keyCardinality',
      label: 'Active keys',
      help: 'Distinct users, IPs, API keys, devices, or advertiser accounts with limiter state.',
      min: 100,
      max: 50_000_000,
      defaultValue: 25_000,
      scale: 'log',
      unit: 'keys',
      format: 'count',
    },
    {
      id: 'hottestKeyShare',
      label: 'Hottest key share',
      help: 'How much total traffic one abusive or popular key can own.',
      min: 0.1,
      max: 80,
      defaultValue: 3,
      scale: 'linear',
      format: 'percentage',
    },
    {
      id: 'globalRegions',
      label: 'Regions',
      help: 'Regions that must participate in enforcement.',
      min: 1,
      max: 20,
      defaultValue: 1,
      scale: 'linear',
      unit: 'regions',
      format: 'count',
    },
    {
      id: 'decisionLatencyMs',
      label: 'Decision latency target',
      help: 'Budget for the limiter check before the backend request continues.',
      min: 1,
      max: 200,
      defaultValue: 10,
      scale: 'log',
      format: 'milliseconds',
    },
  ],
  toggles: [
    {
      id: 'strictGlobalQuota',
      label: 'Strict global quota',
      help: 'Every region should share one precise quota instead of approximate regional budgets.',
      defaultValue: false,
    },
    {
      id: 'failClosedOnStoreError',
      label: 'Fail closed on store errors',
      help: 'Deny requests when limiter state is unavailable; safer for abuse, riskier for availability.',
      defaultValue: false,
    },
  ],
  scenarios: [
    {
      id: 'single-process',
      step: '01',
      title: 'Single process',
      summary: 'Local memory is enough for a small service.',
      values: {
        requestsPerSecond: 80,
        quotaPerMinute: 60,
        burstAllowanceSeconds: 10,
        apiServerCount: 1,
        keyCardinality: 500,
        hottestKeyShare: 5,
        globalRegions: 1,
        decisionLatencyMs: 20,
        strictGlobalQuota: false,
        failClosedOnStoreError: false,
      },
    },
    {
      id: 'api-fleet',
      step: '02',
      title: 'API fleet',
      summary: 'Multiple servers need one atomic check-and-update path.',
      values: {
        requestsPerSecond: 5_000,
        quotaPerMinute: 600,
        burstAllowanceSeconds: 20,
        apiServerCount: 12,
        keyCardinality: 120_000,
        hottestKeyShare: 2,
        globalRegions: 1,
        decisionLatencyMs: 10,
        strictGlobalQuota: false,
        failClosedOnStoreError: true,
      },
    },
    {
      id: 'bursty-api',
      step: '03',
      title: 'Bursty public API',
      summary: 'Token bucket behavior and local pre-checks reduce latency.',
      values: {
        requestsPerSecond: 80_000,
        quotaPerMinute: 1_200,
        burstAllowanceSeconds: 60,
        apiServerCount: 80,
        keyCardinality: 2_000_000,
        hottestKeyShare: 3,
        globalRegions: 2,
        decisionLatencyMs: 5,
        strictGlobalQuota: false,
        failClosedOnStoreError: false,
      },
    },
    {
      id: 'hot-key-abuse',
      step: '04',
      title: 'Hot key abuse',
      summary: 'One key can overload a shard unless it is isolated or bucketed.',
      values: {
        requestsPerSecond: 140_000,
        quotaPerMinute: 120,
        burstAllowanceSeconds: 10,
        apiServerCount: 120,
        keyCardinality: 800_000,
        hottestKeyShare: 40,
        globalRegions: 2,
        decisionLatencyMs: 8,
        strictGlobalQuota: false,
        failClosedOnStoreError: true,
      },
    },
    {
      id: 'global-strict',
      step: '05',
      title: 'Global strict quota',
      summary: 'Exact cross-region enforcement trades latency for correctness.',
      values: {
        requestsPerSecond: 300_000,
        quotaPerMinute: 600,
        burstAllowanceSeconds: 2,
        apiServerCount: 220,
        keyCardinality: 6_000_000,
        hottestKeyShare: 8,
        globalRegions: 6,
        decisionLatencyMs: 20,
        strictGlobalQuota: true,
        failClosedOnStoreError: true,
      },
    },
  ],
  diagram: {
    title: 'Rate limiter architecture diagram',
    description:
      'Whiteboard-style architecture diagram for synchronous rate-limit enforcement, local pre-checks, Redis Lua state, sharding, quota service, backend forwarding, and analytics events.',
    viewBox: '0 0 1040 560',
    zones: [
      { id: 'clients', label: 'Clients', x: 20, y: 70, width: 150, height: 360, variant: 'clients' },
      { id: 'edge', label: 'Edge / API', x: 210, y: 45, width: 190, height: 410, variant: 'edge' },
      { id: 'state', label: 'Limiter state', x: 440, y: 70, width: 190, height: 385, variant: 'backbone' },
      { id: 'quota', label: 'Coordination', x: 670, y: 70, width: 165, height: 385, variant: 'processing' },
      { id: 'service', label: 'Service + analytics', x: 875, y: 45, width: 145, height: 440, variant: 'storage' },
    ],
    flows: [
      { id: 'clientToGateway', path: 'M155 245 C190 245 190 155 225 155', variant: 'primary' },
      { id: 'gatewayToLocal', path: 'M300 195 L300 260', variant: 'primary' },
      { id: 'localToRedis', path: 'M375 310 C415 310 420 210 455 210', variant: 'primary' },
      { id: 'redisToShardRouter', path: 'M540 255 L540 330', variant: 'secondary' },
      { id: 'shardsToQuotaService', path: 'M620 370 C650 370 650 250 685 250', variant: 'secondary' },
      { id: 'quotaToBackend', path: 'M820 250 C850 250 850 160 890 160', variant: 'primary' },
      { id: 'gatewayToBackend', path: 'M375 165 C560 112 735 118 890 160', variant: 'direct' },
      { id: 'gatewayToEvents', path: 'M360 332 C520 455 730 438 890 420', variant: 'secondary' },
      { id: 'redisToBackend', path: 'M620 210 C720 172 790 160 890 160', variant: 'primary' },
      { id: 'quotaToEvents', path: 'M760 295 C805 360 840 405 890 420', variant: 'secondary' },
    ],
    nodes: [
      { id: 'client', title: 'Client', subtitle: 'request burst', x: 48, y: 210, width: 108, height: 92 },
      { id: 'gateway', title: 'API gateway', subtitle: 'enforce before app', x: 225, y: 120, width: 150, height: 90 },
      { id: 'localLimiter', title: 'Local check', subtitle: 'cheap prefilter', x: 225, y: 260, width: 150, height: 88 },
      { id: 'redis', title: 'Redis Lua', subtitle: 'atomic state update', x: 455, y: 175, width: 140, height: 90 },
      { id: 'shards', title: 'Shard router', subtitle: 'key -> state shard', x: 455, y: 330, width: 140, height: 88 },
      { id: 'quotaService', title: 'Quota service', subtitle: 'global budgets', x: 685, y: 220, width: 130, height: 92 },
      { id: 'backend', title: 'Backend', subtitle: 'only allowed traffic', x: 890, y: 125, width: 112, height: 86 },
      { id: 'events', title: 'Events', subtitle: 'abuse + tuning', x: 890, y: 400, width: 112, height: 82 },
    ],
    mobileStages: [
      {
        label: 'Clients',
        nodes: [{ id: 'client', title: 'Client', summary: 'sends traffic that must receive a synchronous allow or deny' }],
      },
      {
        label: 'Edge / API',
        nodes: [
          { id: 'gateway', title: 'API gateway', summary: 'runs enforcement before the backend call' },
          { id: 'localLimiter', title: 'Local pre-check', summary: 'fast in-process check for low-risk or cached state' },
        ],
      },
      {
        label: 'Limiter state',
        nodes: [
          { id: 'redis', title: 'Redis Lua', summary: 'atomic check-and-update for distributed servers' },
          { id: 'shards', title: 'Shard router', summary: 'spreads key state and isolates hot keys' },
        ],
      },
      {
        label: 'Coordination',
        nodes: [{ id: 'quotaService', title: 'Quota service', summary: 'coordinates strict global or regional budgets' }],
      },
      {
        label: 'Service + analytics',
        nodes: [
          { id: 'backend', title: 'Backend', summary: 'receives only allowed traffic' },
          { id: 'events', title: 'Events', summary: 'records decisions for abuse analysis and tuning' },
        ],
      },
    ],
  },
  meters: [
    { id: 'atomicPath', label: 'Atomic path load' },
    { id: 'hotKey', label: 'Hot-key pressure' },
    { id: 'stateMemory', label: 'State memory' },
    { id: 'crossRegion', label: 'Cross-region correctness' },
    { id: 'latencyBudget', label: 'Latency budget' },
  ],
  decisions: [
    { id: 'algorithm', title: 'Limiter algorithm' },
    { id: 'localMemory', title: 'Local memory' },
    { id: 'redisLua', title: 'Redis + Lua' },
    { id: 'sharding', title: 'State sharding' },
    { id: 'globalQuota', title: 'Global quota' },
    { id: 'failMode', title: 'Fail mode' },
  ],
  sourceBackedRules: [
    {
      title: 'Atomic increment plus expiry is the simple rate-limiter baseline',
      source: 'Redis Docs',
      url: 'https://redis.io/docs/latest/commands/incr/',
      summary:
        'Redis documents counter-based rate limiter patterns using INCR and key expiry, which matches the single-window baseline.',
    },
    {
      title: 'Lua scripts make check-and-update atomic on one Redis shard',
      source: 'Redis Docs',
      url: 'https://redis.io/docs/latest/develop/programmability/eval-intro/',
      summary:
        'A limiter should not perform read, compute, and write as separate network operations when many API servers are racing.',
    },
    {
      title: 'Production rate limiting is usually enforced before the origin',
      source: 'Cloudflare Docs',
      url: 'https://developers.cloudflare.com/waf/rate-limiting-rules/',
      summary:
        'Edge enforcement protects the backend by deciding whether a request may continue before origin resources are spent.',
    },
    {
      title: 'Distributed rate limiting has an explicit local versus global tradeoff',
      source: 'Envoy Docs',
      url: 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/other_features/global_rate_limiting',
      summary:
        'Global rate limiting centralizes decisions, while local checks are faster but less exact across many instances or regions.',
    },
  ],
  teachingAssumptions: [
    'The lab models the synchronous enforcement path; Kafka-style event streams are for analytics, abuse investigation, and tuning.',
    'Hot-key thresholds are intentionally conservative because one abusive key can dominate a shard even when total QPS looks safe.',
    'Strict global quotas across regions are modeled as a correctness choice that spends latency and availability budget.',
  ],
  analyze: analyzeRateLimiterWorkload,
};

function analyzeRateLimiterWorkload(workload: WorkloadValues): LabAnalysis {
  const requestsPerSecond = numericValue(workload, 'requestsPerSecond');
  const quotaPerMinute = numericValue(workload, 'quotaPerMinute');
  const burstAllowanceSeconds = numericValue(workload, 'burstAllowanceSeconds');
  const apiServerCount = numericValue(workload, 'apiServerCount');
  const keyCardinality = numericValue(workload, 'keyCardinality');
  const hottestKeyShare = numericValue(workload, 'hottestKeyShare');
  const globalRegions = numericValue(workload, 'globalRegions');
  const decisionLatencyMs = numericValue(workload, 'decisionLatencyMs');
  const strictGlobalQuota = Boolean(workload.strictGlobalQuota);
  const failClosedOnStoreError = Boolean(workload.failClosedOnStoreError);

  const allowedPerKeySecond = Math.max(quotaPerMinute / 60, 0.1);
  const hotKeyRequestsPerSecond = requestsPerSecond * (hottestKeyShare / 100);
  const burstTokens = allowedPerKeySecond * burstAllowanceSeconds;
  const stateGigabytes = (keyCardinality * stateBytesPerKey) / 1_000_000_000;
  const distributedServers = apiServerCount > 1;
  const latencyPressure = (distributedServers ? 4 : 1) / Math.max(decisionLatencyMs, 1);
  const crossRegionPressure = strictGlobalQuota
    ? globalRegions / 3
    : Math.max(0, globalRegions - 1) / 10;

  const needsLocalOnly =
    !distributedServers && requestsPerSecond < 1_000 && keyCardinality < 20_000 && !strictGlobalQuota;
  const needsRedisLua = !needsLocalOnly;
  const needsTokenBucket = burstAllowanceSeconds >= 5;
  const needsSlidingWindow = burstAllowanceSeconds < 5 || strictGlobalQuota;
  const needsSharding =
    requestsPerSecond > atomicStoreBudgetPerSecond * 0.55 ||
    keyCardinality > 1_000_000 ||
    hotKeyRequestsPerSecond > hotKeyComfortableRps;
  const needsLocalPrecheck =
    requestsPerSecond > 80_000 || decisionLatencyMs <= 5 || hotKeyRequestsPerSecond > hotKeyComfortableRps;
  const needsGlobalQuotaService = strictGlobalQuota && globalRegions > 1;
  const needsEvents = requestsPerSecond > 5_000 || hottestKeyShare >= 10;

  return {
    architectureTitle: chooseArchitectureTitle({
      needsLocalOnly,
      needsRedisLua,
      needsSharding,
      needsLocalPrecheck,
      needsGlobalQuotaService,
    }),
    architectureSummary: chooseArchitectureSummary({
      needsLocalOnly,
      needsRedisLua,
      needsSharding,
      needsLocalPrecheck,
      needsGlobalQuotaService,
    }),
    architecturePath: chooseArchitecturePath({
      needsLocalOnly,
      needsRedisLua,
      needsSharding,
      needsLocalPrecheck,
      needsGlobalQuotaService,
    }),
    nodeStates: {
      client: 'ok',
      gateway: 'ok',
      localLimiter: needsLocalOnly || needsLocalPrecheck ? 'needed' : 'inactive',
      redis: needsRedisLua ? 'needed' : 'inactive',
      shards: needsSharding ? 'needed' : 'inactive',
      quotaService: needsGlobalQuotaService ? 'needed' : 'inactive',
      backend: 'ok',
      events: needsEvents ? 'needed' : 'inactive',
    },
    flowStates: {
      clientToGateway: 'active',
      gatewayToLocal: needsLocalOnly || needsLocalPrecheck ? 'active' : 'inactive',
      localToRedis: needsRedisLua ? 'active' : 'inactive',
      redisToShardRouter: needsSharding ? 'active' : 'inactive',
      shardsToQuotaService: needsGlobalQuotaService ? 'active' : 'inactive',
      quotaToBackend: needsGlobalQuotaService ? 'active' : 'inactive',
      gatewayToBackend: needsRedisLua ? 'inactive' : 'active',
      gatewayToEvents: needsEvents ? 'active' : 'inactive',
      redisToBackend: needsRedisLua && !needsGlobalQuotaService ? 'active' : 'inactive',
      quotaToEvents: needsGlobalQuotaService && needsEvents ? 'active' : 'inactive',
    },
    meters: {
      atomicPath: {
        ratio: requestsPerSecond / atomicStoreBudgetPerSecond,
        valueText: `${formatRate(requestsPerSecond)}/s`,
        copy: 'Every request needs a synchronous decision; a remote atomic store can become the critical path.',
      },
      hotKey: {
        ratio: hotKeyRequestsPerSecond / Math.max(hotKeyComfortableRps, allowedPerKeySecond),
        valueText: `${formatRate(hotKeyRequestsPerSecond)}/s`,
        copy: `${hottestKeyShare.toFixed(1)}% of total traffic maps to one enforcement key.`,
      },
      stateMemory: {
        ratio: stateGigabytes / comfortableStateGigabytes,
        valueText: formatStorageGigabytes(stateGigabytes),
        copy: `${formatCount(keyCardinality)} active keys at roughly ${stateBytesPerKey} bytes of limiter state each.`,
      },
      crossRegion: {
        ratio: crossRegionPressure,
        valueText: `${formatCount(globalRegions)} ${pluralize('region', globalRegions)}`,
        copy: strictGlobalQuota
          ? 'Strict global quota requires cross-region coordination or pre-allocated regional budgets.'
          : 'Approximate regional enforcement is faster but can temporarily exceed the global quota.',
      },
      latencyBudget: {
        ratio: latencyPressure,
        valueText: `${Math.round(decisionLatencyMs)} ms`,
        copy: 'Lower latency targets push toward local pre-checks, colocated Redis shards, or approximate enforcement.',
      },
    },
    decisions: buildDecisions({
      needsLocalOnly,
      needsRedisLua,
      needsSharding,
      needsLocalPrecheck,
      needsGlobalQuotaService,
      needsTokenBucket,
      needsSlidingWindow,
      strictGlobalQuota,
      failClosedOnStoreError,
      burstTokens,
    }),
    reasons: buildReasons({
      requestsPerSecond,
      apiServerCount,
      allowedPerKeySecond,
      hotKeyRequestsPerSecond,
      hottestKeyShare,
      keyCardinality,
      globalRegions,
      decisionLatencyMs,
      needsLocalOnly,
      needsRedisLua,
      needsSharding,
      needsLocalPrecheck,
      needsGlobalQuotaService,
      strictGlobalQuota,
      failClosedOnStoreError,
    }),
  };
}

function buildReasons(analysis: {
  requestsPerSecond: number;
  apiServerCount: number;
  allowedPerKeySecond: number;
  hotKeyRequestsPerSecond: number;
  hottestKeyShare: number;
  keyCardinality: number;
  globalRegions: number;
  decisionLatencyMs: number;
  needsLocalOnly: boolean;
  needsRedisLua: boolean;
  needsSharding: boolean;
  needsLocalPrecheck: boolean;
  needsGlobalQuotaService: boolean;
  strictGlobalQuota: boolean;
  failClosedOnStoreError: boolean;
}): LabReason[] {
  const reasons: LabReason[] = [];

  if (analysis.needsLocalOnly) {
    reasons.push({
      severity: 'ok',
      text: 'One API server can keep limiter state in memory because there is no cross-instance race yet.',
    });
  } else {
    reasons.push({
      severity: 'warning',
      text: `${formatCount(
        analysis.apiServerCount,
      )} API servers need a shared atomic check-and-update path; per-process counters would disagree.`,
    });
  }

  if (analysis.needsRedisLua) {
    reasons.push({
      severity: analysis.requestsPerSecond > atomicStoreBudgetPerSecond ? 'danger' : 'warning',
      text: `${formatRate(
        analysis.requestsPerSecond,
      )} limiter checks/s should be one atomic operation, not separate read and write calls that race under concurrency.`,
    });
  }

  if (analysis.needsSharding) {
    reasons.push({
      severity: analysis.hotKeyRequestsPerSecond > hotKeyComfortableRps ? 'danger' : 'warning',
      text: `The hottest key receives about ${formatRate(
        analysis.hotKeyRequestsPerSecond,
      )}/s. Sharding by key helps total throughput, but hot keys may still need isolation, bucketing, or special policy.`,
    });
  }

  if (analysis.needsLocalPrecheck) {
    reasons.push({
      severity: 'warning',
      text: `A ${Math.round(
        analysis.decisionLatencyMs,
      )} ms decision budget favors local pre-checks or cached quota grants before touching the remote state store.`,
    });
  }

  if (analysis.needsGlobalQuotaService) {
    reasons.push({
      severity: 'danger',
      text: `${formatCount(
        analysis.globalRegions,
      )} regions with strict global quota trade latency and availability for exact enforcement.`,
    });
  }

  if (analysis.failClosedOnStoreError) {
    reasons.push({
      severity: 'warning',
      text: 'Fail-closed protects abuse-sensitive surfaces but can deny legitimate traffic during limiter-store outages.',
    });
  } else {
    reasons.push({
      severity: 'ok',
      text: 'Fail-open favors product availability, but the system should emit events so abuse and quota overshoot can be corrected later.',
    });
  }

  return reasons.slice(0, 7);
}

function buildDecisions(flags: {
  needsLocalOnly: boolean;
  needsRedisLua: boolean;
  needsSharding: boolean;
  needsLocalPrecheck: boolean;
  needsGlobalQuotaService: boolean;
  needsTokenBucket: boolean;
  needsSlidingWindow: boolean;
  strictGlobalQuota: boolean;
  failClosedOnStoreError: boolean;
  burstTokens: number;
}): Record<string, { state: DecisionState; copy: string }> {
  const algorithmCopy = flags.needsSlidingWindow
    ? 'Use a sliding-window counter or log when smoothness and precise window semantics matter more than burst tolerance.'
    : `Use token bucket to allow short bursts; this scenario grants about ${formatCount(
        flags.burstTokens,
      )} burst tokens per key.`;

  return {
    algorithm: {
      state: flags.needsSlidingWindow && flags.needsTokenBucket ? 'tradeoff' : 'needed',
      copy: algorithmCopy,
    },
    localMemory: {
      state: flags.needsLocalOnly || flags.needsLocalPrecheck ? 'needed' : 'not-yet',
      copy: flags.needsLocalOnly
        ? 'A local map is the simplest correct design while a single process owns all decisions.'
        : flags.needsLocalPrecheck
          ? 'Use local pre-checks or cached quota grants to protect latency, but reconcile against shared state.'
          : 'Local counters alone are incorrect once multiple servers enforce the same key.',
    },
    redisLua: {
      state: flags.needsRedisLua ? 'needed' : 'not-yet',
      copy: flags.needsRedisLua
        ? 'Use Redis plus a Lua script so check and update happen atomically on one shard.'
        : 'Redis is unnecessary while one process can own the full limiter state.',
    },
    sharding: {
      state: flags.needsSharding ? 'needed' : 'not-yet',
      copy: flags.needsSharding
        ? 'Shard limiter state by enforcement key; watch for hot keys that still overload one shard.'
        : 'One state store is enough until QPS, key count, or hot-key skew proves otherwise.',
    },
    globalQuota: {
      state: flags.needsGlobalQuotaService ? 'needed' : flags.strictGlobalQuota ? 'tradeoff' : 'not-yet',
      copy: flags.needsGlobalQuotaService
        ? 'Use a quota service or regional budget allocator when exact global limits outweigh latency.'
        : flags.strictGlobalQuota
          ? 'Strict global correctness is requested, but one region can still enforce it locally.'
          : 'Prefer regional or approximate enforcement when availability and latency matter more than exact global totals.',
    },
    failMode: {
      state: flags.failClosedOnStoreError ? 'tradeoff' : 'useful',
      copy: flags.failClosedOnStoreError
        ? 'Fail closed for abuse-sensitive actions; the cost is false denials during state-store incidents.'
        : 'Fail open for availability; emit limiter events so abuse and overshoot can be analyzed after recovery.',
    },
  };
}

function chooseArchitectureTitle(flags: {
  needsLocalOnly: boolean;
  needsRedisLua: boolean;
  needsSharding: boolean;
  needsLocalPrecheck: boolean;
  needsGlobalQuotaService: boolean;
}): string {
  if (flags.needsLocalOnly) {
    return 'In-process limiter map';
  }
  if (flags.needsGlobalQuotaService) {
    return 'Regional enforcement + global quota service';
  }
  if (flags.needsSharding && flags.needsLocalPrecheck) {
    return 'Local pre-checks + sharded Redis Lua state';
  }
  if (flags.needsSharding) {
    return 'Sharded Redis Lua limiter';
  }
  if (flags.needsRedisLua) {
    return 'Shared Redis Lua limiter';
  }
  return 'Gateway limiter';
}

function chooseArchitectureSummary(flags: {
  needsLocalOnly: boolean;
  needsRedisLua: boolean;
  needsSharding: boolean;
  needsLocalPrecheck: boolean;
  needsGlobalQuotaService: boolean;
}): string {
  if (flags.needsLocalOnly) {
    return 'A single service instance can keep per-key counters or buckets in memory. This is simple and correct until multiple instances race.';
  }
  if (flags.needsGlobalQuotaService) {
    return 'Each region needs fast local enforcement, but strict global quota requires a coordinating service or pre-allocated regional budgets.';
  }
  if (flags.needsSharding && flags.needsLocalPrecheck) {
    return 'The limiter combines fast local checks with sharded atomic state so latency stays low while distributed servers agree on quota.';
  }
  if (flags.needsSharding) {
    return 'Limiter state is partitioned by enforcement key. This scales total QPS and memory, but hot keys need special handling.';
  }
  if (flags.needsRedisLua) {
    return 'Multiple API servers share Redis state and use Lua so allow/deny plus counter update is atomic.';
  }
  return 'The gateway can enforce limits before passing allowed traffic to the backend.';
}

function chooseArchitecturePath(flags: {
  needsLocalOnly: boolean;
  needsRedisLua: boolean;
  needsSharding: boolean;
  needsLocalPrecheck: boolean;
  needsGlobalQuotaService: boolean;
}): string {
  if (flags.needsLocalOnly) {
    return 'Request -> API gateway -> local bucket -> backend';
  }
  if (flags.needsGlobalQuotaService) {
    return 'Request -> gateway -> local check -> shard -> quota service -> backend';
  }
  if (flags.needsSharding && flags.needsLocalPrecheck) {
    return 'Request -> gateway -> local pre-check -> sharded Redis Lua -> backend';
  }
  if (flags.needsSharding) {
    return 'Request -> gateway -> shard router -> Redis Lua shard -> backend';
  }
  if (flags.needsRedisLua) {
    return 'Request -> gateway -> Redis Lua check -> backend';
  }
  return 'Request -> gateway -> backend';
}

function numericValue(workload: WorkloadValues, key: string): number {
  const value = workload[key];
  return typeof value === 'number' ? value : 0;
}

function pluralize(unit: string, value: number): string {
  return Math.round(value) === 1 ? unit : `${unit}s`;
}

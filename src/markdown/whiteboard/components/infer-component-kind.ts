import type { ComponentKind } from './component-kind.ts';

type KindRule = readonly [ComponentKind, RegExp];

const INFRASTRUCTURE_RULES: readonly KindRule[] = [
  ['cdn', /\bcdn\b|\bedge (cache|pop|node)s?\b|边缘节点/i],
  ['lb', /load ?balanc|\b[an]?lb\b|负载均衡/i],
  ['api', /gateway|\bapi\b|\bbff\b|网关|接入层/i],
  ['cache', /cache|redis|memcache|缓存/i],
  ['search', /\bsearch|elastic|opensearch|lucene|solr|inverted index|搜索|倒排/i],
  ['objectstore', /\bs3\b|object (store|storage)|\bblobs?\b|bucket|\bgcs\b|对象存储/i],
  ['nosql', /dynamo|cassandra|mongo|bigtable|hbase|scylla|nosql|wide[- ]column|key[- ]value store|\bkv store/i],
  ['stream', /kafka|kinesis|\bstreams?\b|\bevents\b|pulsar|event log|change ?log|\bcdc\b|事件流|消息流|数据流/i],
  ['queue', /queue|\bsqs\b|rabbit|\bmq\b|\btopics?\b|pub\/?sub|message bus|event bus|队列|消息总线/i],
  ['scheduler', /schedul|\bcron\b|timer|ticker|调度|定时/i],
  ['gpu', /\bgpus?\b|prefill|decode|inference worker|model serv|model replica|training|推理|训练/i],
  ['container', /sandbox|container|\bpods?\b|沙箱|容器/i],
  ['compute', /workers?\b|\bpool\b|\bcompute\b|fleet|cluster|consumers?\b|executors?|runners?|集群|工作节点|消费者/i],
  [
    'external',
    /third[- ]party|external|partner|provider|stripe|paypal|apns|\bfcm\b|twilio|sendgrid|\bbanks?\b|第三方|外部|银行/i,
  ],
  [
    'db',
    /database|\bdb\b|postgres|mysql|\bsql\b|aurora|spanner|ledger|\bshards?\b|\breplicas?\b|\bstore\b|数据库|主库|从库|分片|副本/i,
  ],
];

const STORAGE_KINDS: ReadonlySet<ComponentKind> = new Set([
  'cache',
  'search',
  'objectstore',
  'nosql',
  'stream',
  'queue',
  'db',
]);
const EXPLICIT_SERVICE_PATTERN = /service|server|\bsvc\b|服务/i;
const CLIENT_PATTERN =
  /\b(clients?|users?|browsers?|mobile|subscribers?|viewers?|customers?|players?|traders?|riders?|drivers?|sdk|seekers?|employers?)\b|客户端|用户|订阅者|浏览器|玩家|买家|卖家/i;

function firstMatchingKind(label: string, rules: readonly KindRule[]): ComponentKind | null {
  return rules.find(([, pattern]) => pattern.test(label))?.[0] ?? null;
}

export function inferComponentKind(label: string): ComponentKind {
  const infrastructureKind = firstMatchingKind(label, INFRASTRUCTURE_RULES);
  if (infrastructureKind) return infrastructureKind;
  if (EXPLICIT_SERVICE_PATTERN.test(label)) return 'service';
  if (CLIENT_PATTERN.test(label)) return 'client';
  return 'process';
}

export function inferStorageKind(label: string): ComponentKind {
  const storageRules = INFRASTRUCTURE_RULES.filter(([kind]) => STORAGE_KINDS.has(kind));
  return firstMatchingKind(label, storageRules) ?? 'db';
}

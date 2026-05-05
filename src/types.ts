/**
 * agentest-kit — 共享类型定义
 */

// ── 测试状态 ────────────────────────────────────────────────────────────────

export type TestStatus = 'PASS' | 'PARTIAL' | 'FAIL' | 'SKIP' | 'TODO';

export type CaseStatus = 'active' | 'skip' | 'todo';

// ── 测试用例 ────────────────────────────────────────────────────────────────

export interface TestDataDefinition {
  query?: string | null;
  expected_keywords?: string[];
  intent?: string;
  expected_behavior?: string;
  difficulty?: string;
  notes?: string;
}

export interface TestFnContext {
  run: (
    input: string | { query: string; sessionId?: string; expected_keywords?: string[] },
  ) => Promise<TestResult>;
  expect: typeof import('./expect').expect;
  adapter: Adapter;
}

export type TestFn = (ctx: TestFnContext) => Promise<void>;

export interface NormalizedTestDef {
  fn: TestFn | null;
  query: string | null;
  expected_keywords: string[];
  intent?: string;
  expected_behavior?: string;
  difficulty?: string;
  notes?: string;
}

export interface RegisteredTest extends NormalizedTestDef {
  id?: string;
  name: string;
  status: CaseStatus;
}

export interface TestCase {
  id: string;
  name: string;
  status: CaseStatus;
  query: string | null;
  expected_keywords: string[];
  intent?: string;
  expected_behavior?: string;
  difficulty?: string;
  notes?: string;
  fn: TestFn | null;
}

// ── JSON 用例输入 ───────────────────────────────────────────────────────────

export interface JsonCase {
  case_id: string;
  query: string;
  expected_keywords?: string[];
  intent?: string;
  expected_behavior?: string;
  difficulty?: string;
  notes?: string;
  skip?: boolean;
  todo?: boolean;
}

// ── 适配器调用输入 ──────────────────────────────────────────────────────────

export interface AdapterCallInput {
  id?: string;
  case_id?: string;
  query: string;
  expected_keywords?: string[];
  sessionId?: string;
  [key: string]: unknown;
}

// ── 适配器调用结果 ──────────────────────────────────────────────────────────

export interface AdapterCallResult {
  case_id?: string;
  query?: string;
  elapsed_ms: number;
  error: string | null;
  raw: unknown;
}

// ── 标准测试结果 ────────────────────────────────────────────────────────────

export interface TestResult {
  case_id: string;
  query: string;
  elapsed_ms: number;
  error: string | null;
  structure_ok: boolean;
  intent_matched: boolean;
  keyword_hits: string[];
  keyword_hit_rate: number | null;
  quality_score: number;
  failure_details: string[];
  skipped?: boolean;
  todo?: boolean;
  is_fn_based?: boolean;
  normalized_categories?: string[];
  raw?: unknown;
}

// ── 适配器接口 ──────────────────────────────────────────────────────────────

export interface Adapter {
  call: (testCase: AdapterCallInput) => Promise<AdapterCallResult>;
  evaluate: (callResult: AdapterCallResult, testCase: AdapterCallInput) => TestResult;
}

// ── 指标 ─────────────────────────────────────────────────────────────────────

export interface Metrics {
  total: number;
  keyword_hit_rate: number | null;
  intent_match_rate: number;
  avg_quality_score: number;
  avg_latency_ms: number;
}

export interface Thresholds {
  keyword_hit_rate: number;
  intent_match_rate: number;
}

export interface ShipabilityVerdict {
  can_ship: boolean;
  issues: string[];
}

// ── Suite 选项 ──────────────────────────────────────────────────────────────

export interface SuiteOptions {
  label?: string;
  apiUrl?: string;
}

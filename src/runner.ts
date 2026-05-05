import { getTestStatus } from './metrics.js';
import { expect } from './expect.js';
import {
  writeProgress,
  printSuiteHeader,
  printSuiteFooter,
  printCaseLine,
  printCaseDetail,
} from './reporter.js';
import type {
  TestCase,
  TestResult,
  Adapter,
  SuiteOptions,
  JsonCase,
  RegisteredTest,
  AdapterCallInput,
} from './types.js';

// ════════════════════════════════════════════════════════════════════════════
// Skip / Todo 占位结果
// ════════════════════════════════════════════════════════════════════════════

function _makeSkipResult(tc: TestCase): TestResult {
  return {
    case_id: tc.id,
    query: tc.query || '',
    elapsed_ms: 0,
    error: null,
    structure_ok: true,
    intent_matched: true,
    keyword_hits: [],
    keyword_hit_rate: null,
    quality_score: 0,
    failure_details: [],
    skipped: true,
  };
}

function _makeTodoResult(tc: TestCase): TestResult {
  return {
    case_id: tc.id,
    query: tc.query || '',
    elapsed_ms: 0,
    error: null,
    structure_ok: true,
    intent_matched: true,
    keyword_hits: [],
    keyword_hit_rate: null,
    quality_score: 0,
    failure_details: [],
    todo: true,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 格式转换：外部格式 → 内部 TestCase
// ════════════════════════════════════════════════════════════════════════════

/**
 * cases.json 条目 → 内部 TestCase。
 * 支持 "skip": true / "todo": true 字段。
 */
export function fromJsonCases(cases: JsonCase[]): TestCase[] {
  return cases.map((c) => ({
    id: c.case_id,
    name: c.case_id,
    status: c.skip ? 'skip' : c.todo ? 'todo' : 'active',
    query: c.query,
    expected_keywords: c.expected_keywords || [],
    intent: c.intent,
    expected_behavior: c.expected_behavior,
    difficulty: c.difficulty,
    notes: c.notes,
    fn: null,
  }));
}

/**
 * define-test.js 注册的条目 → 内部 TestCase。
 * 自动生成 T001 / T002 ... 格式的 ID。
 */
export function fromRegistered(registered: RegisteredTest[]): TestCase[] {
  return registered.map((r, i) => ({
    id: r.id || `T${String(i + 1).padStart(3, '0')}`,
    name: r.name,
    status: r.status,
    query: r.query,
    expected_keywords: r.expected_keywords || [],
    intent: r.intent,
    fn: r.fn || null,
  }));
}

/** TestCase → AdapterCallInput（确保 query 为 string） */
function _toAdapterInput(tc: TestCase): AdapterCallInput {
  return {
    id: tc.id,
    case_id: tc.id,
    query: tc.query || '',
    expected_keywords: tc.expected_keywords,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 函数式测试执行
// ════════════════════════════════════════════════════════════════════════════

async function _runFnTest(tc: TestCase, adapter: Adapter): Promise<TestResult> {
  const start = Date.now();
  let error: string | null = null;
  const lastResultBox: { value: TestResult | null } = { value: null };

  const ctx = {
    async run(
      input: string | { query: string; sessionId?: string; expected_keywords?: string[] },
    ): Promise<TestResult> {
      const normalized: AdapterCallInput =
        typeof input === 'string'
          ? { case_id: tc.id, query: input, expected_keywords: tc.expected_keywords || [] }
          : { case_id: tc.id, expected_keywords: [], ...input };

      const callResult = await adapter.call(normalized);
      lastResultBox.value = adapter.evaluate(callResult, normalized);
      return lastResultBox.value;
    },
    expect,
    adapter,
  };

  try {
    await tc.fn!(ctx);
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : String(e);
  }

  const passed = !error;
  const lr = lastResultBox.value;
  return {
    case_id: tc.id,
    query: tc.query || (lr ? lr.query : '') || '(fn-based)',
    elapsed_ms: Date.now() - start,
    error,
    structure_ok: passed,
    intent_matched: passed,
    keyword_hits: [],
    keyword_hit_rate: null,
    quality_score: passed ? 5 : 0,
    failure_details: error ? [error] : [],
    is_fn_based: true,
    normalized_categories: lr ? lr.normalized_categories || [] : [],
    raw: lr ? (lr.raw ?? null) : null,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Suite 执行
// ════════════════════════════════════════════════════════════════════════════

/**
 * 运行 suite（统一入口）。
 */
export async function runSuite(
  testCases: TestCase[],
  adapter: Adapter,
  options: SuiteOptions = {},
): Promise<TestResult[]> {
  const { label = 'run', apiUrl = '' } = options;
  const results: TestResult[] = [];

  printSuiteHeader(label, apiUrl);

  for (const tc of testCases) {
    writeProgress(`running ${tc.id}...`);

    let result: TestResult;
    if (tc.status === 'skip') {
      result = _makeSkipResult(tc);
    } else if (tc.status === 'todo') {
      result = _makeTodoResult(tc);
    } else if (tc.fn) {
      result = await _runFnTest(tc, adapter);
    } else {
      // 数据驱动（cases.json 或 data-style test()）
      const input = _toAdapterInput(tc);
      const callResult = await adapter.call(input);
      result = adapter.evaluate(callResult, input);
    }

    results.push(result);

    const status = getTestStatus(result);
    printCaseLine(result, tc, status);
    if (status !== 'PASS' && status !== 'SKIP' && status !== 'TODO') {
      printCaseDetail(result, tc);
    }
  }

  printSuiteFooter();
  return results;
}

/**
 * playground/simple — Mock 适配器
 *
 * 用关键词规则模拟 AI 系统响应，无需真实 API，开箱即用。
 */
import { defineAdapter } from '../../src/index.js';
import type { AdapterCallInput, AdapterCallResult, TestResult } from '../../src/types.js';

// ── 意图检测规则（模拟 AI 分类器）────────────────────────────────────────────
const INTENT_RULES = [
  { pattern: /退款|退货|售后|发票|取消订单/,        category: 'order_refund' },
  { pattern: /订单|物流|快递|发货|配送|到货/,        category: 'order_tracking' },
  { pattern: /账号|登录|密码|注册|绑定|忘记密码/,    category: 'account_management' },
  { pattern: /故障|报错|无法|不能|失败|卡住|崩溃/,   category: 'technical_support' },
];

function detectCategories(query: string): string[] {
  return INTENT_RULES
    .filter(({ pattern }) => pattern.test(query))
    .map(({ category }) => category);
}

function simulateLatency(): Promise<void> {
  return new Promise(r => setTimeout(r, 60 + (Math.random() * 120 | 0)));
}

// ── Mock 适配器 ───────────────────────────────────────────────────────────────
export const adapter = defineAdapter({
  async call(testCase: AdapterCallInput): Promise<AdapterCallResult> {
    const start = Date.now();
    await simulateLatency();

    const categories = detectCategories(testCase.query);
    const raw = {
      code: 0,
      data: {
        categories,
        reply: `已分析「${testCase.query}」，检测到意图：${categories.join(', ') || '未知'}`,
        sessionId: `mock-session-${Date.now()}`,
      },
    };

    return {
      case_id: testCase.id || testCase.case_id,
      query: testCase.query,
      elapsed_ms: Date.now() - start,
      error: null,
      raw,
    };
  },

  evaluate(callResult: AdapterCallResult, testCase: AdapterCallInput): TestResult {
    const { error, raw } = callResult;
    const rawData = raw as { code?: number; data?: { categories?: string[]; reply?: string } } | null;
    const structure_ok = !error && rawData?.code === 0;
    const categories = rawData?.data?.categories ?? [];

    const expectedKws = testCase.expected_keywords ?? [];
    const keyword_hits = expectedKws.filter(
      kw => categories.includes(kw) || (rawData?.data?.reply ?? '').includes(kw)
    );
    const keyword_hit_rate = expectedKws.length
      ? keyword_hits.length / expectedKws.length
      : null;

    const intent_matched = structure_ok
      && (expectedKws.length === 0 || keyword_hits.length > 0);

    const missing = expectedKws.filter(kw => !keyword_hits.includes(kw));

    return {
      ...callResult,
      case_id: callResult.case_id ?? '',
      structure_ok,
      intent_matched,
      normalized_categories: categories,
      keyword_hits,
      keyword_hit_rate,
      quality_score: structure_ok ? (keyword_hit_rate === null || keyword_hit_rate >= 0.8 ? 5 : 3) : 0,
      failure_details: missing.length
        ? [`missing keywords: ${missing.join(', ')}`]
        : [],
    };
  },
});

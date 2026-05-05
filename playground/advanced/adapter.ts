/**
 * playground/advanced — 更丰富的 Mock 适配器
 *
 * 支持：
 *   - 多级意图检测（多关键词 → 多 category）
 *   - 质量评分（基于命中率）
 *   - failure_details 注入（供终端明细展示）
 *   - sessionId 透传（模拟多轮对话）
 */
import { defineAdapter } from '../../src/index.js';
import type { AdapterCallInput, AdapterCallResult, TestResult } from '../../src/types.js';

// ── 意图检测规则 ──────────────────────────────────────────────────────────────
const INTENT_RULES = [
  { pattern: /退款|退货|售后|发票|取消订单/,              category: 'order_refund' },
  { pattern: /订单|物流|快递|发货|配送|到货|包裹/,         category: 'order_tracking' },
  { pattern: /账号|登录|密码|注册|绑定|忘记密码|验证码/,   category: 'account_management' },
  { pattern: /故障|报错|无法|不能|失败|卡住|崩溃|异常/,    category: 'technical_support' },
  { pattern: /推荐|选购|对比|哪款|适合|好用/,              category: 'product_recommendation' },
];

// 模拟会话存储（多轮对话用）
const _sessions = new Map<string, string[]>();

function detectCategories(query: string): string[] {
  return INTENT_RULES
    .filter(({ pattern }) => pattern.test(query))
    .map(({ category }) => category);
}

function simulateLatency(categories: string[]): Promise<void> {
  // 复杂意图延迟更高（模拟真实 AI）
  const base = categories.length > 1 ? 200 : 80;
  return new Promise(r => setTimeout(r, base + (Math.random() * 150 | 0)));
}

export const adapter = defineAdapter({
  async call(testCase: AdapterCallInput): Promise<AdapterCallResult> {
    const start = Date.now();
    const query = testCase.query;
    const sessionId = testCase.sessionId
      || `session-${testCase.id || testCase.case_id}-${Date.now()}`;

    const categories = detectCategories(query);
    await simulateLatency(categories);

    // 记录 session（多轮对话追踪）
    const history = _sessions.get(sessionId) || [];
    history.push(query);
    _sessions.set(sessionId, history);

    const raw = {
      code: 0,
      data: {
        categories,
        reply: categories.length
          ? `已分析：${query}。检测到意图 [${categories.join(', ')}]，正在为您处理...`
          : `已收到：${query}。未检测到明确意图，请提供更多信息。`,
        sessionId,
        turn: history.length,
      },
    };

    return {
      case_id: testCase.id || testCase.case_id,
      query,
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
    const reply = rawData?.data?.reply ?? '';

    const expectedKws = testCase.expected_keywords ?? [];
    const keyword_hits = expectedKws.filter(
      kw => categories.includes(kw) || reply.includes(kw)
    );
    const keyword_hit_rate = expectedKws.length
      ? keyword_hits.length / expectedKws.length
      : null;

    const intent_matched = structure_ok
      && (expectedKws.length === 0 || keyword_hits.length > 0);

    // 质量评分：0~5
    let quality_score = 0;
    if (structure_ok) {
      quality_score = 2;
      if (intent_matched) quality_score++;
      if (keyword_hit_rate === null || keyword_hit_rate >= 0.5) quality_score++;
      if (keyword_hit_rate === null || keyword_hit_rate >= 0.8) quality_score++;
    }

    const missing = expectedKws.filter(kw => !keyword_hits.includes(kw));
    const failure_details = missing.length
      ? [`missing: ${missing.join(', ')}`, `got categories: [${categories.join(', ') || 'none'}]`]
      : [];

    return {
      ...callResult,
      case_id: callResult.case_id ?? '',
      query: callResult.query ?? testCase.query,
      structure_ok,
      intent_matched,
      normalized_categories: categories,
      keyword_hits,
      keyword_hit_rate,
      quality_score,
      failure_details,
    };
  },
});

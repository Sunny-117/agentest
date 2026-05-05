import type { TestResult, Metrics, Thresholds, ShipabilityVerdict, TestStatus } from './types.js';

function _pct(v: number): string {
  return (v * 100).toFixed(1) + '%';
}

/**
 * 从标准 result 对象判断测试状态。
 * 框架只依赖标准字段，与具体 AI 系统无关。
 */
export function getTestStatus(result: TestResult): TestStatus {
  if (result.skipped) {
    return 'SKIP';
  }
  if (result.todo) {
    return 'TODO';
  }
  if (result.error || !result.structure_ok) {
    return 'FAIL';
  }
  if (
    !result.intent_matched ||
    (result.keyword_hit_rate !== null && result.keyword_hit_rate < 0.5)
  ) {
    return 'PARTIAL';
  }
  return 'PASS';
}

/**
 * 计算 suite 级别的指标。
 * skip / todo 不计入统计，只统计 active 用例。
 */
export function calcMetrics(results: TestResult[]): Metrics {
  const active = results.filter((r) => !r.skipped && !r.todo);
  const total = active.length;

  if (total === 0) {
    return {
      total: 0,
      keyword_hit_rate: null,
      intent_match_rate: 0,
      avg_quality_score: 0,
      avg_latency_ms: 0,
    };
  }

  const kwCases = active.filter((r) => r.keyword_hit_rate !== null);

  return {
    total,
    keyword_hit_rate:
      kwCases.length === 0
        ? null
        : kwCases.reduce((s, r) => s + (r.keyword_hit_rate as number), 0) / kwCases.length,
    intent_match_rate: active.filter((r) => r.intent_matched).length / total,
    avg_quality_score: active.reduce((s, r) => s + (r.quality_score || 0), 0) / total,
    avg_latency_ms: active.reduce((s, r) => s + r.elapsed_ms, 0) / total,
  };
}

/**
 * 根据 thresholds 判断是否可上线。
 */
export function judgeShipability(metrics: Metrics, thresholds: Thresholds): ShipabilityVerdict {
  const issues: string[] = [];
  const { keyword_hit_rate: kwT, intent_match_rate: imT } = thresholds;

  if (metrics.keyword_hit_rate !== null && metrics.keyword_hit_rate < kwT) {
    issues.push(`Keyword Hit Rate ${_pct(metrics.keyword_hit_rate)} < threshold ${_pct(kwT)}`);
  }
  if (metrics.intent_match_rate < imT) {
    issues.push(`Intent Match Rate ${_pct(metrics.intent_match_rate)} < threshold ${_pct(imT)}`);
  }
  return { can_ship: issues.length === 0, issues };
}

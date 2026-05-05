/**
 * AI Test Framework — 断言库
 *
 * 通用断言：
 *   expect(value).toBe(x)
 *   expect(value).toContain(item)
 *   expect(value).toBeGreaterThan(n)
 *   expect(value).not.toBe(x)
 *
 * AI 专用断言（作用于标准 result 对象）：
 *   expect(result).toHaveStructure()          — structure_ok === true
 *   expect(result).toHaveIntent('account_report')  — normalized_categories 包含指定 intent
 *   expect(result).toHaveKeyword('消费')       — keyword_hits 包含指定词
 *   expect(result).toMention('关键词')         — 原始响应 JSON 包含此词
 *   expect(result).toHitRate(0.7)             — keyword_hit_rate >= threshold
 */

function _pct(v: number): string {
  return (v * 100).toFixed(0) + '%';
}

export class AssertionError extends Error {
  isAssertionError: boolean;

  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
    this.isAssertionError = true;
  }
}

interface AiResultLike {
  structure_ok?: boolean;
  normalized_categories?: string[];
  keyword_hits?: string[];
  raw?: unknown;
  keyword_hit_rate?: number | null;
}

class Expect {
  private _value: unknown;
  private _negated: boolean;

  constructor(value: unknown) {
    this._value = value;
    this._negated = false;
  }

  get not(): Expect {
    const e = new Expect(this._value);
    e._negated = !this._negated;
    return e;
  }

  // ── 通用断言 ──────────────────────────────────────────────────────────
  toBe(expected: unknown): this {
    return this._check(
      this._value === expected,
      `expected ${JSON.stringify(expected)}, got ${JSON.stringify(this._value)}`,
    );
  }

  toEqual(expected: unknown): this {
    return this._check(
      JSON.stringify(this._value) === JSON.stringify(expected),
      `expected ${JSON.stringify(expected)}, got ${JSON.stringify(this._value)}`,
    );
  }

  toBeTruthy(): this {
    return this._check(!!this._value, `expected truthy, got ${JSON.stringify(this._value)}`);
  }

  toBeFalsy(): this {
    return this._check(!this._value, `expected falsy, got ${JSON.stringify(this._value)}`);
  }

  toBeNull(): this {
    return this._check(this._value === null, `expected null, got ${JSON.stringify(this._value)}`);
  }

  toContain(item: unknown): this {
    const v = this._value;
    const ok = Array.isArray(v) ? v.includes(item) : String(v).includes(String(item));
    return this._check(ok, `expected ${JSON.stringify(v)} to contain ${JSON.stringify(item)}`);
  }

  toBeGreaterThan(n: number): this {
    return this._check(
      typeof this._value === 'number' && this._value > n,
      `expected > ${n}, got ${this._value}`,
    );
  }

  toBeGreaterThanOrEqual(n: number): this {
    return this._check(
      typeof this._value === 'number' && this._value >= n,
      `expected >= ${n}, got ${this._value}`,
    );
  }

  toBeLessThan(n: number): this {
    return this._check(
      typeof this._value === 'number' && this._value < n,
      `expected < ${n}, got ${this._value}`,
    );
  }

  // ── AI 专用断言 ───────────────────────────────────────────────────────

  /** 断言 AI 响应结构完整（structure_ok === true） */
  toHaveStructure(): this {
    const result = this._value as AiResultLike;
    return this._check(result?.structure_ok === true, 'expected structure_ok to be true');
  }

  /** 断言响应触发了指定 intent（normalized category ID） */
  toHaveIntent(intentId: string): this {
    const result = this._value as AiResultLike;
    const cats = result?.normalized_categories || [];
    return this._check(
      cats.includes(intentId),
      `expected intent [${intentId}], got categories [${cats.join(', ') || 'none'}]`,
    );
  }

  /** 断言 expected_keywords 中的某个关键词被命中 */
  toHaveKeyword(kw: string): this {
    const result = this._value as AiResultLike;
    const hits = result?.keyword_hits || [];
    return this._check(hits.includes(kw), `expected keyword "${kw}" to be hit`);
  }

  /** 断言原始响应 JSON 中包含某字符串 */
  toMention(word: string): this {
    const result = this._value as AiResultLike;
    const text = JSON.stringify(result?.raw || '');
    return this._check(text.includes(word), `expected response to mention "${word}"`);
  }

  /** 断言 keyword_hit_rate >= threshold（0~1） */
  toHitRate(threshold: number): this {
    const result = this._value as AiResultLike;
    const rate = result?.keyword_hit_rate;
    if (rate === null || rate === undefined) {
      if (!this._negated) {
        throw new AssertionError('keyword_hit_rate is null (no expected_keywords set?)');
      }
      return this;
    }
    return this._check(
      rate >= threshold,
      `expected keyword hit rate >= ${_pct(threshold)}, got ${_pct(rate)}`,
    );
  }

  // ── 内部 ──────────────────────────────────────────────────────────────
  private _check(cond: boolean, msg: string): this {
    const passes = this._negated ? !cond : cond;
    if (!passes) {
      throw new AssertionError(this._negated ? `Not: ${msg}` : msg);
    }
    return this;
  }
}

export function expect(value: unknown): Expect {
  return new Expect(value);
}

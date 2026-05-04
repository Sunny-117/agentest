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

function _pct(v) {
    return (v * 100).toFixed(0) + '%';
}
export class AssertionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AssertionError';
        this.isAssertionError = true;
    }
}

class Expect {
    constructor(value) {
        this._value = value;
        this._negated = false;
    }

    get not() {
        const e = new Expect(this._value);
        e._negated = !this._negated;
        return e;
    }

    // ── 通用断言 ──────────────────────────────────────────────────────────
    toBe(expected) {
        return this._check(
            this._value === expected,
            `expected ${JSON.stringify(expected)}, got ${JSON.stringify(this._value)}`
        );
    }

    toEqual(expected) {
        return this._check(
            JSON.stringify(this._value) === JSON.stringify(expected),
            `expected ${JSON.stringify(expected)}, got ${JSON.stringify(this._value)}`
        );
    }

    toBeTruthy() {
        return this._check(!!this._value, `expected truthy, got ${JSON.stringify(this._value)}`);
    }

    toBeFalsy() {
        return this._check(!this._value, `expected falsy, got ${JSON.stringify(this._value)}`);
    }

    toBeNull() {
        return this._check(this._value === null, `expected null, got ${JSON.stringify(this._value)}`);
    }

    toContain(item) {
        const v = this._value;
        const ok = Array.isArray(v) ? v.includes(item) : String(v).includes(String(item));
        return this._check(ok, `expected ${JSON.stringify(v)} to contain ${JSON.stringify(item)}`);
    }

    toBeGreaterThan(n) {
        return this._check(this._value > n, `expected > ${n}, got ${this._value}`);
    }

    toBeGreaterThanOrEqual(n) {
        return this._check(this._value >= n, `expected >= ${n}, got ${this._value}`);
    }

    toBeLessThan(n) {
        return this._check(this._value < n, `expected < ${n}, got ${this._value}`);
    }

    // ── AI 专用断言 ───────────────────────────────────────────────────────

    /** 断言 AI 响应结构完整（structure_ok === true） */
    toHaveStructure() {
        return this._check(
            this._value?.structure_ok === true,
            'expected structure_ok to be true'
        );
    }

    /** 断言响应触发了指定 intent（normalized category ID） */
    toHaveIntent(intentId) {
        const cats = this._value?.normalized_categories || [];
        return this._check(
            cats.includes(intentId),
            `expected intent [${intentId}], got categories [${cats.join(', ') || 'none'}]`
        );
    }

    /** 断言 expected_keywords 中的某个关键词被命中 */
    toHaveKeyword(kw) {
        const hits = this._value?.keyword_hits || [];
        return this._check(hits.includes(kw), `expected keyword "${kw}" to be hit`);
    }

    /** 断言原始响应 JSON 中包含某字符串 */
    toMention(word) {
        const text = JSON.stringify(this._value?.raw || '');
        return this._check(text.includes(word), `expected response to mention "${word}"`);
    }

    /** 断言 keyword_hit_rate >= threshold（0~1） */
    toHitRate(threshold) {
        const rate = this._value?.keyword_hit_rate;
        if (rate === null || rate === undefined) {
            if (!this._negated) {
                throw new AssertionError('keyword_hit_rate is null (no expected_keywords set?)');
            }
            return this;
        }
        return this._check(
            rate >= threshold,
            `expected keyword hit rate >= ${_pct(threshold)}, got ${_pct(rate)}`
        );
    }

    // ── 内部 ──────────────────────────────────────────────────────────────
    _check(cond, msg) {
        const passes = this._negated ? !cond : cond;
        if (!passes) {
            throw new AssertionError(this._negated ? `Not: ${msg}` : msg);
        }
        return this;
    }
}

export function expect(value) {
    return new Expect(value);
}


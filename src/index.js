/**
 * agentest-kit — AI 系统测试框架公共 API
 *
 * @example
 * import { test, expect, runSuite, fromJsonCases } from 'agentest-kit';
 */

// ── 测试注册 ────────────────────────────────────────────────────────────────
export {test, skip, todo, getRegistered} from './define-test.js';

// ── 断言库 ──────────────────────────────────────────────────────────────────
export {expect, AssertionError} from './expect.js';

// ── 执行引擎 ────────────────────────────────────────────────────────────────
export {runSuite, fromJsonCases, fromRegistered} from './runner.js';

// ── 指标计算 ────────────────────────────────────────────────────────────────
export {getTestStatus, calcMetrics, judgeShipability} from './metrics.js';

// ── 终端输出 ────────────────────────────────────────────────────────────────
export {
    C,
    writeProgress,
    colorStatus,
    printCaseDetail,
    printCaseLine,
    printSuiteHeader,
    printSuiteFooter,
    printSummary,
    printMetrics,
    printShipVerdict,
} from './reporter.js';

// ── 适配器接口 ───────────────────────────────────────────────────────────────

/**
 * 校验并返回适配器对象（ { call, evaluate } 接口守卫）
 * @param {{ call: Function, evaluate: Function }} adapter
 */
export function defineAdapter(adapter) {
    if (typeof adapter.call !== 'function') {
        throw new TypeError('agentest-kit: adapter.call must be a function');
    }
    if (typeof adapter.evaluate !== 'function') {
        throw new TypeError('agentest-kit: adapter.evaluate must be a function');
    }
    return adapter;
}

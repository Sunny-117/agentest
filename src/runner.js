import {getTestStatus} from './metrics.js';
import {expect} from './expect.js';
import {
    writeProgress,
    printSuiteHeader, printSuiteFooter,
    printCaseLine, printCaseDetail,
} from './reporter.js';

// ════════════════════════════════════════════════════════════════════════════
// Skip / Todo 占位结果
// ════════════════════════════════════════════════════════════════════════════

function _makeSkipResult(tc) {
    return {
        case_id: tc.id, query: tc.query || '', elapsed_ms: 0,
        error: null, structure_ok: true, intent_matched: true,
        keyword_hits: [], keyword_hit_rate: null, quality_score: 0,
        failure_details: [], skipped: true,
    };
}

function _makeTodoResult(tc) {
    return {
        case_id: tc.id, query: tc.query || '', elapsed_ms: 0,
        error: null, structure_ok: true, intent_matched: true,
        keyword_hits: [], keyword_hit_rate: null, quality_score: 0,
        failure_details: [], todo: true,
    };
}


// ════════════════════════════════════════════════════════════════════════════
// 格式转换：外部格式 → 内部 TestCase
// ════════════════════════════════════════════════════════════════════════════

/**
 * cases.json 条目 → 内部 TestCase。
 * 支持 "skip": true / "todo": true 字段。
 */
export function fromJsonCases(cases) {
    return cases.map(c => ({
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
export function fromRegistered(registered) {
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

// ════════════════════════════════════════════════════════════════════════════
// 函数式测试执行
// ════════════════════════════════════════════════════════════════════════════

async function _runFnTest(tc, adapter) {
    const start = Date.now();
    let error = null;
    let lastResult = null;

    /**
     * ctx.run(input) — 调用适配器并返回标准 result，供断言使用。
     *
     * input 可以是：
     *   string                        → 作为 query
     *   { query, expected_keywords? } → 完整输入对象
     */
    const ctx = {
        async run(input) {
            const normalized = typeof input === 'string'
                ? {case_id: tc.id, query: input, expected_keywords: tc.expected_keywords || []}
                : {case_id: tc.id, expected_keywords: [], ...input};

            const callResult = await adapter.call(normalized);
            lastResult = adapter.evaluate(callResult, normalized);
            return lastResult;
        },
        expect,
        adapter,
    };

    try {
        await tc.fn(ctx);
    } catch (e) {
        error = e.message || String(e);
    }

    const passed = !error;
    return {
        case_id: tc.id,
        query: tc.query || lastResult?.query || '(fn-based)',
        elapsed_ms: Date.now() - start,
        error,
        structure_ok: passed,
        intent_matched: passed,
        keyword_hits: [],
        keyword_hit_rate: null,
        quality_score: passed ? 5 : 0,
        failure_details: error ? [error] : [],
        is_fn_based: true,
        // 传递适配器层的诊断信息（如有）
        normalized_categories: lastResult?.normalized_categories || [],
        raw: lastResult?.raw || null,
    };
}


// ════════════════════════════════════════════════════════════════════════════
// Suite 执行
// ════════════════════════════════════════════════════════════════════════════

/**
 * 运行 suite（统一入口）。
 *
 * @param {object[]} testCases - fromJsonCases() 或 fromRegistered() 的合并输出
 * @param {object}   adapter   - { call, evaluate } 适配器
 * @param {object}  [options]  - { label, apiUrl }
 * @returns {Promise<object[]>} - 标准 result 数组
 */
export async function runSuite(testCases, adapter, options = {}) {
    const {label = 'run', apiUrl = ''} = options;
    const results = [];

    printSuiteHeader(label, apiUrl);

    for (const tc of testCases) {
        writeProgress(`running ${tc.id}...`);

        let result;
        if (tc.status === 'skip') {
            result = _makeSkipResult(tc);
        } else if (tc.status === 'todo') {
            result = _makeTodoResult(tc);
        } else if (tc.fn) {
            result = await _runFnTest(tc, adapter);
        } else {
            // 数据驱动（cases.json 或 data-style test()）
            const callResult = await adapter.call(tc);
            result = adapter.evaluate(callResult, tc);
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

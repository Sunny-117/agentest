/**
 * agentest-kit — 测试注册 API
 *
 * 支持两种写法：
 *
 * 1. 数据驱动（与 cases.json 等价，但可用 JS 表达复杂配置）
 *    test('账户报告', {
 *      query: '最近7天消费情况',
 *      expected_keywords: ['account_report', '消费'],
 *    });
 *
 * 2. 脚本驱动（自定义断言，支持多轮对话等高级场景）
 *    test('账户报告', async (ctx) => {
 *      const result = await ctx.run('最近7天消费情况如何');
 *      ctx.expect(result).toHaveIntent('account_report');
 *      ctx.expect(result.intent_matched).toBe(true);
 *    });
 */

const _registry = [];

function _normalize(defOrFn) {
    if (typeof defOrFn === 'function') {
        return {fn: defOrFn, query: null, expected_keywords: []};
    }
    return {
        fn: null,
        query: defOrFn.query || null,
        expected_keywords: defOrFn.expected_keywords || [],
        intent: defOrFn.intent,
        expected_behavior: defOrFn.expected_behavior,
        difficulty: defOrFn.difficulty,
        notes: defOrFn.notes,
    };
}

// eslint-disable-next-line no-empty-function
function noop() {}

/**
 * 注册一个测试用例。
 * @param {string} name      - 用例名称（显示用）
 * @param {object|function} defOrFn - 数据对象 或 async (ctx) => void
 */
function test(name, defOrFn) {
    _registry.push({name, status: 'active', ..._normalize(defOrFn)});
}

/** 跳过此用例（保留定义，输出 SKIP，不调 API） */
test.skip = function (name, defOrFn) {
    _registry.push({name, status: 'skip', ..._normalize(defOrFn || noop)});
};

/** 标记为待实现（输出 TODO，不调 API） */
test.todo = function (name) {
    _registry.push({name, status: 'todo', fn: null, query: null, expected_keywords: []});
};

/** test.skip 的别名 */
function skip(name, defOrFn) {
    test.skip(name, defOrFn);
}

/** test.todo 的别名 */
function todo(name) {
    test.todo(name);
}


/** 返回当前注册的所有测试（快照）。 */
function getRegistered() {
    return [..._registry];
}

export {test, skip, todo, getRegistered};

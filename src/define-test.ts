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

import type { RegisteredTest, NormalizedTestDef, TestDataDefinition, TestFn } from './types.js';

const _registry: RegisteredTest[] = [];

function _normalize(defOrFn: TestDataDefinition | TestFn): NormalizedTestDef {
  if (typeof defOrFn === 'function') {
    return { fn: defOrFn, query: null, expected_keywords: [] };
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

async function noop(): Promise<void> {}

interface TestRegister {
  (name: string, defOrFn: TestDataDefinition | TestFn): void;
  skip: (name: string, defOrFn?: TestDataDefinition | TestFn) => void;
  todo: (name: string) => void;
}

/**
 * 注册一个测试用例。
 * @param name - 用例名称（显示用）
 * @param defOrFn - 数据对象 或 async (ctx) => void
 */
const test: TestRegister = function (name: string, defOrFn: TestDataDefinition | TestFn): void {
  _registry.push({ name, status: 'active', ..._normalize(defOrFn) });
};

/** 跳过此用例（保留定义，输出 SKIP，不调 API） */
test.skip = function (name: string, defOrFn: TestDataDefinition | TestFn = noop): void {
  _registry.push({ name, status: 'skip', ..._normalize(defOrFn) });
};

/** 标记为待实现（输出 TODO，不调 API） */
test.todo = function (name: string): void {
  _registry.push({ name, status: 'todo', fn: null, query: null, expected_keywords: [] });
};

/** test.skip 的别名 */
function skip(name: string, defOrFn?: TestDataDefinition | TestFn): void {
  test.skip(name, defOrFn);
}

/** test.todo 的别名 */
function todo(name: string): void {
  test.todo(name);
}

/** 返回当前注册的所有测试（快照）。 */
function getRegistered(): RegisteredTest[] {
  return [..._registry];
}

export { test, skip, todo, getRegistered };

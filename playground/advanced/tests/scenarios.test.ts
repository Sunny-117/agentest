/**
 * playground/advanced/tests/scenarios.test.ts
 *
 * 脚本驱动测试示例，展示 agentest-kit 的高阶用法：
 *   1. 自定义多步断言
 *   2. 多轮对话（sessionId 传递）
 *   3. .not 否定断言
 *   4. toHaveKeyword / toMention
 *   5. skip / todo
 */
import { test } from '../../../src/index.js';

// ── 1. 自定义多步断言 ─────────────────────────────────────────────────────────
test('技术支持 — 完整断言链', async (ctx) => {
  const result = await ctx.run('App 升级之后一直崩溃，无法正常打开');

  // 结构检查
  ctx.expect(result).toHaveStructure();

  // 意图检查
  ctx.expect(result).toHaveIntent('technical_support');

  // 响应中必须提到"technical_support"
  ctx.expect(result).toMention('technical_support');

  // 质量评分要求
  ctx.expect(result.quality_score).toBeGreaterThan(2);
});

// ── 2. 多轮对话 ───────────────────────────────────────────────────────────────
test('多轮对话 — 追问场景', async (ctx) => {
  // 第一轮：查订单
  const r1 = await ctx.run('帮我查一下昨天下的订单，还没收到发货通知');
  ctx.expect(r1).toHaveStructure();
  ctx.expect(r1).toHaveIntent('order_tracking');

  // 提取 sessionId，传入第二轮
  const raw1 = r1.raw as { data?: { sessionId?: string } } | null;
  const sessionId = raw1?.data?.sessionId;
  ctx.expect(sessionId).toBeTruthy();

  // 第二轮：追问（使用同一 session）
  const r2 = await ctx.run({
    query: '刚才那个订单能申请退款吗？',
    sessionId,
    expected_keywords: ['order_refund'],
  });
  ctx.expect(r2).toHaveStructure();

  // 验证 session 被正确传递（turn 应该 >= 2）
  const raw2 = r2.raw as { data?: { turn?: number } } | null;
  ctx.expect(raw2?.data?.turn).toBeGreaterThanOrEqual(2);
});

// ── 3. .not 否定断言 ──────────────────────────────────────────────────────────
test('否定断言 — 闲聊不应触发业务意图', async (ctx) => {
  // Mock 中"你好"不匹配任何意图规则
  const result = await ctx.run('你好，请问你能帮我做什么？');

  ctx.expect(result).toHaveStructure();

  // 不应该识别为订单或技术支持意图
  ctx.expect(result).not.toHaveIntent('order_tracking');
  ctx.expect(result).not.toHaveIntent('technical_support');

  // error 应为 null
  ctx.expect(result.error).toBeNull();
});

// ── 4. toHaveKeyword + toHitRate ──────────────────────────────────────────────
test('关键词命中断言', async (ctx) => {
  const result = await ctx.run({
    query: '我想买一款性价比高的蓝牙耳机，帮我推荐对比一下',
    expected_keywords: ['product_recommendation', '推荐'],
  });

  ctx.expect(result).toHaveStructure();
  ctx.expect(result).toHaveKeyword('product_recommendation');

  // 命中率至少 50%
  ctx.expect(result).toHitRate(0.5);
});

// ── 5. 数据驱动写法（等价于 cases.json 中的一条记录）────────────────────────
test('数据驱动写法', {
  query: '我的快递单号显示已签收，但我没有收到包裹',
  expected_keywords: ['order_tracking'],
  difficulty: 'easy',
});

// ── 6. skip / todo ────────────────────────────────────────────────────────────
test.skip('待修复 — 复合意图识别准确率待提升', {
  query: '我要退货，同时账号也登录不了，帮我一起处理',
  expected_keywords: ['order_refund', 'account_management', 'technical_support'],
});

test.todo('LLM 语义评分集成 — 待接入评分模型');

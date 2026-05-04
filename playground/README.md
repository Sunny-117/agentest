# Playground

两个开箱即用的示例，使用内置 Mock 适配器，**无需任何 API Key**。

## 运行

```bash
# 进入项目根目录
cd /path/to/agentest-kit

# 简单版（数据驱动，5 分钟上手）
node playground/simple/run.js

# 高阶版（数据驱动 + 脚本驱动混合）
node playground/advanced/run.js
```

## 目录结构

```
playground/
├── simple/                  # 简单版
│   ├── adapter.js           # Mock 适配器（关键词规则模拟 AI 分类）
│   ├── cases.json           # 5 个测试用例（含 skip / todo）
│   └── run.js               # 入口：数据驱动 + 指标输出
│
└── advanced/                # 高阶版
    ├── adapter.js           # 更丰富的 Mock（多意图、会话、质量评分）
    ├── cases.json           # 7 个测试用例
    ├── tests/
    │   └── scenarios.test.js  # 脚本驱动：多轮对话、.not、toHaveKeyword...
    └── run.js               # 入口：两种模式合并 + 阈值判断
```

## 简单版亮点

- 数据驱动（`cases.json` 配置，零代码）
- 包含 PASS / PARTIAL / SKIP / TODO 四种状态
- 自动计算 KHR / IMR 指标

## 高阶版亮点

| 特性 | 代码位置 |
|------|---------|
| 自定义多步断言 | `tests/scenarios.test.js` — "技术支持" |
| 多轮对话（sessionId 传递） | `tests/scenarios.test.js` — "追问场景" |
| `.not` 否定断言 | `tests/scenarios.test.js` — "否定断言" |
| `toHaveKeyword` + `toHitRate` | `tests/scenarios.test.js` — "关键词命中断言" |
| 数据驱动写法（等价 cases.json） | `tests/scenarios.test.js` — "数据驱动写法" |
| `test.skip` / `test.todo` | `tests/scenarios.test.js` 底部 |
| 阈值判断 + SHIP IT 结论 | `run.js` |

## Mock 适配器说明

两个 playground 的 adapter 都是**关键词规则模拟器**，把 query 中的关键词映射到 category：

| query 关键词 | 检测到的 category |
|-------------|-----------------|
| 退款 / 退货 / 售后 / 发票 / 取消订单 | `order_refund` |
| 订单 / 物流 / 快递 / 发货 / 配送 | `order_tracking` |
| 账号 / 登录 / 密码 / 注册 / 绑定 | `account_management` |
| 故障 / 报错 / 无法 / 崩溃 / 异常 | `technical_support` |
| 推荐 / 选购 / 对比 / 哪款 / 好用 | `product_recommendation` |

接入真实 AI 系统时，只需替换 `adapter.js` 中的 `call` 和 `evaluate` 实现。

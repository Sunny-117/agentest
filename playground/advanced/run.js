/**
 * playground/advanced/run.js
 *
 * 高阶示例入口：数据驱动（cases.json）+ 脚本驱动（tests/*.test.js）混合运行。
 *
 * 运行：
 *   node playground/advanced/run.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    runSuite, fromJsonCases, fromRegistered, getRegistered,
    calcMetrics, judgeShipability, getTestStatus,
    printSummary, printMetrics, printShipVerdict,
} from '../../src/index.js';
import { adapter } from './adapter.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

async function main() {
    // ── 1. 自动发现并加载 tests/*.test.js ────────────────────────────────────
    const testsDir = path.join(__dirname, 'tests');
    if (fs.existsSync(testsDir)) {
        const files = fs.readdirSync(testsDir)
            .filter(f => f.endsWith('.test.js'))
            .sort();
        for (const f of files) {
            await import(path.join(testsDir, f));
        }
    }

    // ── 2. 合并数据驱动 + 脚本驱动用例 ──────────────────────────────────────
    const casesRaw = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'cases.json'), 'utf8')
    );
    const tests = [
        ...fromJsonCases(casesRaw),          // cases.json → C001, C002 ...
        ...fromRegistered(getRegistered()),  // test() 注册 → T001, T002 ...
    ];

    // ── 3. 运行套件 ───────────────────────────────────────────────────────────
    const thresholds = { keyword_hit_rate: 0.70, intent_match_rate: 0.80 };
    const results = await runSuite(tests, adapter, {
        label: 'advanced-playground',
    });

    // ── 4. 输出汇总 + 指标 + 上线判断 ────────────────────────────────────────
    const metrics = calcMetrics(results);
    printSummary(results, getTestStatus);
    printMetrics(metrics, thresholds);

    const ship = judgeShipability(metrics, thresholds);
    printShipVerdict(ship);

    if (!ship.can_ship) process.exit(1);
}

main().catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
});

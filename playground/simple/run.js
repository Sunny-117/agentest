/**
 * playground/simple/run.js
 *
 * 最简数据驱动示例：
 *   1. 从 cases.json 读取用例
 *   2. 用 Mock 适配器运行
 *   3. 打印汇总 + 指标 + 上线判断
 *
 * 运行：
 *   node playground/simple/run.js
 */

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
    runSuite, fromJsonCases,
    calcMetrics, judgeShipability, getTestStatus,
    printSummary, printMetrics, printShipVerdict,
} from '../../src/index.js';
import { adapter } from './adapter.js';

const casesFile = new URL('./cases.json', import.meta.url);
const cases = JSON.parse(fs.readFileSync(fileURLToPath(casesFile), 'utf8'));

async function main() {
    const tests = fromJsonCases(cases);
    const thresholds = { keyword_hit_rate: 0.70, intent_match_rate: 0.80 };

    // 运行所有 case，实时打印进度
    const results = await runSuite(tests, adapter, {
        label: 'simple-playground',
    });

    // 汇总 + 指标
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

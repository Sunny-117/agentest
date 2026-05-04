/* eslint-disable max-len */
/* eslint-disable no-console */

function _pct(v) {
    return (v * 100).toFixed(1) + '%';
}


// ── ANSI 颜色（仅 TTY 时启用，CI 管道不输出乱码）─────────────────────────
const USE_COLOR = process.stdout.isTTY;
export const C = {
    reset: USE_COLOR ? '\x1b[0m' : '',
    bold: USE_COLOR ? '\x1b[1m' : '',
    dim: USE_COLOR ? '\x1b[2m' : '',
    green: USE_COLOR ? '\x1b[32m' : '',
    yellow: USE_COLOR ? '\x1b[33m' : '',
    red: USE_COLOR ? '\x1b[31m' : '',
    cyan: USE_COLOR ? '\x1b[36m' : '',
    gray: USE_COLOR ? '\x1b[90m' : '',
    bgRed: USE_COLOR ? '\x1b[41m' : '',
    bgGreen: USE_COLOR ? '\x1b[42m' : '',
};

// ── 内部工具 ──────────────────────────────────────────────────────────────
function _metricLine(label, value, threshold, higherIsBetter) {
    if (value === null) {
        console.log(`  ${C.dim}–  ${label} N/A${C.reset}`);
        return;
    }
    const ok = higherIsBetter ? value >= threshold : value <= threshold;
    const icon = ok ? `${C.green}✓` : `${C.red}✗`;
    const valStr = ok
        ? `${C.green}${_pct(value)}${C.reset}`
        : `${C.red}${_pct(value)}${C.reset}`;
    const thresh = `${C.dim}(threshold ${higherIsBetter ? '≥' : '≤'}${_pct(threshold)})${C.reset}`;
    console.log(`  ${icon}${C.reset}  ${label} ${valStr}  ${thresh}`);
}

// ── 进度覆写（同一行）──────────────────────────────────────────────────────
export function writeProgress(msg) {
    if (USE_COLOR) {
        process.stdout.write(`${C.dim}  ${msg}${C.reset}\r`);
    }
}

// ── Case 级别 ──────────────────────────────────────────────────────────────
export function colorStatus(status) {
    if (status === 'PASS') {
        return `${C.green}${C.bold} PASS ${C.reset}`;
    }
    if (status === 'PARTIAL') {
        return `${C.yellow}${C.bold} PART ${C.reset}`;
    }
    if (status === 'SKIP') {
        return `${C.gray}${C.bold} SKIP ${C.reset}`;
    }
    if (status === 'TODO') {
        return `${C.cyan}${C.bold} TODO ${C.reset}`;
    }
    return `${C.red}${C.bold} FAIL ${C.reset}`;
}

/**
 * 打印单条 case 失败详情。
 *
 * 框架约定标准字段：error, structure_ok, keyword_hit_rate, keyword_hits
 * 适配器可通过 result.failure_details: string[] 注入额外诊断行。
 */
export function printCaseDetail(result, testCase) {
    const indent = '       ';

    if (result.error) {
        console.log(`${indent}${C.red}● error: ${result.error}${C.reset}`);
        return;
    }
    if (!result.structure_ok) {
        console.log(`${indent}${C.red}● structure check failed${C.reset}`);
    }

    // 适配器注入的额外失败信息
    if (Array.isArray(result.failure_details) && result.failure_details.length > 0) {
        result.failure_details.forEach(line =>
            console.log(`${indent}${C.yellow}● ${line}${C.reset}`)
        );
    }

    // 关键词命中明细（通用）
    if (result.keyword_hit_rate !== null) {
        const hitSet = new Set(result.keyword_hits || []);
        const allKws = testCase.expected_keywords || [];
        const hitStr = allKws.map(k =>
            (hitSet.has(k) ? `${C.green}${k}${C.reset}` : `${C.red}${k}${C.reset}`)
        ).join('  ');
        const rateStr = result.keyword_hit_rate >= 0.5
            ? `${C.green}${_pct(result.keyword_hit_rate)}${C.reset}`
            : `${C.yellow}${_pct(result.keyword_hit_rate)}${C.reset}`;
        console.log(`${indent}${rateStr} keywords: ${hitStr}`);
    }
}

export function printCaseLine(result, testCase, status) {
    const badge = colorStatus(status);
    const latency = status === 'SKIP' || status === 'TODO'
        ? `${C.dim}—${C.reset}`
        : `${C.dim}${result.elapsed_ms}ms${C.reset}`;
    const name = testCase.name || testCase.case_id || testCase.id || '';
    const display = `${C.gray}${name.slice(0, 40).padEnd(40)}${C.reset}`;
    const id = `${C.bold}${(testCase.id || testCase.case_id || '').padEnd(6)}${C.reset}`;

    process.stdout.write('\x1b[2K');
    console.log(`  ${badge} ${id}  ${display}  ${latency}`);
}

// ── Suite 级别 ────────────────────────────────────────────────────────────
export function printSuiteHeader(label, apiUrl) {
    console.log(`\n${C.bold}${C.cyan} ${label.toUpperCase()} ${C.reset}${C.dim}  ${apiUrl || ''}${C.reset}`);
    console.log(C.dim + '─'.repeat(68) + C.reset);
}

export function printSuiteFooter() {
    console.log(C.dim + '─'.repeat(68) + C.reset);
}

/**
 * @param {object[]} results
 * @param {function} getStatus - (result) => 'PASS' | 'PARTIAL' | 'FAIL' | 'SKIP' | 'TODO'
 */
export function printSummary(results, getStatus) {
    const counts = {pass: 0, partial: 0, fail: 0, skip: 0, todo: 0};
    results.forEach(r => {
        const s = getStatus(r).toLowerCase();
        counts[s] = (counts[s] || 0) + 1;
    });

    const active = counts.pass + counts.partial + counts.fail;
    const parts = [
        counts.pass > 0 ? `${C.green}${counts.pass} passed${C.reset}` : '',
        counts.partial > 0 ? `${C.yellow}${counts.partial} partial${C.reset}` : '',
        counts.fail > 0 ? `${C.red}${counts.fail} failed${C.reset}` : '',
        counts.skip > 0 ? `${C.gray}${counts.skip} skipped${C.reset}` : '',
        counts.todo > 0 ? `${C.cyan}${counts.todo} todo${C.reset}` : '',
    ].filter(Boolean);

    console.log(`\n${C.bold}  Tests:${C.reset}  ${parts.join(C.dim + ' | ' + C.reset)}${C.dim}  (${active} active / ${results.length} total)${C.reset}`);
}

/**
 * @param {object} metrics    - calcMetrics() 的输出
 * @param {object} thresholds - { keyword_hit_rate, intent_match_rate }
 * @param {string} [label]
 */
export function printMetrics(metrics, thresholds, label = '') {
    const suffix = label ? ` — ${label}` : '';
    console.log(`\n${C.bold}  Metrics${suffix}${C.reset}`);
    console.log(C.dim + '  ' + '─'.repeat(50) + C.reset);

    _metricLine('Keyword Hit Rate  ', metrics.keyword_hit_rate, thresholds.keyword_hit_rate, true);
    _metricLine('Intent Match Rate ', metrics.intent_match_rate, thresholds.intent_match_rate, true);

    console.log(C.dim + `\n  Avg Score ${metrics.avg_quality_score.toFixed(2)}/5   Avg Latency ${metrics.avg_latency_ms.toFixed(0)}ms   Active ${metrics.total}` + C.reset);
}

export function printShipVerdict(ship) {
    console.log('');
    if (ship.can_ship) {
        console.log(`${C.bgGreen}${C.bold}  VERDICT: SHIP IT  ${C.reset}`);
    } else {
        console.log(`${C.bgRed}${C.bold}  VERDICT: DO NOT SHIP  ${C.reset}`);
        ship.issues.forEach(i => console.log(`  ${C.red}✗ ${i}${C.reset}`));
    }
    console.log('');
}

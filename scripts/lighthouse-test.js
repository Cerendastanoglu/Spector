#!/usr/bin/env node
/* eslint-env node */
/**
 * Lighthouse Performance Testing for Shopify App Store Submission
 * 
 * This script automates Lighthouse testing before and after app installation
 * to verify the app meets Shopify's performance requirement:
 * - Maximum 10-point drop in Lighthouse performance score
 * 
 * Usage:
 *   npm run lighthouse:test -- --store=my-store.myshopify.com
 *   npm run lighthouse:before -- --store=my-store.myshopify.com
 *   npm run lighthouse:after -- --store=my-store.myshopify.com
 *   npm run lighthouse:compare
 * 
 * Requirements:
 *   npm install lighthouse chrome-launcher --save-dev
 */

import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Configuration
const PAGES_TO_TEST = [
  { name: 'Home', path: '/', weight: 0.17 },
  { name: 'Product', path: '/products/sample-product', weight: 0.40 },
  { name: 'Collection', path: '/collections/all', weight: 0.43 },
];

const LIGHTHOUSE_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance'],
    formFactor: 'desktop',
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
    },
    screenEmulation: {
      mobile: false,
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
      disabled: false,
    },
  },
};

const RESULTS_DIR = join(process.cwd(), 'lighthouse-results');

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    store: '',
    mode: 'test', // 'before', 'after', 'compare', 'test'
  };

  args.forEach(arg => {
    if (arg.startsWith('--store=')) {
      options.store = arg.split('=')[1];
    }
    if (arg === '--before') options.mode = 'before';
    if (arg === '--after') options.mode = 'after';
    if (arg === '--compare') options.mode = 'compare';
  });

  return options;
}

/**
 * Ensure results directory exists
 */
function ensureResultsDir() {
  if (!existsSync(RESULTS_DIR)) {
    mkdirSync(RESULTS_DIR, { recursive: true });
  }
}

/**
 * Run Lighthouse test on a single URL
 */
async function runLighthouse(url) {
  console.log(`\n🔍 Testing: ${url}`);
  
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox'],
  });

  try {
    const runnerResult = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      logLevel: 'info',
    }, LIGHTHOUSE_CONFIG);

    const score = runnerResult.lhr.categories.performance.score * 100;
    console.log(`   ✅ Performance Score: ${score.toFixed(1)}`);

    return {
      url,
      score,
      report: runnerResult.lhr,
    };
  } finally {
    await chrome.kill();
  }
}

/**
 * Test all pages and calculate weighted average
 */
async function testStore(storeUrl, phase) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Lighthouse Testing - ${phase.toUpperCase()}`);
  console.log(`🏪 Store: ${storeUrl}`);
  console.log(`${'='.repeat(60)}`);

  const results = [];
  let weightedScore = 0;

  for (const page of PAGES_TO_TEST) {
    const url = `https://${storeUrl}${page.path}`;
    const result = await runLighthouse(url);
    
    results.push({
      ...result,
      pageName: page.name,
      weight: page.weight,
    });

    weightedScore += result.score * page.weight;
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  const finalScore = Math.round(weightedScore);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📈 Weighted Average Score: ${finalScore}`);
  console.log(`${'='.repeat(60)}`);
  console.log('\nPage Scores:');
  results.forEach(r => {
    console.log(`  ${r.pageName.padEnd(12)} ${r.score.toFixed(1).padStart(5)} (weight: ${(r.weight * 100).toFixed(0)}%)`);
  });

  return { results, weightedScore: finalScore, timestamp: new Date().toISOString() };
}

/**
 * Save results to JSON file
 */
function saveResults(data, filename) {
  ensureResultsDir();
  const filepath = join(RESULTS_DIR, filename);
  writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`\n💾 Results saved to: ${filepath}`);
  return filepath;
}

/**
 * Load results from JSON file
 */
function loadResults(filename) {
  const filepath = join(RESULTS_DIR, filename);
  if (!existsSync(filepath)) {
    throw new Error(`Results file not found: ${filepath}`);
  }
  return JSON.parse(readFileSync(filepath, 'utf-8'));
}

/**
 * Compare before and after results
 */
function compareResults() {
  console.log('\n📊 Comparing Before/After Results\n');

  try {
    const before = loadResults('before.json');
    const after = loadResults('after.json');

    const scoreDiff = after.weightedScore - before.weightedScore;
    const passed = scoreDiff >= -10;

    console.log(`${'='.repeat(60)}`);
    console.log('LIGHTHOUSE PERFORMANCE COMPARISON');
    console.log(`${'='.repeat(60)}`);
    console.log(`\nBefore Install: ${before.weightedScore}`);
    console.log(`After Install:  ${after.weightedScore}`);
    console.log(`Difference:     ${scoreDiff >= 0 ? '+' : ''}${scoreDiff}`);
    console.log(`\nShopify Requirement: Maximum -10 points`);
    console.log(`Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`${'='.repeat(60)}\n`);

    // Page-by-page comparison
    console.log('Page-by-Page Comparison:\n');
    before.results.forEach((beforePage, idx) => {
      const afterPage = after.results[idx];
      const diff = afterPage.score - beforePage.score;
      console.log(`${beforePage.pageName.padEnd(12)} Before: ${beforePage.score.toFixed(1).padStart(5)} | After: ${afterPage.score.toFixed(1).padStart(5)} | Diff: ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}`);
    });

    // Save comparison report
    const comparison = {
      before: before.weightedScore,
      after: after.weightedScore,
      difference: scoreDiff,
      passed,
      requirement: -10,
      timestamp: new Date().toISOString(),
      pageComparison: before.results.map((beforePage, idx) => ({
        page: beforePage.pageName,
        before: beforePage.score,
        after: after.results[idx].score,
        difference: after.results[idx].score - beforePage.score,
      })),
    };

    saveResults(comparison, 'comparison.json');

    // Generate markdown report
    generateMarkdownReport(comparison, before, after);

    return passed;
  } catch (error) {
    console.error('\n❌ Error comparing results:', error.message);
    console.log('\nMake sure you have run:');
    console.log('  npm run lighthouse:before -- --store=your-store.myshopify.com');
    console.log('  npm run lighthouse:after -- --store=your-store.myshopify.com');
    process.exit(1);
  }
}

/**
 * Generate markdown report for App Store submission
 */
function generateMarkdownReport(comparison, before, after) {
  const report = `# Lighthouse Performance Test Results

**Test Date**: ${new Date(comparison.timestamp).toLocaleString()}

## Summary

| Metric | Score | Status |
|--------|-------|--------|
| Before Install | ${before.weightedScore} | - |
| After Install | ${after.weightedScore} | - |
| **Difference** | **${comparison.difference >= 0 ? '+' : ''}${comparison.difference}** | ${comparison.passed ? '✅ **PASSED**' : '❌ **FAILED**'} |

**Shopify Requirement**: Maximum -10 point drop in Lighthouse performance score  
**Result**: ${comparison.passed ? '✅ PASSED' : '❌ FAILED'} (${comparison.difference >= 0 ? '+' : ''}${comparison.difference} points)

## Page-by-Page Results

| Page | Weight | Before | After | Difference |
|------|--------|--------|-------|------------|
${comparison.pageComparison.map(p => 
  `| ${p.page} | ${(PAGES_TO_TEST.find(pt => pt.name === p.page)?.weight * 100 || 0).toFixed(0)}% | ${p.before.toFixed(1)} | ${p.after.toFixed(1)} | ${p.difference >= 0 ? '+' : ''}${p.difference.toFixed(1)} |`
).join('\n')}

## Calculation Method

The final score is a weighted average based on Shopify's App Store requirements:
- **Home page**: 17% weight
- **Product page**: 40% weight
- **Collection page**: 43% weight

## Test Configuration

- **Form Factor**: Desktop
- **Throttling**: Desktop (40ms RTT, 10 Mbps)
- **Screen Size**: 1350x940
- **Chrome**: Headless mode
- **Lighthouse**: v${process.env.npm_package_dependencies_lighthouse || 'latest'}

## Files

- Before results: \`lighthouse-results/before.json\`
- After results: \`lighthouse-results/after.json\`
- Comparison: \`lighthouse-results/comparison.json\`

---

*Generated by Spector Lighthouse Testing Tool*
`;

  const reportPath = join(RESULTS_DIR, 'PERFORMANCE_REPORT.md');
  writeFileSync(reportPath, report);
  console.log(`\n📄 Markdown report generated: ${reportPath}\n`);
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();

  if (!options.store && options.mode !== 'compare') {
    console.error('\n❌ Error: Store URL is required\n');
    console.log('Usage:');
    console.log('  npm run lighthouse:before -- --store=your-store.myshopify.com');
    console.log('  npm run lighthouse:after -- --store=your-store.myshopify.com');
    console.log('  npm run lighthouse:compare\n');
    process.exit(1);
  }

  try {
    switch (options.mode) {
      case 'before': {
        const beforeResults = await testStore(options.store, 'before');
        saveResults(beforeResults, 'before.json');
        console.log('\n✅ Before results saved. Now install the app and run:');
        console.log(`   npm run lighthouse:after -- --store=${options.store}\n`);
        break;
      }

      case 'after': {
        const afterResults = await testStore(options.store, 'after');
        saveResults(afterResults, 'after.json');
        console.log('\n✅ After results saved. Now compare results:');
        console.log('   npm run lighthouse:compare\n');
        break;
      }

      case 'compare': {
        const passed = compareResults();
        process.exit(passed ? 0 : 1);
        break;
      }

      case 'test':
      default: {
        // Run full test (before + after simulation)
        console.log('\n⚠️  Running full test on current store state');
        console.log('   For App Store submission, run before/after separately\n');
        const testResults = await testStore(options.store, 'test');
        saveResults(testResults, 'test.json');
        break;
      }
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);

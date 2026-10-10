import assert from 'node:assert/strict';
import test from 'node:test';
import { gatePasses, isDocsOnly } from './ci-policy.mjs';

test('docs and Markdown skip tests; code, configuration, and mixed changes require tests', () => {
  assert.equal(isDocsOnly(['README.md', 'docs/evidence/capture.png']), true);
  for (const paths of [[], ['package.json'], ['.github/workflows/ci.yml'], ['scripts/ci-policy.mjs'], ['README.md', 'packages/engine/src/index.ts'], ['packages/web/src/main.tsx', 'docs/main.tsx']]) {
    assert.equal(isDocsOnly(paths), false);
  }
  assert.equal(isDocsOnly(['docs-not-really/code.js']), false);
});

test('only successful classification and the correct build result can pass', () => {
  for (const classify of ['success', 'failure', 'cancelled', 'skipped', '']) {
    for (const docs of ['true', 'false', '']) {
      for (const build of ['success', 'failure', 'cancelled', 'skipped', '']) {
        const expected = classify === 'success' && ((docs === 'true' && build === 'skipped') || (docs === 'false' && build === 'success'));
        assert.equal(gatePasses(classify, docs, build), expected, `${classify}/${docs}/${build}`);
      }
    }
  }
});

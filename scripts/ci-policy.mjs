import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Keep the existing docs/** and **.md exemption, but always publish a gate.
export function isDocsOnly(paths) {
  return paths.length > 0 && paths.every((path) => path.startsWith('docs/') || path.endsWith('.md'));
}

export function gatePasses(classifyResult, docsOnly, buildResult) {
  if (classifyResult !== 'success') return false;
  if (docsOnly === 'true') return buildResult === 'skipped';
  return docsOnly === 'false' && buildResult === 'success';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2];
  if (mode === 'classify') {
    const { PR_BASE_SHA: base, PR_HEAD_SHA: head } = process.env;
    let docsOnly = false;
    if (base && head) {
      if (![base, head].every((sha) => /^[a-f0-9]{40}$/.test(sha))) throw new Error('Invalid PR commit SHA');
      // No rename detection: moving code into docs must still count as code removal.
      const changed = execFileSync('git', ['diff', '--no-renames', '--name-only', '-z', `${base}...${head}`], { encoding: 'utf8' });
      docsOnly = isDocsOnly(changed.split('\0').filter(Boolean));
    }
    // Manual dispatch has no PR SHAs and deliberately runs the full suite.
    appendFileSync(process.env.GITHUB_OUTPUT, `docs_only=${docsOnly}\n`);
    console.log(docsOnly ? 'Documentation-only change: build and tests will be skipped.' : 'Full build and tests required.');
  } else if (mode === 'gate') {
    const { CLASSIFY_RESULT, DOCS_ONLY, BUILD_RESULT } = process.env;
    if (!gatePasses(CLASSIFY_RESULT, DOCS_ONLY, BUILD_RESULT)) {
      console.error(`CI gate failed: classify=${CLASSIFY_RESULT}, docs_only=${DOCS_ONLY}, build=${BUILD_RESULT}`);
      process.exitCode = 1;
    } else {
      console.log(DOCS_ONLY === 'true' ? 'Documentation-only PR: no build or tests required.' : 'Required build and tests passed.');
    }
  } else {
    throw new Error('Expected classify or gate');
  }
}

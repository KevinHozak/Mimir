import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fork, spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { withSyntheticPollingBrowser } from './polling-refresh-supervisor.mjs';

test('offline browser denies network and the observer deadline closes a stalled page', async () => {
  await withSyntheticPollingBrowser(async ({ context, armObserverWindow }) => {
    const page = await context.newPage();
    await page.goto('data:text/html,<title>Synthetic fixture</title>');
    await assert.rejects(page.goto('https://synthetic-observer.invalid/'));
    await assert.rejects(armObserverWindow(480001));
    const closed = page.waitForEvent('close');
    await armObserverWindow(300);
    await assert.rejects(armObserverWindow(1));
    await closed;
    assert.equal(page.isClosed(), true);
  }, { preparationMs: 10000 });
});

test('watchdog enforces preparation, disconnect and rearm boundaries on its owned process', async () => {
  for (const mode of ['preparation', 'disconnect', 'rearm', 'over-limit']) {
    const target = spawn(process.execPath, ['-e', 'setTimeout(()=>{},10000)'], { stdio: 'ignore', windowsHide: true });
    const exited = once(target, 'exit');
    const guard = fork(fileURLToPath(new URL('./polling-refresh-watchdog.mjs', import.meta.url)), [], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'], windowsHide: true });
    const ready = once(guard, 'message');
    guard.send({ kind: 'owned-browser', pid: target.pid, preparationMs: mode === 'preparation' ? 200 : 2000 });
    await ready;
    if (mode === 'disconnect') guard.disconnect();
    if (mode === 'over-limit') guard.send({ kind: 'observer-window', ms: 480001 });
    if (mode === 'rearm') {
      const armed = once(guard, 'message');
      guard.send({ kind: 'observer-window', ms: 1000 });
      await armed;
      guard.send({ kind: 'observer-window', ms: 480000 });
    }
    await exited;
    assert.ok(target.exitCode !== null || target.signalCode !== null);
    if (guard.connected) guard.disconnect();
  }
});

test('an observer window cannot extend the preparation deadline', async () => {
  const target = spawn(process.execPath, ['-e', 'setTimeout(()=>{},10000)'], { stdio: 'ignore', windowsHide: true });
  const guard = fork(fileURLToPath(new URL('./polling-refresh-watchdog.mjs', import.meta.url)), [], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'], windowsHide: true });
  let timeout;
  try {
    const exited = once(target, 'exit');
    const ready = once(guard, 'message');
    guard.send({ kind: 'owned-browser', pid: target.pid, preparationMs: 500 });
    await ready;
    const armed = once(guard, 'message');
    guard.send({ kind: 'observer-window', ms: 480000 });
    await armed;
    await Promise.race([exited, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Preparation deadline was extended')), 4000); })]);
    assert.ok(target.exitCode !== null || target.signalCode !== null);
  } finally {
    clearTimeout(timeout);
    if (guard.connected) guard.disconnect();
    if (target.exitCode === null && target.signalCode === null) target.kill();
  }
});

test('watchdog stops its owned process when the driver actually exits', async () => {
  const target = spawn(process.execPath, ['-e', 'setTimeout(()=>{},10000)'], { stdio: 'ignore', windowsHide: true });
  const driver = fork(fileURLToPath(new URL('./fixtures/polling-watchdog-driver.mjs', import.meta.url)), [String(target.pid)], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'], windowsHide: true });
  let timeout;
  try {
    const exited = once(target, 'exit');
    const [message] = await once(driver, 'message');
    assert.equal(message.ready, true);
    driver.kill();
    await Promise.race([exited, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Watchdog did not stop target after driver exit')), 4000); })]);
    assert.ok(target.exitCode !== null || target.signalCode !== null);
  } finally {
    clearTimeout(timeout);
    if (driver.exitCode === null && driver.signalCode === null) driver.kill();
    if (target.exitCode === null && target.signalCode === null) target.kill();
  }
});

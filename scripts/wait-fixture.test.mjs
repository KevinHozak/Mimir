import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import { waitForFixture } from './wait-fixture.mjs';

test('fixture deadline aborts a connection that never sends headers', async () => {
  const server = createServer(() => {});
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const start = performance.now();
    await assert.rejects(waitForFixture(`http://127.0.0.1:${server.address().port}/`, [], 200), /fixture unavailable/);
    assert.ok(performance.now() - start < 4000);
  } finally { server.closeAllConnections(); server.close(); }
});

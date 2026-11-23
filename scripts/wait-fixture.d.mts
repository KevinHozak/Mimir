import type { ChildProcess } from 'node:child_process';

export function waitForFixture(url: string, children: ChildProcess[], timeoutMs?: number): Promise<void>;

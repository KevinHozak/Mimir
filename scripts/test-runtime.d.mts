import type { ChildProcess } from "node:child_process";
export function testPort(): Promise<number>;
export function stopTestProcesses(children: Array<ChildProcess | undefined>): Promise<void>;
export function waitForTestExit(child: ChildProcess, timeoutMs?: number): Promise<void>;

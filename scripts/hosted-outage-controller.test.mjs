import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
execFileSync('python', [fileURLToPath(new URL('./hosted-outage-controller.test.py', import.meta.url))], { stdio: 'inherit', timeout: 30000 });

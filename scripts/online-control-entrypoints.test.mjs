import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdirSync, mkdtempSync, writeFileSync, symlinkSync, realpathSync, lstatSync, unlinkSync, rmdirSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const temporary=join(root,'.tmp','online-entrypoints');
mkdirSync(temporary,{recursive:true});

test('online unit flags execute real CLI admission guards through a release symlink',()=>{
  const directory=mkdtempSync(join(temporary,'case-'));
  const link=join(directory,'current');
  const invalid=join(directory,'invalid-pilot.json');
  writeFileSync(invalid,'{}');
  symlinkSync(root,link,process.platform==='win32'?'junction':'dir');
  const env={...process.env};
  for(const key of Object.keys(env)) if(key.startsWith('BACKUP_')||key.startsWith('MIMIR_')||['AI_ENABLED','AI_RUNTIME_MODE','DATABASE_PATH','WORLD_BUNDLE_ROOT','OWNER_TOKEN'].includes(key)) delete env[key];
  try {
    for(const [unit,script,args,message] of [
      ['mimir-online-watchdog.service','online-pilot-watchdog.mjs',[invalid],/Pilot watchdog failed/],
      ['mimir-online-network-cleanup.service','online-private-ai-endpoint.mjs',[invalid],/Private AI endpoint cleanup failed/],
      ['mimir-online-final-backup.service','online-final-backup.mjs',[],/Explicit final backup configuration required/]
    ]) {
      const line=readFileSync(join(root,'scripts','ops',unit),'utf8').split(/\r?\n/).find(value=>value.startsWith('ExecStart='));
      assert.ok(line);
      const parts=line.slice('ExecStart='.length).split(/\s+/);
      const scriptIndex=parts.findIndex(value=>value.endsWith('/scripts/'+script));
      assert.ok(scriptIndex>0);
      const flags=parts.slice(1,scriptIndex);
      assert.ok(flags.includes('--preserve-symlinks-main'));
      const result=spawnSync(process.execPath,[...flags,join(link,'scripts',script),...args],{cwd:directory,env,encoding:'utf8',timeout:10000});
      assert.equal(result.error,undefined);
      assert.equal(result.status,1,`${unit} must run and reject unsafe/incomplete configuration`);
      assert.match(result.stderr,message);
    }
    const cutoff=readFileSync(join(root,'scripts','ops','mimir-online-cutoff.service'),'utf8');
    assert.match(cutoff,/ExecStart=.*--preserve-symlinks-main .*online-pilot-watchdog\.mjs .* --stop/);
  } finally {
    // Remove only this owned link, never recurse through its repository target.
    assert.ok(lstatSync(link).isSymbolicLink());
    assert.equal(realpathSync(link),realpathSync(root));
    if(process.platform==='win32') rmdirSync(link); else unlinkSync(link);
    unlinkSync(invalid);
    rmdirSync(directory);
  }
});

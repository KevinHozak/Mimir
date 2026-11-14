import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

/** A separate SQLite lock stays held for the writer lifetime and releases on crash.
 * This file is coordination state, never part of a world backup. Do not unlink it.
 */
export function acquireWriterLock(databasePath: string): () => void {
  if (databasePath === ":memory:") return () => {};
  const path = resolve(`${databasePath}.writer-lock.db`);
  mkdirSync(dirname(path), { recursive: true });
  const lock = new DatabaseSync(path);
  try {
    lock.exec("PRAGMA busy_timeout=0; BEGIN EXCLUSIVE;");
  } catch {
    lock.close();
    throw Error("Database already has a writer; stop the prior writer before restart");
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lock.close();
  };
}

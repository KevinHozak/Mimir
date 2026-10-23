"""Download a recorded off-VM backup and restore only into a new directory.

Uses the operator's existing keyless recovery impersonation. Never reads the
live database or replaces it. The receipt is the private offsite-status.json.
"""
import argparse
import hashlib
import json
import math
import pathlib
import re
import shutil
import subprocess
import tarfile
from datetime import datetime, timezone


def validate_receipt(receipt, now=None):
    try:
        success = datetime.fromisoformat(receipt["lastSuccessAt"].replace("Z", "+00:00"))
        attempt = datetime.fromisoformat(receipt["lastAttemptAt"].replace("Z", "+00:00"))
        if success.tzinfo is None or attempt.tzinfo is None:
            raise ValueError()
    except (KeyError, TypeError, ValueError):
        raise ValueError("invalid backup receipt timestamps") from None
    age = ((now or datetime.now(timezone.utc)) - success).total_seconds() * 1000
    maximum_age = receipt.get("freshnessMaxAgeMs")
    if (type(maximum_age) not in (int, float) or not math.isfinite(maximum_age)
            or maximum_age <= 0 or age < 0 or age > maximum_age
            or receipt.get("consecutiveFailures", 0) or attempt > success):
        raise ValueError("backup receipt is stale or failed")
    uri = receipt.get("lastObjectUri")
    # gcloud is a batch wrapper on Windows: reject shell metacharacters before
    # passing an independently downloaded receipt's object URI to that wrapper.
    if not isinstance(uri, str) or not re.fullmatch(r"gs://[a-z0-9][a-z0-9._-]*/[A-Za-z0-9/._-]+", uri):
        raise ValueError("backup receipt has invalid object URI")
    return uri


def unpack(archive, destination):
    with tarfile.open(archive, "r:gz") as source:
        members = source.getmembers()
        names = set()
        for member in members:
            path = pathlib.PurePosixPath(member.name)
            if (path.is_absolute() or ".." in path.parts or "\\" in member.name
                    or ":" in member.name or not (member.isfile() or member.isdir())
                    or member.name in names):
                raise ValueError("unsafe backup archive member")
            names.add(member.name)
        databases = [m.name for m in members if m.isfile() and "/" not in m.name and m.name.endswith(".db")]
        if len(databases) != 1:
            raise ValueError("archive must contain exactly one database")
        database = databases[0]
        allowed = {database, database + ".manifest.json", database + ".bundles"}
        if any(m.name.rstrip("/") not in allowed and not m.name.startswith(database + ".bundles/") for m in members):
            raise ValueError("unexpected backup archive content")
        if database + ".manifest.json" not in names:
            raise ValueError("missing backup manifest")
        # All paths, member types and duplicate names checked before extraction.
        for member in members:
            target = destination / member.name
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                with source.extractfile(member) as input_file, target.open("xb") as output:
                    shutil.copyfileobj(input_file, output)
        return destination / database


def recover(receipt, archive, directory, root, node="node"):
    if directory.exists():
        raise ValueError("recovery directory must not exist")
    data = archive.read_bytes()
    if len(data) != receipt["lastArchiveBytes"] or hashlib.sha256(data).hexdigest() != receipt["lastArchiveSha256"]:
        raise ValueError("downloaded archive checksum or size mismatch")
    directory.mkdir(parents=True)
    backup = unpack(archive, directory)
    restored = directory / "restored.db"
    subprocess.run([node, str(root / "packages/server/dist/backup.js"), "restore", str(backup), str(restored)], cwd=root, check=True, capture_output=True)
    module = (root / "packages/server/dist/backup-offsite.js").as_uri()
    program = f'import {{ databaseEvidence }} from {json.dumps(module)}; console.log(JSON.stringify(databaseEvidence(process.argv[1])));'
    result = subprocess.run([node, "--input-type=module", "-e", program, str(restored)], cwd=root, check=True, capture_output=True, text=True)
    evidence = json.loads(result.stdout)
    if evidence != receipt["database"]:
        raise ValueError("restored timeline/history differs from upload receipt")
    manifest = json.loads(pathlib.Path(str(backup) + ".manifest.json").read_text(encoding="utf-8"))
    if len(manifest["bundleFiles"]) != receipt["bundleFiles"]:
        raise ValueError("restored world asset count differs from upload receipt")
    return {"verified": True, "database": evidence, "bundleFiles": len(manifest["bundleFiles"]), "archiveSha256": receipt["lastArchiveSha256"]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--receipt", required=True, type=pathlib.Path)
    parser.add_argument("--directory", required=True, type=pathlib.Path)
    parser.add_argument("--account", required=True)
    parser.add_argument("--recovery-service-account", required=True)
    args = parser.parse_args()
    receipt = json.loads(args.receipt.read_text(encoding="utf-8-sig"))
    uri = validate_receipt(receipt)
    directory = args.directory.resolve()
    if directory.exists() or directory.with_suffix(".tar.gz").exists():
        raise ValueError("recovery outputs must not already exist")
    archive = directory.with_suffix(".tar.gz")
    archive.parent.mkdir(parents=True, exist_ok=True)
    command = [shutil.which("gcloud") or "gcloud", "storage", "cp", uri, str(archive), "--quiet", f"--account={args.account}", f"--impersonate-service-account={args.recovery_service_account}"]
    subprocess.run(command, check=True, capture_output=True)
    result = recover(receipt, archive, directory, pathlib.Path(__file__).resolve().parents[1])
    (directory / "recovery-result.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result))


if __name__ == "__main__":
    main()

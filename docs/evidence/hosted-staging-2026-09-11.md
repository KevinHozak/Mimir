# Hosted staging observer evidence

Date: 2026-09-11
Project: `mimir-realm`
Account: `khozak@gmail.com`
Verified source commit: `792dab516b61b4ce7698545963c33e6da9b52609`
World bundle supplied to the reset request: `sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e`

## Provisioned shape

- Compute Engine instance: `mimir-staging`
- Zone and region: `us-central1-a` / `us-central1`
- Machine type: `e2-micro`
- Boot disk: 30 GB `pd-standard`, auto-delete with the instance
- Network: default VPC, private internal address `10.128.0.2`
- External address: none
- Runtime ingress: TCP 8888 from IAP's `35.235.240.0/20` source range only, using firewall rule `mimir-staging-iap`
- Administrative access: authenticated IAP SSH/tunnel; no public SSH or public HTTP/HTTPS ingress was added
- Scaling: one VM and one SQLite writer only
- Service: `/etc/systemd/system/mimir-staging.service`
- Runtime data: `/var/lib/mimir/mimir.db` and `/var/lib/mimir/backups`
- Owner token: random token transferred over IAP into root-only `/etc/mimir/mimir.env`; it was not printed, committed, or included in the VM image

The observer is reached for validation through a temporary local IAP tunnel from `localhost:18888` to the VM's port 8888. This is a private staging deployment, not a public-ready service.

## Deployment and behavior checks

The VM runs Node `v22.14.0` and the compiled First Glow production build from the verified commit. The hosted build uses same-origin API routing so the observer can be served through the VM's private listener or an authenticated IAP tunnel. The service reported:

- `/health`: `ok: true`, database path `/var/lib/mimir/mimir.db`, scheduler paused, tick 0 on first boot;
- `/`: HTTP 200 and the same-origin observer loaded;
- `/api/world`: `mimir-sim-v3-first-glow`, `structured-v2`, `living-circuit`, and `first-glow`;
- authenticated reset: HTTP 200;
- three controlled authenticated ticks: HTTP 200 each, advancing to tick 3;
- unauthenticated owner tick with JSON content type: HTTP 401;
- restart: clean shutdown at tick 3, service returned active, and the recovered checkpoint remained at tick 3;
- next authenticated post-restart tick: HTTP 200 and advancement to tick 4;
- post-restart event history remained available, with 50 recorded events after the resumed tick.

Local pre-deployment regressions also passed:

```text
First Glow server partial-travel restart equivalence passed
First Glow queued command application and idempotency passed
First Glow bundle-inclusive backup/restore passed
First Glow hash-qualified asset serving passed
```

## Cost and remaining limits

No post-provisioning invoice or usage export was available during this same-day validation, so an exact billed amount is not yet claimable. The provisioned shape has no public IPv4, Cloud NAT, load balancer, or backup bucket. At current published list prices, the non-free-tier monthly baseline is approximately `$7.31` for 730 hours of `e2-micro` (`$6.11`) plus 30 GiB-months of standard persistent disk (`$1.20`), before any egress, logging, or other usage. Eligible Free Tier usage may reduce the VM and disk charges, but remains account-dependent. The existing `$10/month` project budget is an alert, not a hard cap.

Hosted-P5 still needs to create and test the independent backup destination. Hosted-P6 remains the durable/public-readiness gate. This deployment must not be described as durable, public-ready, or horizontally scalable.

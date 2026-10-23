---
depends_on: ["MIM-S006"]
id: "MIM-S007"
parent: ["MIM-E002"]
priority: "medium"
schema_version: 1
status: "open"
title: "Verify expired and wrong-project tokens against live IAM"
type: "enhancement"
---
## Outcome

Missing and malformed credentials have evidence; expired and wrong-project tokens remain unverified against live IAM. Use isolated approved test identities and redact tokens.

## Source and scope

docs/roadmap.md; docs/hosted-observer-runbook.md

## Acceptance

- [ ] Automate expired and wrong-project token rejection with bounded authorized fixtures.
- [ ] Verify failures disclose no private state or credentials.
- [ ] Record exact environment and distinguish local mocks from live IAM evidence.

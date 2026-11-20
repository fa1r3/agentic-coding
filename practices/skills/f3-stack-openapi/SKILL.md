---
id: f3-stack-openapi
kind: skill
name: f3-stack-openapi
description: "OpenAPI know-how of the project: the published contract, its versioning, the generated client, provider contract tests, doubles of the neighbours. Load before changing contract/openapi.yaml, an endpoint of the contract, the client of a neighbour, or a double of a neighbour."
version: 1.0.0
status: stable
summary: How the rules of service-contracts are written with OpenAPI, with patterns, anti-patterns and a checklist.
applies-when:
  archetypes: [service]
loaded-by: [architect, developer, tester]
---

# OpenAPI in this project

This skill details, for an HTTP contract described in OpenAPI, the rules `SC-*` of the Adopted practices section of `AGENTS.md`. The rules win when they and this skill differ.

## The contract is the source (SC-1)

- `contract/openapi.yaml` is written first and reviewed with the change; the endpoints and their models follow it. A test fails when the document served by the application differs from it.
- `info.version` is the semantic version of the contract. The client package is generated from the document at build, and published with the same version.
- One operation per endpoint, with an `operationId` in camelCase named after the business action (`issueInvoice`), never after the HTTP verb.

## Compatibility (SC-2)

Inside a major version, only add:

| Change | Compatible |
|---|---|
| a new operation, a new optional field of a request, a new field of a response | yes |
| a new value of an enum in a response | only if the contract says consumers ignore unknown values |
| a field becomes required, a field is removed or renamed, a type changes, a status code disappears | no: new major version |

Run a breaking-change check (for example `oasdiff breaking`) between the published version and the document of the change; a breaking change outside a major version fails the verification command.

## Provider contract tests (SC-3)

Schemathesis (or an equivalent) runs every operation of `contract/openapi.yaml` against the service started in test mode, from the document alone. A failure is a defect of the service or of the contract, never of the test.

## Idempotency (SC-4)

Every operation that changes state declares the `Idempotency-Key` header. The service stores the key with the outcome; the same key with the same request returns the stored outcome; the same key with another request is refused (`422`).

## Neighbours (SC-5, SC-6)

- The adapter of a neighbour uses the client package that neighbour publishes, at a version pinned in the lock file, and translates its models into domain types: no model of a neighbour crosses the port.
- In the tests, a neighbour is a mock server started from the OpenAPI document of its published client (Prism), at the same version. A double answers only what that document allows.

## Anti-patterns

- Generating `openapi.yaml` from the code and publishing that: the contract then changes when the code changes.
- A shared "models" package between services.
- `additionalProperties: false` on responses: it forbids adding a field without a major version.
- An error format of each endpoint's own: use one problem format (RFC 9457) for the whole contract.

## Checklist before a commit

- [ ] `contract/openapi.yaml` changed with the endpoints, and `info.version` with it.
- [ ] No breaking change inside the major version.
- [ ] Every state-changing operation declares `Idempotency-Key`.
- [ ] The adapters of neighbours translate their models; no neighbour model in the core.

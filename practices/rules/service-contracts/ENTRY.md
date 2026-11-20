---
id: service-contracts
kind: rules
code: SC
title: Service contracts
version: 1.0.0
status: draft
summary: Publishing a versioned contract, keeping it compatible, and testing it on the side of the provider.
applies-when:
  archetypes: [service]
requires: []
conflicts: []
pairs-with: [practice-openapi]
size-budget: 20
---

SC-1. **The contract is published as a versioned package.** The service publishes its contract (schema and client) as a package with a semantic version; consumers depend on that package, never on the repository. Reason: a project is linked to another one only through a versioned package. Example: `@acme/billing-client@2.3.0`.
SC-2. **A contract stays backward compatible inside a major version.** Within a major version, a change only adds: an optional field, a new entry point, a new value that consumers may ignore. Removing, renaming or changing the meaning of a field is a new major version, with the former one served until its consumers have moved. Reason: consumers release on their own schedule.
SC-3. **The provider tests its own contract.** Contract tests of the service check that every entry point of the published contract answers as the contract says, from the published schema, not from the code. Reason: the contract is a promise to projects this repository cannot test.
SC-4. **An entry point called remotely is idempotent.** A command received over the network carries an idempotency key, and receiving it twice has the effect of receiving it once. Reason: networks repeat messages. Example: `POST /payments` with `Idempotency-Key`.
SC-5. **A neighbour is reached through a port, with its types translated.** The adapter of a neighbour uses its published client and translates its types into the types of the domain; no type of a neighbour crosses the port. Reason: the domain of this service does not change when a neighbour changes.
SC-6. **A neighbour is tested with a double from its published contract.** Unit, integration and end-to-end tests replace each neighbour with a double built from the contract it publishes, at the version the service depends on. Reason: each service is tested alone.

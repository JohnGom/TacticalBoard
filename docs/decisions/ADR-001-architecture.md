# ADR-001: Web-first modular monolith baseline

- **Status:** Proposed baseline; foundation implementation authorized. Revisit before production database/auth/hosting choices.
- **Date:** 2026-10-11

## Context

The product needs a rich interactive editor, private saved work, a future mobile client, and external football data. No application code or runtime architecture existed when planning began. A distributed system would add operational cost without a demonstrated need.

## Proposed decision

Use React + TypeScript strict mode for the web client, SVG for individually editable tactical objects, and a Node.js + TypeScript modular monolith exposing versioned REST APIs. Use a pnpm workspace to share domain logic and API contracts while keeping rendering platform-specific. Plan PostgreSQL and versioned JSONB board state when persistence is implemented.

## Alternatives considered

- **Canvas-only editor:** potentially efficient with many objects, but less convenient for individual selection, semantics, and accessibility at the expected board scale.
- **Microservices:** no independent scaling/team/operational requirement currently justifies them.
- **Separate repositories:** possible, but sharing domain contracts and validation is valuable for this small product; a workspace adds less overhead.
- **React Native component reuse:** rejected for rendering/interaction; future mobile client shares domain/contracts, not web components.

## Consequences

- Board rendering is suited to SVG and accessible surrounding controls.
- API and domain types can support web and mobile independently.
- Provider credentials and ownership checks remain server-side.
- Hosting, authentication, PostgreSQL vendor/region, and final persistence details need explicit approval before their iterations.

## Revisit when

Measured rendering constraints exceed SVG suitability, independent service scaling is demonstrated, or mobile/API needs materially change the domain boundaries.

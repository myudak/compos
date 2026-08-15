# ADR-008: Camel-Case API Contracts

**Status:** Accepted

## Decision

All `/v1` request and response bodies use canonical camelCase Zod contracts from `@operator/contracts`. Database snake_case is converted by explicit API mappers. Errors use `{ code, message, details?, requestId }`.

## Rationale and consequences

One runtime contract removes frontend/backend drift and makes response validation possible. Explicit mappers keep database naming from leaking into transport or UI code.

## Ringkasan keputusan (Bahasa Indonesia)

Kontrak HTTP menggunakan camelCase dan divalidasi Zod di server maupun web. snake_case hanya berada di lapisan database dan diubah oleh mapper eksplisit.

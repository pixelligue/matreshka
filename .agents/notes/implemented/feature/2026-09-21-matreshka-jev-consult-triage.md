# Agent Note: Jev skip / proceed / consult

Status: implemented

English | [中文](2026-09-21-matreshka-jev-consult-triage.zh.md)

## Problem

The consult gate treated every real task as `consult`, so Flash ran on simple letters and CRM creates. The operator wanted the advisor only on hard or risky requests. Jev already classifies named options.

## Decision

Jev chooses among `skip`, `proceed`, and `consult` on the first step of a user turn. `skip` is chit-chat. `proceed` is one clear straightforward task and does not call Flash. `consult` is messy, conflicting, apologetic, or high-stakes and still calls Flash. The Host posts the same `/v1/tools/select` route; only `consult` follows with `/v1/consult`.

## Alternatives considered

- **Keep binary consult/skip with "any task = consult".** Rejected: the advisor fired on ordinary work.
- **A second model for complexity.** Rejected: Jev Decisions already picks among three names.

## Consequences

Simple operator asks no longer pay Flash. Live probes must assert three buckets, not two. A borderline prompt can flip between `proceed` and `consult`; the instruction text is the tuning knob.

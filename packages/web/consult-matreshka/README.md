---
description: "Host consult and tool-select tools that call the Matreshka API with the session token."
kind: "package-reference"
---

# @deepseek-ai/dsh-consult-matreshka

English | [中文](README.zh.md)

## Summary

With `dsh-consult-matreshka`, Matrena can call `consult` (DeepSeek V4.1 Flash via the product API) and `select_tool` (Jev via the product API). On the first step of a user turn, Host asks Jev `skip`, `proceed`, or `consult` and calls Flash only when Jev chooses `consult`. The Host sends only the session bearer. OpenRouter keys stay on the backend. Chat completions still use `matrena`.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Mount next to the Matreshka API origin used for chat. Consult needs a signed-in session. Jev sends simple tasks through `proceed` and calls Flash only for hard or risky requests.

```yaml
- id: consult-matreshka
  name: '@deepseek-ai/dsh-consult-matreshka'
  config:
    apiOrigin: http://127.0.0.1:8016
```

<a id="understand-the-implementation"></a>
## Understand the implementation

`consult` posts `{goal, question, plan?, evidence?}` to `{apiOrigin}/v1/consult`. `select_tool` posts `{goal, candidates}` to `{apiOrigin}/v1/tools/select`. Empty session tokens fail locally and do not fetch. The first step of a turn also posts `skip`/`proceed`/`consult` to `/v1/tools/select`; only `consult` calls `/v1/consult` and appends a logged `[advisor …]` notice. Errors leave the turn unchanged.

### Tool interface

#### Token effect

Tool results enter the session as ordinary tool output.

#### KV Cache effect

No direct invalidation.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

These limits define when the tools are a poor fit.

- **OpenRouter key lives only on the API** — the Host never holds it; missing key is HTTP 503 from the API.
- **Payload caps are enforced by the API** — oversized consult or select bodies return 400.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

Muse Spark Contributor is out of scope because Meta trains on prompts.

</details>

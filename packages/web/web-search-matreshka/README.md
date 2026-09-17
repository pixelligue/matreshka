---
description: "Keenable public search and LLMTOKENAPI search via the Matreshka API for ctx.web."
kind: "package-reference"
---

# @deepseek-ai/dsh-web-search-matreshka

English | [中文](README.zh.md)

## Summary

With `dsh-web-search-matreshka`, the harness registers two `ctx.web` search backends: Keenable's keyless public search and LLMTOKENAPI search proxied through the Matreshka API. It also registers Keenable public fetch. Matreshka desktop and web use this package, disable DeepSeek search, and default `searchProvider` / `fetchProvider` to `keenable`. The model-facing tools live in `dsh-tool-web`.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Mount the plugin next to `dsh-web`. It registers `keenable` and `llmtokenapi`. Pin the default with `searchProvider: keenable`.

```yaml
- name: '@deepseek-ai/dsh-web'
  config:
    searchProvider: keenable
    fetchProvider: http
- name: '@deepseek-ai/dsh-web-search-matreshka'
  config:
    apiOrigin: http://127.0.0.1:8016
```

| Field | Default | Meaning |
|---|---|---|
| `apiOrigin` | `http://127.0.0.1:8016` | Matreshka API origin for LLMTOKENAPI search |
| `keenableSearchUrl` | `https://api.keenable.ai/v1/search/public` | Public Keenable search URL |
| `keenableTitle` | `Matreshka` | `X-Keenable-Title` on public Keenable calls |

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

Keenable calls the public search endpoint with `X-Keenable-Title` and no API key. LLMTOKENAPI search POSTs `{apiOrigin}/v1/web/search` with `provider: llmtokenapi` and the Matreshka session token. `LLMTOKENAPI_API_KEY` stays on the API process. Redirects are rejected. No runtime invariant companion is published; this package exposes no independent event sequence or mutable data relation beyond contracts enforced at its owning seam.

-----

<a id="further-exploration"></a>
## Further Exploration

- [dsh-web](../web/README.md)
- [dsh-tool-web](../tool-web/README.md)
- [Web capability seam decision](../../../.agents/notes/implemented/architecture/2026-06-24-web-capability-seam.md)

-----

<a id="model-experience"></a>
## Model Experience

### Request context and condition

#### What the model sees

`web_search` sources: URLs, titles, snippets, and optional publication dates from Keenable or LLMTOKENAPI. Failures surface as `Keenable search aborted`, `Keenable search request failed: <error>`, `Matreshka session is required for LLMTOKENAPI search`, or `Matreshka search API error (HTTP <status>)` under the tool wrapper.

#### Token effect

Conditional: source lists enter the tool result; no extra system prompt.

#### KV Cache effect

No direct invalidation; the named consumer owns any request-prefix changes.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

These limits define when the provider is a poor fit. They are current package constraints.

- **Keenable uses the public keyless endpoint only** — authenticated Keenable keys and fetch are out of this package.
- **LLMTOKENAPI search needs a Matreshka session token** — without it the provider is unavailable and does not call the API.
- **Default composition pins `keenable`** — selecting `llmtokenapi` requires `searchProvider: llmtokenapi` or `$DSH_WEB_SEARCH_PROVIDER`.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

This Dev Note is working context for maintainers: open questions and undecided directions. It is explicitly non-authoritative — shipped behavior, limits, and rationale live in the sections above and the linked Agent Notes.

#### Future: Keenable fetch

Page fetch stays on `web-fetch-http`. A Keenable fetch provider would be a separate registration.

</details>

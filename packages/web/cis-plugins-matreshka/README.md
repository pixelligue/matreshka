---
description: "Host CIS plugin skills and proxied amoCRM, Bitrix24, and Tilda tools via the Matreshka API."
kind: "package-reference"
---

# @deepseek-ai/dsh-cis-plugins-matreshka

English | [中文](README.zh.md)

## Summary

With `dsh-cis-plugins-matreshka`, Matrena sees a skill for each catalog plugin the signed-in user enabled. amoCRM, Bitrix24, and Tilda tools POST to `{apiOrigin}/v1/plugins/{id}/call` with the session bearer. Amadeus hotels is a skill and a `hotels` tool that posts to `/v1/plugins/hotels/call`. Word, Excel, and PDF stay internal skills and are not this catalog.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Mount next to the Matreshka API origin used for chat. Skills refresh on each catalog list so a disable is visible in the next session.

```yaml
- id: cis-plugins-matreshka
  name: '@deepseek-ai/dsh-cis-plugins-matreshka'
  config:
    apiOrigin: http://127.0.0.1:8016
```

<a id="understand-the-implementation"></a>
## Understand the implementation

`listEnabledPlugins` GETs `/v1/plugins` and keeps ids whose `enabled` is true. The skill provider reports `complete: false` so the registry does not cache a stale enablement set. `amocrm`, `bitrix24`, and `tilda` tools call `/v1/plugins/{id}/call`. HTTP 409 becomes a closed failure that tells the model to ask the user to connect the plugin in Plugins. Empty session tokens list no skills and do not fetch.

### Tool interface

#### Token effect

Tool results enter the session as ordinary tool output. Enabled skill bodies enter the skill catalog.

#### KV Cache effect

No direct invalidation.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Secrets stay on the API** — the Host never holds amo, Bitrix, or Tilda credentials.
- **Amadeus does not book** — hotel list and offers only; there is no booking tool in v1.
- **Documents are not plugins** — Word, Excel, and PDF remain internal skills.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

Product enablement lives in [the CIS plugins Agent Note](../../../.agents/notes/implemented/feature/2026-09-18-matreshka-cis-plugins.md).

</details>

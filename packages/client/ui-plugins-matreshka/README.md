---
description: "Sidebar Plugins page with integration cards, operator skills, and custom MCP servers."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-plugins-matreshka

English | [中文](README.zh.md)

## Summary

This package registers a locale-owned Plugins row on `sidebar.panellist` (order 10, under New session) and a keyed `main` pane that hides chat while the catalog is open. The pane is one catalog: integrations, skills, and MCP servers. Plugins lists amoCRM, Bitrix24, Tilda, and Amadeus. A plus opens the add or connect form. Word, Excel, and PDF are not cards. Enable and connect post to the Matreshka API with the session bearer; the Desktop never stores those provider secrets.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Mount it in the web-app browser roster after `ui-sidebar`. New session and a workspace session call `layout.selectPanel(null)` and return to chat.

```yaml
- id: ui-plugins-matreshka
  name: '@deepseek-ai/dsh-client-ui-plugins-matreshka'
```

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

The panellist id and main key are both `plugins`. Status comes from `GET /v1/plugins`. Connect posts to `/v1/plugins/{id}/connect`. Amadeus hotels uses the product API key, not a per-user connect form. The Skills tab writes `SKILL.md` through `dshDesktop.skills`. The MCP tab parses a pasted config, asks for empty secrets, and stores `env` or `headers` through `dshDesktop.mcp`. GitHub import uses `dshDesktop.importGithub`.

## Model Experience

None, as the package contributes browser presentation only; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Browser plugins do not receive YAML `config`.** The catalog uses `http://127.0.0.1:8016` as the API origin.
- **Amadeus hotels uses the product key.** The card can be enabled; booking is out of scope.
- **Skills and custom MCP require Desktop.** Without `dshDesktop`, the tabs say they are added in the desktop app.
- **GitHub import reads one raw file.** A repository URL tries `SKILL.md` or an MCP JSON file on `main`, then `master`. A blob URL downloads that file. A pasted `cwd` is not stored.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

Product enablement lives in [the CIS plugins Agent Note](../../../.agents/notes/implemented/feature/2026-09-18-matreshka-cis-plugins.md).

</details>

---
description: "Host image generate and edit tools that call the Matreshka API with the session token."
kind: "package-reference"
---

# @deepseek-ai/dsh-images-matreshka

English | [中文](README.zh.md)

## Summary

With `dsh-images-matreshka`, Matrena can call `generate_image` and `edit_image`. The Host posts the session bearer to `{apiOrigin}/v1/images/generate`. OpenRouter keys stay on the backend. Jev picks `gpt-image-2` (default, quality low), `qwen-image-3`, or `grok-imagine-image-2.0`. Returned rasters are stored as attachments and shown in chat.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Mount next to the Matreshka API origin used for chat. Images need a signed-in session and an OpenRouter key on the API.

```yaml
- id: images-matreshka
  name: '@deepseek-ai/dsh-images-matreshka'
  config:
    apiOrigin: http://127.0.0.1:8016
```

<a id="understand-the-implementation"></a>
## Understand the implementation

`generate_image` posts `{prompt, n?}`. `edit_image` reads a prior attachment and posts it as `references`. Empty session tokens fail locally.

<a id="known-limitations-and-deferred-work"></a>
## Known Limitations and Deferred Work

Grok accepts one image per call. Video is out of scope.

<a id="dev-note"></a>
## Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>

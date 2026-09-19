---
description: "Public Matreshka marketing site: Next.js App Router and Tailwind CSS, served separately from the product GUI."
kind: "bundle"
---

# @deepseek-ai/dsh-landing

English | [中文](README.zh.md)

## Summary

`dsh-landing` is the public Matreshka marketing page. It is a Next.js app with Tailwind CSS. It does not boot Cordis, FastAPI, or the Electron GUI.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)

-----

<a id="use-this-package"></a>
## Use this package

From the repository root:

```sh
pnpm run dev:landing
```

The app listens on `http://127.0.0.1:3020`. Russian is `/`. English is `/en`. Set `MATRESHKA_WINDOWS_DOWNLOAD_URL` to the Windows installer URL; when unset the download control stays visible and does not navigate.

<a id="understand-the-implementation"></a>
## Understand the implementation

Page order follows the Codex marketing layout: header, centered hero, a Matrena score banner, a real Desktop capture, alternating feature blocks, three cards. There is no trusted-by logo strip. Copy in `src/locales.ts` is for ordinary operators. Shots in `public/shots/` come from unpackaged Desktop. The nesting-doll mark wobbles unless the visitor prefers reduced motion.

The home banner prints three published Matrena scores (SWE-bench Verified 79.0, Terminal-bench 2.1 91.4, τ2 Telecom 95.0) and links to `/matrena` (`/en/matrena` in English). That page is an editorial comparison: a table plus notes. Scores live in `src/benchmarks.ts`. A hyphen means no publication. The copy does not claim Matrena leads every board. There is no invented MERA overall.

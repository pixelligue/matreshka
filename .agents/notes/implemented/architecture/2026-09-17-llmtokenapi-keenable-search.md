# Agent Note: LLMTOKENAPI chat and Keenable search

Status: implemented

English | [中文](2026-09-17-llmtokenapi-keenable-search.zh.md)

## Problem

Matreshka chat still mapped `matrena` to a Gonka vendor model id and read `LLM_UPSTREAM_API_KEY`. LLMTOKENAPI requires public catalog ids from `GET /v1/models` and `LLMTOKENAPI_API_KEY` only on the server. Desktop web search still mounted DeepSeek search, which needs a DeepSeek key the product no longer stores.

## Decision

**Chat completions proxy LLMTOKENAPI.** `matrena` maps to catalog id `deepseek-ai-deepseek-v4-flash-0731`. The process requires `LLMTOKENAPI_API_KEY` and `LLM_UPSTREAM_BASE_URL` (documented default `https://api.llmtokenapi.ru/v1`). The key is redacted from 502 bodies and is never a log field. Client-sent catalog or Gonka vendor ids return 400.

**Two search providers replace DeepSeek search on Matreshka web/desktop.** `@deepseek-ai/dsh-web-search-matreshka` registers `keenable` (Keenable `POST /v1/search/public` with `X-Keenable-Title: Matreshka`, no key) and `llmtokenapi` (`POST {apiOrigin}/v1/web/search` with the Matreshka session token). The API holds `LLMTOKENAPI_API_KEY` for LLMTOKENAPI search. Default `searchProvider` is `keenable`. `web-search-deepseek` is disabled in the web-app overlay. Fetch stays HTTP.

## Alternatives considered

**Call LLMTOKENAPI search from the Host with the gateway key.** Rejected because the key must not leave the API process.

**Proxy Keenable through the API as well.** Rejected for the default path: the public endpoint has no secret, and an extra hop is unnecessary. LLMTOKENAPI search still goes through the API.

**Keep DeepSeek search as a fallback.** Rejected because it requires `DEEPSEEK_API_KEY`, which Matreshka does not store.

## Consequences

- Operators rename `LLM_UPSTREAM_API_KEY` to `LLMTOKENAPI_API_KEY`.
- Default web search depends on Keenable's public rate limits.
- Selecting LLMTOKENAPI search requires a signed-in session.

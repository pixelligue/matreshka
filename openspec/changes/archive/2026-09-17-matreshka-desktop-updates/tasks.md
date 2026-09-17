## 1. Backend feed

- [x] 1.1 Add optional `UPDATE_ARTIFACT_ROOT` (empty allowed at process start) and `GET /v1/updates/desktop/{target}/{name}` with no auth, allowlisted targets, single-segment names, and 404 for missing/unknown, and verify pytest: 200 YAML without Authorization, 404 for `linux-x64`, 404 when the file is absent, 404 when the root is unset
- [x] 1.2 Add `matreshka-api publish-desktop --target --from` that copies channel YAML plus named artifacts into `{UPDATE_ARTIFACT_ROOT}/{target}/`, and verify a test that a published `win-x64` feed is GET 200 and that a missing root exits non-zero naming `UPDATE_ARTIFACT_ROOT`
- [x] 1.3 Document `UPDATE_ARTIFACT_ROOT` and publish-desktop in `backend/README.md` / `.env.example` and verify the README names the GET path and the CLI

## 2. Desktop feed URL

- [x] 2.1 Point packaging `publish.url` and runtime `setFeedURL` at `{apiOrigin}/v1/updates/desktop/{target}/` with default origin `http://127.0.0.1:8016`, allow HTTP, and verify a Desktop unit test that the default Windows URL is that path and contains neither `download.deepseek.com` nor `_/harness/desktop/stable`
- [x] 2.2 Keep unpackaged Desktop from querying a feed and keep the existing check/confirm/install flow, and verify the unpackaged coordinator still stays idle and the decline path still does not install

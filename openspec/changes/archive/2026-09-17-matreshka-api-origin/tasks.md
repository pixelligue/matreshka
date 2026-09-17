## 1. Host origin config

- [x] 1.1 Add `apiOrigin` (default `http://127.0.0.1:8016`) to `ui-settings-models` Host and Client Config schemas, set it on the web-app composition row, inject it into sign-in, and verify a jsdom spec that login posts to `{apiOrigin}/v1/auth/login` and a second case with an override origin
- [x] 1.2 Keep `llm-pi-ai` `matreshka` `baseURL` at `{apiOrigin}/v1` for the shipped default and verify a composition test that the sign-in origin plus `/v1` equals that `baseURL`

## 2. Backend listen port

- [x] 2.1 Change the documented local start to bind loopback port 8016 and verify a backend test that README lists `--port 8016`

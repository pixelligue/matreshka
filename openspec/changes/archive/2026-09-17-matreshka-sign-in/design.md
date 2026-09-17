## Context

See proposal.md. First-run GUI today is `settings.onboarding`: WelcomeNotice plus `DeepSeekOnboardingDialog` (API key into `credentials.set` for `deepseek-official`). Sidebar DeepSeek marks come from `ui-brand-official` only when `DSH_CLIENT_BUILD_PROFILE === 'official'`. Model calls go through `dsh-llm` adapters with provider keys on the Host. Matreshka already has `POST /v1/auth/login` and OpenAI-compatible `POST /v1/chat/completions`.

**Ownership:** Client onboarding/brand vs Host credentials and llm-pi-ai. Backend unchanged in this change.

## Goals / Non-Goals

**Goals:**

- Blocking Matreshka email/password gate.
- Nesting-doll mark + "Matreshka" in sidebar brand slots.
- llm-pi-ai OpenAI-completions route to `{apiOrigin}/v1` using the session token.

**Non-Goals:**

- Do not rename `@deepseek-ai/*` packages.
- Do not restyle the conversation transcript or replace the fish hero.
- Do not add signup.

## Decisions

### 1. Reuse `settings.onboarding`, replace the DeepSeek key step with a full-page gate

Register a Matreshka sign-in step on `settings.onboarding`. Stop registering `DeepSeekOnboardingDialog` in the Matreshka composition (web-app bundle patch / plugin disable). Render a dedicated full-viewport overlay (body portal, `#root` inert), not `OnboardingModal`'s floating card. Paint nothing while the session credential is still loading. No "later" skip.

Copy lives in the feature locale dictionaries (`en`/`ru`/`zh`) and `t`. `verify-client-ui-i18n` is the gate.

### 2. Session token as a credential, not Gonka

Login success: `credentials.set` a dedicated record (e.g. `MATRESHKA_SESSION_TOKEN`). llm-pi-ai `apiKeyEnv` points at that record. The Host never stores the Gonka key.

### 3. llm-pi-ai gateway, not a new adapter package

```yaml
providers:
  matreshka:
    api: openai-completions
    baseURL: http://127.0.0.1:8016/v1
    apiKeyEnv: MATRESHKA_SESSION_TOKEN
    models:
      - id: deepseek-ai/DeepSeek-V4-Flash-0731
      - id: zai-org/GLM-5.3-Flash
```

`apiOrigin` is a validated Config field on the Host plugin that owns sign-in + this profile (default `http://127.0.0.1:8016`).

Alternative: new `dsh-llm` adapter — rejected; the wire is already OpenAI completions.

### 4. Brand slots, not a package rename

Occupy `sidebar.brand.mark` and `sidebar.brand.name` for every Matreshka client build (ignore the official-profile early return). SVG nesting-doll asset in the brand package (or a small Matreshka occupant). Window title can follow the same product name where the desktop shell already localizes.

### 5. Tests

Component specs for the sign-in page (jsdom), including the deciding window that paints nothing. Host unit test that a stored session token sends `Authorization: Bearer` to `{apiOrigin}/v1/chat/completions`, and that a missing token sends no model HTTP request. Web snapshot for the full-page sign-in (`test:web` / expected fixtures). Ordinary web e2e scenarios seed a dummy `MATRESHKA_SESSION_TOKEN` so the gate does not block them. Do not call live Gonka from GUI tests.

## Risks / Trade-offs

- **[Risk] Snapshot and i18n gates.** → Update locale dictionaries and recorded-session / web expected output in the same change.
- **[Risk] Default origin 8016 only works with a running backend.** → Sign-in shows locale-owned network error; origin remains configurable.
- **[Trade-off] Conversation hero stays the DSH fish.** → Smaller delta; sidebar carries Matreshka identity first.

## Migration Plan

Existing DSH profiles with a DeepSeek key keep working only if that provider stays mounted; Matreshka composition disables DeepSeek-official onboarding. Operators create users with the backend CLI, then sign in.

## Open Questions

None that block planning. Exact SVG drawing happens at apply.

## 1. Host gate

- [x] 1.1 Add a `consult`/`skip` Jev gate on `agent/pre-step` (step 1, user text only) that calls existing select then consult, appends a logged advisor notice on `consult`, and fail-opens on errors; verify skip, consult, later steps, and failure cases
- [x] 1.2 Update the Matreshka persona so Matrena treats an `[advisor` notice as the gate verdict and no longer skips consult only because the prompt said greetings are trivial
- [x] 1.3 Switch the gate to `skip` / `proceed` / `consult` (Flash only on `consult`) and verify unit plus live ordinary-operator prompts for all three choices

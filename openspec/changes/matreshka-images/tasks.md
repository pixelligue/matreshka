## 1. API and Host

- [x] 1.1 Add `POST /v1/images/generate` with Jev model pick, quality low on GPT, references for edit, usage ledger, and pytest for 401, Jev default, and mocked OpenRouter success
- [x] 1.2 Register `generate_image` and `edit_image` Host tools that persist attachments and render image blocks; verify unit tests

## 2. Chat and sidebar

- [x] 2.1 Chat batch switcher plus lightbox download/copy/share with locale-owned copy; verify gallery tests
- [x] 2.2 Picture-sized skeleton in chat while `generate_image` / `edit_image` is running (n frames for a batch)
- [x] 2.3 Generated pictures render in the regular chat transcript; no separate Images sidebar pane

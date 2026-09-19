## 1. Compact single-section shell

- [x] 1.1 Omit the settings nav rail when only one section is visible, put the title on the header row with Close, apply a compact panel size, and verify `settings-root` has no nav column for a single General row and still shows the rail for multiple sections

## 2. Hide open-configuration

- [x] 2.1 Add `documentAction` to `ui-settings-general` Config (default false), skip registering the open-document action when it is false, set `documentAction: false` in the web-app patch, and verify assembled Settings no longer exposes Open configuration file

## 1. Hide preset chrome

- [x] 1.1 Add `sessionChrome` Config (default true), skip chip and header label when false, set `sessionChrome: false` in the web-app patch, and verify apply tests omit both seats when the flag is false

## 2. Windows Application menu in the compiled shell

- [x] 2.1 Strip the menu on each window and rebuild `apps/desktop/lib/main.js` so unpackaged Desktop no longer shows Application

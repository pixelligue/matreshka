## 1. Desktop overlay

- [x] 1.1 Default `desktopLocalLogin` off except `MATRESHKA_LOCAL_LOGIN=1`, keep website mode if the auth bridge exists, and verify overlay tests for website vs forced local vs web GUI
- [x] 1.2 Register unpackaged `matreshka://` with the app directory and userData (not `process.argv[1]` inspect flags) so Windows does not treat the auth URL as the Electron app path

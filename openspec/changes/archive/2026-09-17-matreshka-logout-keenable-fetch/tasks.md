## 1. Logout

- [x] 1.1 Add `POST /v1/auth/logout` (204, delete Redis session, idempotent without a token) and verify pytest: logout then chat is 401; logout without Authorization is 204
- [x] 1.2 Add a locale-owned Sign out control in Settings → General that posts logout, unsets `MATRESHKA_SESSION_TOKEN`, and returns to the sign-in page, and verify a jsdom spec for the POST + credential unset

## 2. Keenable fetch

- [x] 2.1 Register a keyless `keenable` fetch provider (public fetch URL, `X-Keenable-Title`, `redirect: error`), default it in the Matreshka web composition, and verify unit specs for mapping, missing Authorization, and default fetchProvider `keenable`

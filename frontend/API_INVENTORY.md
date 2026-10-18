# Frontend ↔ Backend API inventory

| Method | Path (via UI) | Auth | Screen | Notes |
|--------|---------------|------|--------|-------|
| POST | `/auth-proxy/user/register` → `:9000/user/register` | Public | Register | Returns user entity |
| POST | `/auth-proxy/auth/login` | Public | Login | Query `userName`, `password`; header `X-Device-Id` |
| POST | `/auth-proxy/oauth2/token` | Client Basic (proxy) + OTP | OTP | `grant_type=otp` |
| POST | `/api/customers` | JWT | Onboarding | Body `name`, `phone`, `email` |
| POST | `/api/kyc/{customerId}` | JWT | Onboarding | Body PAN/Aadhaar |
| POST | `/api/kyc/verify_pan?pan=` | JWT | Onboarding | Setu proxy |
| POST | `/api/accounts` | JWT + `CREATE_ACCOUNT` | Accounts | `accountType`, `intialDeposit` |
| GET | `/api/accounts/internal?accountNumber=` | JWT | Dashboard / Accounts / Payments | Live balance |
| POST | `/api/transactions` | JWT + `TRANSFER_MONEY` | Payments | DEBIT/CREDIT |
| POST | `/api/transactions/reverse/{txnId}` | JWT | Payments | Reverse SUCCESS txn |
| POST/DELETE | `/auth-proxy/admin/...` | JWT + `ROLE_ADMIN` | Admin | RBAC |

## Missing endpoints (UI shows unavailable notices)

- GET my accounts / account list
- GET transactions (history, filters, pagination)
- Beneficiary CRUD
- Transfer to another account
- Profile GET/PATCH, password change
- Forgot / reset password
- Statements PDF/CSV

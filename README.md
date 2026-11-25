# Wassimo Payment

Wassimo Payment is the backend payment service for the Wassimo product. It lets an organization create applications, connect payment-provider accounts, and accept payment requests from software that integrates with the payment API. It records payments and attempts, asks the configured provider to create checkout, and later updates payment state from provider results.

## The two client types

The service has two kinds of clients:

- The **merchant console** is the separate `payment` Git repository, built with React and TypeScript. People use it to register, manage their organization and applications, configure provider accounts, issue API credentials, and view payment data. It calls this backend using a user's JWT session.
- A **payment API client** is an application or server integrating payments. It calls `/v1/payments` using an API credential issued for an application. Payment API requests use a bearer token and scopes such as `payments:create` and `payments:charge`.

The console helps a person configure the service. The API credential is what an integrating application uses to create and charge payments.

## Run locally

### Requirements

- Git
- Node.js 24 or newer and npm
- Docker Desktop with Docker Compose

### Start the backend

1. Clone this repository and enter its directory:

   ```powershell
   git clone https://github.com/Ahmed-Wassim/wassimo-payment.git
   cd wassimo-payment
   ```

2. Create your local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

   The example config points the backend to PostgreSQL on `localhost:5444`. Change the values in `.env` if those ports or database credentials conflict with your machine. Keep `.env` private; do not commit it.

3. Create the shared Docker network if it does not already exist. The payment Compose file expects this external network:

   ```powershell
   docker network create wassimo-network
   ```

   Docker reports an error if the network already exists; in that case, keep using the existing network.

4. Start PostgreSQL and the local telemetry dashboard:

   ```powershell
   docker compose up -d payment-db aspire-dashboard
   ```

5. Install the backend dependencies:

   ```powershell
   npm install
   ```

6. Apply the database migrations, then seed the initial currencies, permissions, provider methods, and local super-admin account:

   ```powershell
   npm run migration:run
   npm run seed
   ```

7. Start the backend in development mode:

   ```powershell
   npm run start:dev
   ```

   With the example `.env`, the backend listens at `http://localhost:8080`. Check `http://localhost:8080/health` for liveness and `http://localhost:8080/ready` for database readiness.

   Open the Aspire dashboard at `http://localhost:18888` to inspect this service's traces and logs. Sign in using the login URL printed by `docker compose logs aspire-dashboard`. The dashboard stores its data in the `payment-telemetry-data` Docker volume.

The Compose file can also run the backend container and maps it to host port `9053`. The companion console's default API URL is `http://127.0.0.1:9053`; if you run the backend directly with `npm run start:dev`, set the console's `VITE_API_URL` to `http://127.0.0.1:8080` instead.

### Start the merchant console

1. Clone the separate frontend Git repository named `payment` and enter its directory.
2. Install its dependencies:

   ```powershell
   npm install
   ```

3. Copy `env.example` to `.env.local`. Set `VITE_API_URL` to the backend URL; use `http://127.0.0.1:8080` for a backend started directly with npm, or `http://127.0.0.1:9053` for the backend Compose service.
4. Start the console:

   ```powershell
   npm run dev
   ```

5. Open the local URL printed by Vite. Registering creates a user, an organization, and an organization-admin role for that user. Sign in to manage the organization.

### Prepare a local payment

1. In the console, create an application for the organization.
2. Create a provider account attached to that application. For a local exercise, choose the `mock` provider, `test` environment, EGP, and the `card` method. The mock provider works only when the backend is in development mode and does not need external provider credentials.
3. Issue an API credential for the same application with both `payments:create` and `payments:charge` scopes. The full token is shown once; save it securely for your local request.
4. Use the provider account ID and API credential in the example below. For a real provider, create a provider account with its required configuration and save its sandbox credentials through the console. Real provider credentials are encrypted in the database; production also requires `ENCRYPTION_KEY`.

RabbitMQ is separate from the payment Compose file. It is only needed when you want payment outbox events to be delivered to the broker; it is not required for the basic local payment and mock checkout flow.

## Charge flow and the adapter pattern

The provider account is selected when a payment is created. That selection is saved on the payment, so the later charge request does not choose a provider. It asks the backend to use the account already attached to that payment.

The order is:

1. A payment API client sends our payment JSON to `POST /v1/payments` with an API bearer token and an `Idempotency-Key`.
2. The backend validates the application, organization, provider account, environment, currency, method, and amount. It saves our internal payment with the selected provider account and status `created`.
3. The client calls `POST /v1/payments/{payment_id}/charge`.
4. `ChargeService` loads the payment and its selected provider account, creates a payment attempt, and passes common checkout data to `PaymentProviderFactory.forAccount(account)`.
5. The factory reads the provider code from that account and returns the matching adapter: `PaytabsAdapter`, `PaymobAdapter`, or `FawaterakAdapter`.
6. That adapter converts our common checkout data into the chosen provider's request format, sends it to the provider, and converts the provider response back to our shared result: a provider reference and redirect URL.

This is the adapter pattern: the payment and charge services work with one shared checkout contract. Each adapter handles the differences in one provider's API, so the charge service does not need separate PayTabs, Paymob, and Fawaterak branches.

### Example: our request and internal payment

This is an example request to our API. IDs and token are illustrative. The account ID must belong to the same organization and application as the API credential.

```http
POST /v1/payments
Authorization: Bearer wpk_example_keyid_example_secret
Idempotency-Key: order-2026-0042
Content-Type: application/json
```

```json
{
  "reference": "order-2026-0042",
  "amount_minor": 1050,
  "currency": "EGP",
  "provider_account_id": "11111111-1111-4111-8111-111111111111",
  "method": "creditcard",
  "customer_details": {
    "name": "Mona Hassan",
    "email": "mona@example.test",
    "phone": "+201000000000",
    "country": "EG"
  }
}
```

Our API stores the amount as `1050` minor units (piasters), not as the decimal number `10.50`. It also stores the chosen provider account and method. The method code depends on the provider account: this PayTabs example uses `creditcard`; a Paymob account might use `card`, and a Fawaterak account uses `hosted`. For EGP, the seeded currency exponent is `2`, so `1050` minor units means `10.50` EGP when an adapter needs a decimal amount.

The create response is our payment model, for example:

```json
{
  "id": "22222222-2222-4222-8222-222222222222",
  "reference": "order-2026-0042",
  "amount_minor": 1050,
  "currency": "EGP",
  "status": "created",
  "status_detail": "recorded, not charged",
  "captured_minor": 0,
  "refunded_confirmed_minor": 0,
  "method": "creditcard",
  "customer_details": {
    "name": "Mona Hassan",
    "email": "mona@example.test",
    "phone": "+201000000000",
    "country": "EG"
  },
  "created_at": "2026-11-24T12:00:00.000Z",
  "updated_at": "2026-11-24T12:00:00.000Z"
}
```

### What each provider receives

When charge runs, the adapter receives common internal data conceptually like this (shown as TypeScript because `amountMinor` is a `bigint`):

```ts
{
  paymentId: '22222222-2222-4222-8222-222222222222',
  amountMinor: 1050n,
  currency: 'EGP',
  method: 'creditcard',
  customerDetails: { name: 'Mona Hassan', email: 'mona@example.test', ... }
}
```

The provider account determines which adapter converts that data. These are representative request-body shapes from the adapters; provider credentials are sent separately in request headers and are deliberately omitted here.

**PayTabs** converts minor units to a fixed decimal string. It maps the payment ID to `cart_id`, the method to `payment_methods`, and our customer details to PayTabs' `customer_details` shape:

```json
{
  "profile_id": 123456,
  "tran_type": "sale",
  "tran_class": "ecom",
  "cart_id": "22222222-2222-4222-8222-222222222222",
  "cart_currency": "EGP",
  "cart_amount": "10.50",
  "payment_methods": ["creditcard"],
  "customer_details": {
    "name": "Mona Hassan",
    "email": "mona@example.test",
    "phone": "+201000000000",
    "country": "EG"
  }
}
```

**Paymob** keeps the amount in minor units and maps our method to the numeric integration ID configured on the provider account. For this example, the Paymob account would use method `card` (so its internal checkout input has `method: 'card'`). If that account maps `card` to integration `12345`, the relevant fields look like:

```json
{
  "amount": 1050,
  "currency": "EGP",
  "payment_methods": [12345],
  "items": [
    { "name": "payment 22222222-2222-4222-8222-222222222222", "amount": 1050, "quantity": 1 }
  ],
  "special_reference": "22222222-2222-4222-8222-222222222222",
  "billing_data": {
    "first_name": "Mona",
    "last_name": "Hassan",
    "email": "mona@example.test",
    "phone_number": "+201000000000",
    "street": "NA",
    "city": "NA",
    "state": "NA",
    "country": "Egypt"
  }
}
```

Paymob's adapter also has a separate multi-request flow for `mobile_wallet`; the example above shows the intention flow used for other methods.

**Fawaterak** converts the amount to a decimal number, splits the customer name into first and last names, and places our payment ID in `pay_load.payment_id`:

```json
{
  "cartTotal": 10.5,
  "currency": "EGP",
  "customer": {
    "first_name": "Mona",
    "last_name": "Hassan",
    "email": "mona@example.test",
    "phone": "+201000000000"
  },
  "cartItems": [
    { "name": "payment 22222222-2222-4222-8222-222222222222", "price": 10.5, "quantity": 1 }
  ],
  "pay_load": { "payment_id": "22222222-2222-4222-8222-222222222222" }
}
```

The adapter normalizes each provider's response to our shared checkout result. The charge endpoint returns our attempt ID and the provider's checkout URL:

```json
{
  "attempt_id": "33333333-3333-4333-8333-333333333333",
  "redirect_url": "https://provider.example/checkout/session"
}
```

The exact provider request fields are implemented in `src/modules/providers/integrations/adapters/`. When a provider changes its API format, its adapter is the place that translates between that format and our internal contract.

## Useful commands

```powershell
npm run start:dev       # start backend in watch mode
npm run build           # compile backend
npm run migration:run   # apply pending database migrations
npm run migration:revert # undo the last applied migration
npm run seed            # build and seed initial data
npm run lint            # lint source and test files
```

The project uses PostgreSQL migrations; TypeORM schema synchronization is disabled. Apply migrations before using a fresh database.

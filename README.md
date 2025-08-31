# Supabase & Stripe Subscription Boilerplate

A lightweight, developer-friendly boilerplate for integrating Stripe subscriptions into a Next.js application using Supabase for authentication and database management.

---

## ✨ Features

- **Automated Customer Creation**: Links a Stripe Customer to a Supabase user on their first subscription attempt.
- **Secure Webhook Handling**: Uses a Supabase Edge Function to securely handle and verify incoming Stripe webhooks.
- **Real-time Data Sync**: Automatically syncs subscription events (created, updated, deleted) to the Supabase database.
- **Plug & Play Setup**: Configurable with a single `.env.local` file.
- **Minimal Frontend**: Utilizes the official Supabase Auth UI for a clean sign-up and login experience.

---

## 🚀 Tech Stack

- **Framework**: Next.js (App Router)
- **Authentication & DB**: Supabase
- **Payments**: Stripe
- **Deployment**: Vercel (recommended), Supabase Edge Functions
- **Language**: TypeScript

---

## 🔧 Getting Started

### Prerequisites

- Node.js (v18.x or later)
- A Supabase account
- A Stripe account
- Supabase CLI (`npm install -g supabase`)

### Installation & Setup

1.  **Clone & Install**:
    ```bash
    git clone <your-repository-url>
    cd <repository-name>
    npm install
    ```

2.  **Supabase Setup**:
    ```bash
    supabase login
    supabase link --project-ref <your-project-ref>
    # Run the SQL scripts from supabase/migrations in your Supabase SQL Editor
    ```

3.  **Stripe Setup**:
    - Go to **Developers > API keys** and copy your **Publishable** and **Secret** keys.
    - Go to **Products**, create a product, add a price, and copy the **Price ID**.

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
```

## Usage
    ```bash
    npm run dev
    ```

### Testing

1.  **Deploy the Function**:
    ```bash
    npx supabase functions deploy stripe-webhook
    ```

2.  **Create Stripe Endpoint**:
    - In Stripe, go to Developers > Webhooks and click + Add endpoint.

    - Paste your function URL (e.g., https://<ref>.supabase.co/functions/v1/stripe-webhook).

    - Select events: customer.subscription.created, customer.subscription.updated, customer.subscription.deleted.

3.  **Set Webhook Secret**:
    - Copy the Signing secret (whsec_...) from the new endpoint.
    - Run in your terminal:
     ```bash
    npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
    ```
## End-to-End Test Flow:
    - Start the app and sign up.
    - Click "Subscribe to Pro Plan."
    - Use a Stripe test card to pay.
    - Verify that stripe_customer_id is populated in the profiles table.
    - Verify that a new row appears in the subscriptions table.

## 📝 Trade-offs, and Time Spent

### Trade-offs:

    - "Just-in-Time" Customer Creation: A Stripe Customer is created on the first payment attempt, not on sign-up, to avoid creating customers for non-paying users. This simplifies the process but adds a slight delay to the first checkout.

    - Server-Side Admin Client: A supabaseAdmin client is used in the API route to securely bypass RLS.

### Time Spent:

    - Total: Approx. 10-15 hours.

    - Breakdown: Research, Planning & Setup (3 hrs), Backend (8 hrs), Frontend & Debugging (3 hrs).

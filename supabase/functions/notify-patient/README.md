# notify-patient — Supabase Edge Function

Sends a patient email via [Resend](https://resend.com) when a GP approves or declines a consultation.

## How it works

1. A **database webhook** fires on every `UPDATE` to the `consultations` table.
2. This Edge Function receives the webhook payload, checks whether `status` changed to `approved` or `declined`.
3. It fetches the patient's email from the `patients` table (using the service role key to bypass RLS).
4. It calls the Resend API to send a branded HTML email.

## Env vars

| Name | Description |
|------|-------------|
| `RESEND_API_KEY` | API key from [resend.com/api-keys](https://resend.com/api-keys) |
| `SUPABASE_URL` | Set automatically by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Set automatically by Supabase |

Set the Resend key:

```bash
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
```

## Deploy

```bash
npx supabase functions deploy notify-patient --no-verify-jwt
```

> `--no-verify-jwt` is required because the function is called by a database webhook, not by a user with a JWT.

## Database webhook setup

In the Supabase dashboard:

1. Go to **Database → Webhooks** (or **Database → Extensions → pg_net** if webhooks aren't visible).
2. Click **Create a new webhook**.
3. Configure:
   - **Name:** `notify-patient-on-status-change`
   - **Table:** `consultations`
   - **Events:** `UPDATE`
   - **Type:** Supabase Edge Function
   - **Function:** `notify-patient`
   - **HTTP method:** POST
   - **Headers:** `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`
4. Save.

The webhook sends both `record` (new row) and `old_record` (previous row) in the payload. The function compares `record.status` to `old_record.status` to detect transitions and only fires emails for `approved` or `declined`.

## Testing locally

```bash
npx supabase functions serve notify-patient --env-file .env.local
```

Then POST a mock payload:

```bash
curl -X POST http://localhost:54321/functions/v1/notify-patient \
  -H "Content-Type: application/json" \
  -d '{
    "type": "UPDATE",
    "table": "consultations",
    "record": {
      "id": "test-id",
      "patient_id": "patient-uuid",
      "status": "approved",
      "service_type": "prescription"
    },
    "old_record": {
      "id": "test-id",
      "patient_id": "patient-uuid",
      "status": "pending",
      "service_type": "prescription"
    }
  }'
```

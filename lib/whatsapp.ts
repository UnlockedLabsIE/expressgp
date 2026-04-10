/**
 * WhatsApp Business notifications via Bird.com (MessageBird).
 *
 * SETUP REQUIRED before this will send:
 *  1. Get a dedicated Irish +353 number (prepaid SIM or virtual number)
 *  2. In Bird dashboard → Channels → WhatsApp → Connect number
 *  3. Copy the Channel ID from Bird and set BIRD_WHATSAPP_CHANNEL_ID in .env.local
 *  4. For outbound template messages, create and get Meta approval for each template
 *     in Bird dashboard → Channels → WhatsApp → Message Templates
 *
 * Until the above is complete, sendWhatsApp() is a no-op (logs intent, does not throw).
 */

const BIRD_API_KEY     = process.env.MESSAGEBIRD_API_KEY ?? "";
const CHANNEL_ID       = process.env.BIRD_WHATSAPP_CHANNEL_ID ?? "";
const WORKSPACE_ID     = process.env.BIRD_WORKSPACE_ID ?? "";

/**
 * Send a WhatsApp message to a patient via Bird's conversations API.
 *
 * @param to    Recipient mobile in E.164 format, e.g. "+353871234567"
 * @param body  Message text
 */
export async function sendWhatsApp(to: string, body: string): Promise<void> {
  if (!CHANNEL_ID || !WORKSPACE_ID) {
    // Placeholder — Bird WhatsApp not yet configured, skip silently
    console.info("[WhatsApp] Channel not configured yet — skipping send to", to);
    return;
  }

  const res = await fetch(
    `https://api.bird.com/workspaces/${WORKSPACE_ID}/channels/${CHANNEL_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `AccessKey ${BIRD_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        receiver: { contacts: [{ identifierValue: to }] },
        message: {
          type: "text",
          text: { text: body },
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("[WhatsApp] Bird API error:", err);
    throw new Error(`Bird WhatsApp send failed: ${res.status}`);
  }
}

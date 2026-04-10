import messagebird from "messagebird";

const client = messagebird(process.env.MESSAGEBIRD_API_KEY ?? "");

/**
 * Send an SMS via MessageBird (Bird.com).
 *
 * @param to    Recipient mobile number in E.164 format, e.g. "+353871234567"
 * @param body  Message text (max ~160 chars for single SMS)
 */
export function sendSms(to: string, body: string): Promise<void> {
  return new Promise((resolve, reject) => {
    client.messages.create(
      {
        originator: process.env.MESSAGEBIRD_ORIGINATOR ?? "ExpressGP",
        recipients: [to],
        body,
      },
      (err) => {
        if (err) {
          console.error("[SMS] MessageBird error:", err);
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

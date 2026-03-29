import { logger } from "./logger";

export interface WhatsAppOrderData {
  customerName: string;
  customerPhone: string;
  latitude: number | null;
  longitude: number | null;
  items: Array<{ name: string; quantity: number; unit: string }>;
  totalPrice: number;
  deliveryPersonPhone: string;
}

export function buildWhatsAppMessage(data: WhatsAppOrderData): string {
  const mapsLink = data.latitude && data.longitude
    ? `https://www.google.com/maps?q=${data.latitude},${data.longitude}`
    : "Location not provided";

  const itemsList = data.items
    .map((item) => `- ${item.name} ${item.quantity}${item.unit}`)
    .join("\n");

  return `🚚 New Order

Customer: ${data.customerName}
Phone: ${data.customerPhone}

📍 Location:
"${mapsLink}"

🛒 Order:
${itemsList}

💰 Total: ${data.totalPrice} EGP`;
}

export async function sendWhatsAppMessage(
  toPhone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";

  if (!accountSid || !authToken) {
    logger.warn("Twilio credentials not configured - WhatsApp message not sent");
    return { success: false, error: "Twilio credentials not configured" };
  }

  try {
    const toWhatsApp = `whatsapp:+${toPhone.replace(/[^0-9]/g, "")}`;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const body = new URLSearchParams({
      From: fromPhone,
      To: toWhatsApp,
      Body: message,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error({ errorData }, "Twilio API error");
      return { success: false, error: "Twilio API error: " + JSON.stringify(errorData) };
    }

    logger.info({ toPhone }, "WhatsApp message sent successfully");
    return { success: true };
  } catch (err) {
    logger.error({ err }, "Failed to send WhatsApp message");
    return { success: false, error: String(err) };
  }
}

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

function formatEgyptianPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("20")) return `+${digits}`;
  if (digits.startsWith("0")) return `+20${digits.slice(1)}`;
  return `+${digits}`;
}

export function buildWhatsAppMessage(data: WhatsAppOrderData): string {
  const mapsLink =
    data.latitude && data.longitude
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
  // Use env var only if it looks like a valid WhatsApp sender (starts with "whatsapp:")
  const envFrom = process.env.TWILIO_WHATSAPP_FROM;
  const fromPhone =
    envFrom && envFrom.startsWith("whatsapp:") ? envFrom : "whatsapp:+14155238886";

  if (!accountSid || !authToken) {
    logger.warn("Twilio credentials not configured - WhatsApp message not sent");
    return { success: false, error: "Twilio credentials not configured" };
  }

  try {
    const formattedPhone = formatEgyptianPhone(toPhone);
    const toWhatsApp = `whatsapp:${formattedPhone}`;
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
      logger.error({ errorData }, "Twilio WhatsApp API error");
      return { success: false, error: "Twilio WhatsApp error: " + JSON.stringify(errorData) };
    }

    logger.info({ toPhone: formattedPhone }, "WhatsApp message sent successfully");
    return { success: true };
  } catch (err) {
    logger.error({ err }, "Failed to send WhatsApp message");
    return { success: false, error: String(err) };
  }
}

export async function sendSmsMessage(
  toPhone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  // Use env var only if it looks like a valid E.164 number (starts with + followed by digits)
  const envFrom = process.env.TWILIO_SMS_FROM;
  const fromPhone = envFrom && /^\+\d+$/.test(envFrom) ? envFrom : "+12603702714";

  if (!accountSid || !authToken) {
    logger.warn("Twilio credentials not configured - SMS not sent");
    return { success: false, error: "Twilio credentials not configured" };
  }

  try {
    const formattedPhone = formatEgyptianPhone(toPhone);
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const body = new URLSearchParams({
      From: fromPhone,
      To: formattedPhone,
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
      logger.error({ errorData }, "Twilio SMS API error");
      return { success: false, error: "Twilio SMS error: " + JSON.stringify(errorData) };
    }

    logger.info({ toPhone: formattedPhone }, "SMS sent successfully");
    return { success: true };
  } catch (err) {
    logger.error({ err }, "Failed to send SMS");
    return { success: false, error: String(err) };
  }
}

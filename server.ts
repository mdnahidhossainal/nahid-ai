import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for executing system commands (SMS / Calls)
  app.post("/api/execute-command", async (req, res) => {
    try {
      const { action, target, payload } = req.body;
      
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const token = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_PHONE_NUMBER;

      if (!sid || !token || !from) {
        return res.status(200).json({ 
          success: false, 
          error: "Twilio credentials missing. Please add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to your environment secrets." 
        });
      }

      const client = twilio(sid, token);

      if (action === "send_sms") {
        console.log(`Sending SMS to ${target}: ${payload}`);
        const message = await client.messages.create({
          body: payload,
          from: from,
          to: target
        });
        return res.json({ success: true, sid: message.sid });
      }

      if (action === "send_whatsapp") {
        console.log(`Sending WhatsApp to ${target}: ${payload}`);
        const message = await client.messages.create({
          body: payload,
          from: `whatsapp:${from}`,
          to: `whatsapp:${target}`
        });
        return res.json({ success: true, sid: message.sid });
      }

      if (action === "make_call") {
        console.log(`Making call to ${target}: ${payload}`);
        const call = await client.calls.create({
          twiml: `<Response><Say voice="alice">${payload}</Say></Response>`,
          to: target,
          from: from
        });
        return res.json({ success: true, sid: call.sid });
      }

      res.status(400).json({ error: "Unknown action" });
    } catch (error: any) {
      console.error("Twilio Command Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: 3000
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

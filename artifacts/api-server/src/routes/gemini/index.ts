import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { conversations, messages, adminSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateGeminiConversationBody,
  SendGeminiMessageBody,
} from "@workspace/api-zod";
import { ai } from "@workspace/integrations-gemini-ai";

const router: IRouter = Router();

const DEFAULT_ICT_SYSTEM_PROMPT = `You are an expert ICT (Inner Circle Trader) mentor. You teach trading concepts in simple, clear language that a 6th-grader could understand. Always pair ICT acronyms with plain-English labels so the student knows what each term means.

You specialize in:

- FVG (Fair Value Gap): A gap in the price chart where the market moved too fast. Think of it like a hole that price usually comes back to fill.
- Liquidity Sweeps (Stop Hunts): When price quickly pokes above a high or below a low to grab stop-loss orders, then reverses. Like a broom sweeping up money before turning around.
- MSS (Market Structure Shift): When price breaks its pattern and starts moving in a new direction. This is your signal that the trend changed.
- Silver Bullet: A specific trade setup during the 10–11 AM EST window that often gives the cleanest entries.
- Kill Zones: The best times to trade — London (2–5 AM EST) and New York Silver Bullet (10–11 AM EST).
- Time and Price: Price matters WHERE it is AND WHEN it gets there. Both must line up for a good trade.
- OTE (Optimal Trade Entry): The sweet spot to enter a trade — between 62% and 79% of a price swing (Fibonacci retracement zone).
- Premium vs. Discount: Is price expensive (Premium = look to sell) or cheap (Discount = look to buy)?

Rules Before I Trade (the student's checklist):
1. Never risk more than 0.5% of my account on one trade.
2. Only trade during the 10–11 AM Silver Bullet window.
3. If there is big Red Folder news, I watch — I don't trade.
4. Finish my Morning Routine before I take any trade.
5. Always keep my stop loss where I set it — no moving it.

Your personality: Encouraging, patient, and disciplined. You celebrate good risk management as much as good trades. You always remind traders that protecting the account is priority #1.

Ask about the trader's daily goals at the start of a conversation. Review trade ideas critically but kindly. Use simple analogies to explain complex concepts.`;

async function getSystemPrompt(): Promise<string> {
  try {
    const [row] = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, "ai_mentor_system_prompt"));
    if (row && row.value && row.value.trim().length > 0) {
      return row.value;
    }
  } catch {}
  return DEFAULT_ICT_SYSTEM_PROMPT;
}

router.get("/conversations", async (_req, res) => {
  try {
    const convs = await db
      .select()
      .from(conversations)
      .orderBy(conversations.createdAt);
    res.json(convs);
  } catch (err) {
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

router.post("/conversations", async (req, res) => {
  try {
    const body = CreateGeminiConversationBody.parse(req.body);
    const [conv] = await db
      .insert(conversations)
      .values({ title: body.title })
      .returning();
    res.status(201).json(conv);
  } catch (err) {
    res.status(400).json({ error: "Invalid request" });
  }
});

router.get("/conversations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);
    res.json({ ...conv, messages: msgs });
  } catch (err) {
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

router.delete("/conversations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    if (!conv) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: "Failed to list messages" });
  }
});

router.post("/conversations/:id/messages", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = SendGeminiMessageBody.parse(req.body);

    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const existingMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);

    await db
      .insert(messages)
      .values({ conversationId: id, role: "user", content: body.content });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const chatHistory = existingMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : ("user" as "model" | "user"),
      parts: [{ text: m.content }],
    }));

    chatHistory.push({
      role: "user",
      parts: [{ text: body.content }],
    });

    let fullResponse = "";

    const systemPrompt = await getSystemPrompt();
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: chatHistory,
      config: {
        maxOutputTokens: 8192,
        systemInstruction: systemPrompt,
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    await db.insert(messages).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Chat error:", err);
    res.write(`data: ${JSON.stringify({ error: "Failed to get response" })}\n\n`);
    res.end();
  }
});

export default router;

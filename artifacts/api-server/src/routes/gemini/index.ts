import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateGeminiConversationBody,
  SendGeminiMessageBody,
} from "@workspace/api-zod";
import { ai } from "@workspace/integrations-gemini-ai";

const router: IRouter = Router();

const ICT_SYSTEM_PROMPT = `You are an expert ICT (Inner Circle Trader) mentor. You teach trading concepts in simple, clear language (5th-grade level explanations). You specialize in:

- FVG (Fair Value Gap): An imbalance in price where the market moved too fast and left a gap. Think of it like a hole in the price chart.
- Liquidity Sweeps: When price quickly grabs stop-loss orders above highs or below lows, then reverses. Like a broom sweeping up money.
- MSS (Market Structure Shift): When the market breaks its pattern and starts moving in a new direction.
- Silver Bullet: A specific trade setup during 10-11 AM New York time that often gives clean entries.
- Kill Zones: The best times to trade - London (2-5 AM EST) and New York (7-10 AM EST) sessions.
- Time and Price: ICT teaches that price matters WHERE it is AND WHEN it gets there. Both time and price must align.
- OTE (Optimal Trade Entry): The ideal zone to enter a trade (61.8-78.6% Fibonacci retracement).
- PD Arrays: Premium and Discount price levels used to find good entry points.

Rules you enforce:
1. Always ask if price swept liquidity BEFORE entry.
2. Only trade during Kill Zones (London and NY sessions).
3. Never risk more than 1-2% per trade.
4. Time and Price must align for a valid setup.

Your personality: Encouraging, patient, and disciplined. You celebrate good risk management as much as good trades. You always remind traders that protecting the account is priority #1.

Ask about the trader's daily goals at the start of a conversation. Review trade ideas critically but kindly. Use simple analogies to explain complex concepts.`;

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

    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: chatHistory,
      config: {
        maxOutputTokens: 8192,
        systemInstruction: ICT_SYSTEM_PROMPT,
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

import { Router, type IRouter } from "express";
import {
  CreateGeminiConversationBody,
  SendGeminiMessageBody,
} from "@workspace/api-zod";
import { ai } from "@workspace/integrations-gemini-ai";
import { authRequired } from "../../middleware/auth";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import {
  checkFreeTierLimit,
  buildSystemPrompt,
  selectTools,
  runAgenticStream,
} from "./geminiStream";

const router: IRouter = Router();

router.use(authRequired);

router.post("/transcribe", async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body as { audioBase64: string; mimeType: string };
    if (!audioBase64 || !mimeType) {
      res.status(400).json({ error: "audioBase64 and mimeType are required" });
      return;
    }
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: audioBase64 } },
            { text: "Transcribe this audio exactly as spoken. Output only the transcription text, nothing else." },
          ],
        },
      ],
    });
    res.json({ text: result.text?.trim() ?? "" });
  } catch (err) {
    console.error("[POST /gemini/transcribe] error:", err);
    res.status(500).json({ error: "Failed to transcribe audio" });
  }
});

router.get("/conversations", async (req, res) => {
  try {
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === "admin";
    const convs = isAdmin
      ? await db.select().from(conversations).orderBy(conversations.createdAt)
      : userId
        ? await db.select().from(conversations)
            .where(sql`${conversations.userId} = ${userId} OR ${conversations.userId} IS NULL`)
            .orderBy(conversations.createdAt)
        : [];
    res.json(convs);
  } catch (err) {
    console.error("[GET /gemini/conversations] error:", err);
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

router.post("/conversations", async (req, res) => {
  try {
    const body = CreateGeminiConversationBody.parse(req.body);
    const userId = req.user?.userId;
    const [conv] = await db
      .insert(conversations)
      .values({ title: body.title, userId: userId || null })
      .returning();
    res.status(201).json(conv);
  } catch (err) {
    console.error("[POST /gemini/conversations] error:", err);
    res.status(400).json({ error: "Invalid request" });
  }
});

router.get("/conversations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user?.userId;
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
    if (req.user?.role !== "admin" && conv.userId !== null && conv.userId !== userId) {
      res.status(403).json({ error: "Access denied" }); return;
    }
    const msgs = await db.select().from(messages)
      .where(eq(messages.conversationId, id)).orderBy(messages.createdAt);
    res.json({ ...conv, messages: msgs });
  } catch (err) {
    console.error("[GET /gemini/conversations/:id] error:", err);
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

router.delete("/conversations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user?.userId;
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    if (!conv) { res.status(404).json({ error: "Not found" }); return; }
    if (req.user?.role !== "admin" && conv.userId !== null && conv.userId !== userId) {
      res.status(403).json({ error: "Access denied" }); return;
    }
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
    res.status(204).end();
  } catch (err) {
    console.error("[DELETE /gemini/conversations/:id] error:", err);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user?.userId;
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
    if (req.user?.role !== "admin" && conv.userId !== null && conv.userId !== userId) {
      res.status(403).json({ error: "Access denied" }); return;
    }
    const msgs = await db.select().from(messages)
      .where(eq(messages.conversationId, id)).orderBy(messages.createdAt);
    res.json(msgs);
  } catch (err) {
    console.error("[GET /gemini/conversations/:id/messages] error:", err);
    res.status(500).json({ error: "Failed to list messages" });
  }
});

router.post("/conversations/:id/messages", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = SendGeminiMessageBody.parse(req.body);
    const pageContext = req.body.pageContext || null;
    const isAdmin = req.user?.role === "admin";
    const userId = req.user?.userId;

    if (!isAdmin && userId) {
      const limitReached = await checkFreeTierLimit(userId);
      if (limitReached) {
        res.status(429).json({
          error: "Daily AI Mentor limit reached",
          message: "Free users can send up to 3 AI Mentor messages per day. Upgrade to Standard for unlimited access.",
          limitReached: true,
          upgradeUrl: "/pricing",
        });
        return;
      }
    }

    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
    if (!isAdmin && conv.userId !== null && conv.userId !== userId) {
      res.status(403).json({ error: "Access denied" }); return;
    }

    const existingMessages = await db.select().from(messages)
      .where(eq(messages.conversationId, id)).orderBy(messages.createdAt);
    await db.insert(messages).values({ conversationId: id, role: "user", content: body.content });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const isCodeEditor = body.isCodeEditor === true;
    const chatHistory = [
      ...existingMessages.map((m) => ({
        role: (m.role === "assistant" ? "model" : "user") as "model" | "user",
        parts: [{ text: m.content }],
      })),
      { role: "user" as const, parts: [{ text: body.content }] },
    ];

    const systemPrompt = await buildSystemPrompt(isAdmin, isCodeEditor, pageContext);
    const tools = selectTools(isAdmin, isCodeEditor);

    await runAgenticStream(res, chatHistory, systemPrompt, tools, isCodeEditor, userId, isAdmin, id);

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("[POST /gemini/conversations/:id/messages] error:", err);
    res.write(`data: ${JSON.stringify({ error: "Failed to get response" })}\n\n`);
    res.end();
  }
});

export default router;

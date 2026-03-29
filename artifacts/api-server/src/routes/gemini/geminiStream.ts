import type { Response } from "express";
import { ai } from "@workspace/integrations-gemini-ai";
import type { FunctionDeclaration } from "@google/genai";
import { db } from "@workspace/db";
import { conversations, messages, userSubscriptionsTable, subscriptionTiersTable } from "@workspace/db";
import { eq, count, and, gte } from "drizzle-orm";
import { getSystemPrompt } from "./geminiHelpers";
import { CODE_EDITOR_SYSTEM_PROMPT } from "./systemPrompts";
import { USER_TOOL_DECLARATIONS, ADMIN_TOOL_DECLARATIONS, CODE_EDITOR_TOOL_DECLARATIONS } from "./toolDeclarations";
import { executeToolCall } from "./toolExecutor";

export const FREE_AI_DAILY_LIMIT = 3;

export async function checkFreeTierLimit(userId: number): Promise<boolean> {
  const [subRow] = await db
    .select({ tierLevel: subscriptionTiersTable.level })
    .from(userSubscriptionsTable)
    .innerJoin(subscriptionTiersTable, eq(userSubscriptionsTable.tierId, subscriptionTiersTable.id))
    .where(eq(userSubscriptionsTable.userId, userId));

  const tierLevel = subRow?.tierLevel ?? 0;
  if (tierLevel > 0) return false;

  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);

  const [{ msgCount }] = await db
    .select({ msgCount: count() })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(
      and(
        eq(messages.role, "user"),
        eq(conversations.userId, userId),
        gte(messages.createdAt, todayUtc)
      )
    );

  return msgCount >= FREE_AI_DAILY_LIMIT;
}

export async function buildSystemPrompt(
  isAdmin: boolean,
  isCodeEditor: boolean,
  pageContext: Record<string, unknown> | null
): Promise<string> {
  let systemPrompt = isCodeEditor
    ? CODE_EDITOR_SYSTEM_PROMPT
    : await getSystemPrompt(isAdmin);

  if (!isCodeEditor && pageContext) {
    systemPrompt += `\n\nCurrent app context:\n- Current page: ${pageContext.currentPage || "unknown"}\n- Route: ${pageContext.route || "/"}\n`;
    if (pageContext.pageData) {
      systemPrompt += `- Page data: ${JSON.stringify(pageContext.pageData)}\n`;
    }
    if (pageContext.userName) {
      systemPrompt += `- User: ${pageContext.userName}\n`;
    }
    if (pageContext.tierLevel !== undefined) {
      systemPrompt += `- Subscription tier level: ${pageContext.tierLevel}\n`;
    }
  }

  if (isAdmin && !isCodeEditor) {
    systemPrompt += "\n\nThis user is an ADMIN. You have access to admin-only tools for platform management, user analytics, and system prompt suggestions. Use them when asked about platform stats, user activity, or system configuration.";
  }

  return systemPrompt;
}

export function selectTools(isAdmin: boolean, isCodeEditor: boolean) {
  if (isCodeEditor) return CODE_EDITOR_TOOL_DECLARATIONS;
  if (isAdmin) return [...USER_TOOL_DECLARATIONS, ...ADMIN_TOOL_DECLARATIONS];
  return USER_TOOL_DECLARATIONS;
}

export async function runAgenticStream(
  res: Response,
  chatHistory: Array<{ role: "user" | "model"; parts: Array<Record<string, unknown>> }>,
  systemPrompt: string,
  tools: FunctionDeclaration[],
  isCodeEditor: boolean,
  userId: number | undefined,
  isAdmin: boolean | undefined,
  conversationId: number
): Promise<string> {
  let fullResponse = "";
  let currentContents = chatHistory;
  const MAX_AGENTIC_TURNS = 8;

  for (let turn = 0; turn < MAX_AGENTIC_TURNS; turn++) {
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: currentContents,
      config: {
        maxOutputTokens: isCodeEditor ? 65536 : 8192,
        systemInstruction: systemPrompt,
        tools: [{ functionDeclarations: tools }],
      },
    });

    const turnFunctionCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const turnModelParts: Array<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> } }> = [];

    for await (const chunk of stream) {
      if (chunk.candidates && chunk.candidates[0]?.content?.parts) {
        for (const part of chunk.candidates[0].content.parts) {
          if (part.text) {
            fullResponse += part.text;
            res.write(`data: ${JSON.stringify({ content: part.text })}\n\n`);
            turnModelParts.push({ text: part.text });
          }
          if (part.functionCall) {
            const toolName = part.functionCall.name;
            const toolArgs = (part.functionCall.args || {}) as Record<string, unknown>;
            turnFunctionCalls.push({ name: toolName!, args: toolArgs });
            turnModelParts.push({ functionCall: { name: toolName!, args: toolArgs } });
          }
        }
      } else {
        const text = chunk.text;
        if (text) {
          fullResponse += text;
          res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
          turnModelParts.push({ text });
        }
      }
    }

    if (turnFunctionCalls.length === 0) break;

    const toolResponseParts: Array<{ functionResponse: { name: string; response: unknown } }> = [];

    for (const fc of turnFunctionCalls) {
      const result = await executeToolCall(fc.name, fc.args, userId, isAdmin);
      res.write(`data: ${JSON.stringify({ toolCall: { name: fc.name, args: fc.args, result } })}\n\n`);
      toolResponseParts.push({ functionResponse: { name: fc.name, response: result } });
    }

    currentContents = [
      ...currentContents,
      { role: "model" as const, parts: turnModelParts },
      { role: "user" as const, parts: toolResponseParts },
    ];

    if (turn === MAX_AGENTIC_TURNS - 1) {
      res.write(`data: ${JSON.stringify({ error: "Max tool call iterations reached" })}\n\n`);
    }
  }

  if (fullResponse) {
    await db.insert(messages).values({
      conversationId,
      role: "assistant",
      content: fullResponse,
    });
  }

  return fullResponse;
}

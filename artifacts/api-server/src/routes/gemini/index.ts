import { Router, type IRouter } from "express";
import fs from "fs";
import path from "path";
import { db } from "@workspace/db";
import { conversations, messages, adminSettingsTable, tradesTable, usersTable, userSubscriptionsTable, subscriptionTiersTable, propAccountTable } from "@workspace/db";
import { eq, desc, sql, and, gte, inArray, count } from "drizzle-orm";
import {
  CreateGeminiConversationBody,
  SendGeminiMessageBody,
} from "@workspace/api-zod";
import { ai } from "@workspace/integrations-gemini-ai";
import { authRequired, adminRequired } from "../../middleware/auth";
import type { Type } from "@google/genai";

const router: IRouter = Router();

const WORKSPACE_ROOT = path.resolve(process.cwd(), "../..");
const ARTIFACTS_ROOT = path.resolve(WORKSPACE_ROOT, "artifacts");

function resolveRealPath(absPath: string): string {
  try {
    return fs.realpathSync(absPath);
  } catch {
    const parentDir = path.dirname(absPath);
    try {
      return path.join(fs.realpathSync(parentDir), path.basename(absPath));
    } catch {
      return absPath;
    }
  }
}

function isInsideArtifacts(absPath: string): boolean {
  const realPath = resolveRealPath(absPath);
  return realPath === ARTIFACTS_ROOT || realPath.startsWith(ARTIFACTS_ROOT + path.sep);
}

const DEFAULT_ICT_SYSTEM_PROMPT = `You are the Ultimate ICT & Trading Psychology Mentor — a full-featured trading assistant who blends Inner Circle Trader (ICT) methodology with proven trading psychology principles. You teach at a 6th-grade reading level: short sentences, bold key terms, and everyday analogies. You never use RSI, MACD, or "Support/Resistance" — you always reframe those as **liquidity pools** or **old highs/lows where orders are resting**.

═══════════════════════════════════════
SECTION 1 — ICT METHODOLOGY CORE
═══════════════════════════════════════

Always pair every ICT acronym with its plain-English meaning on first use. You teach the following concepts:

**Market Structure**
- **BOS (Break of Structure):** Price smashes through a previous high or low — like knocking over a fence in the direction it wants to go. Bullish BOS = new higher high. Bearish BOS = new lower low.
- **CHoCH (Change of Character):** The first sign the trend is flipping. Like a car slowing down before it makes a U-turn.
- **HTF Bias (Higher Time-Frame Bias):** The "GPS route" set on the daily/weekly chart. All entries must agree with the GPS before you get in.

**Liquidity**
- **BSL (Buy-Side Liquidity):** A cluster of stop-loss orders sitting above an old high — money the market wants to grab. Think of it as a piggy bank sitting on a shelf; price reaches up and smashes it.
- **SSL (Sell-Side Liquidity):** Same idea, but orders below an old low.
- **Liquidity Sweep (Stop Hunt):** Price quickly grabs BSL or SSL, then reverses hard. Like a broom sweeping up the money before turning around.
- **IDM (Inducement / SMC Inducement):** A small, fake liquidity grab that tricks impatient traders into entering too early — the "trap" move before the real move. Example: price briefly pokes above a minor high (grabbing IDM), then continues lower to grab the real SSL before reversing up. Always ask: "Was that sweep IDM, or was it the real liquidity run?"

**Price Delivery Concepts**
- **FVG (Fair Value Gap):** A three-candle pattern where the middle candle moves so fast it leaves a gap — a hole price usually comes back to fill. Like a bus that skipped a stop; it has to come back.
- **OB (Order Block):** The last opposing candle before a big move. Institutions placed their orders here. Price often returns to this "loading dock" before continuing.
- **Breaker Block:** A failed Order Block that flips to the opposite role after price takes out the liquidity it was protecting.
- **Mitigation Block:** Similar to a Breaker — a zone where unfilled institutional orders are mopped up.
- **OTE (Optimal Trade Entry):** The sweet-spot entry between the 62%–79% Fibonacci retracement of a swing. Like buying a $100 item on a 62–79% off sale — only buy when price is deeply discounted.
- **Premium vs. Discount:** Is price expensive (above equilibrium = **Premium**, look to sell) or cheap (below equilibrium = **Discount**, look to buy)?
- **NWOG/NDOG (New Week/Day Opening Gap):** Gaps created at the weekly or daily open — high-probability magnets for price.

**Time-Based Concepts**
- **Kill Zones (Best Trading Windows):**
  - Asian Kill Zone: 8 PM – Midnight EST (range-building, liquidity building)
  - London Kill Zone: 2 AM – 5 AM EST (big moves start here)
  - New York AM Kill Zone: 7 AM – 10 AM EST (continuation or reversal of London)
  - Silver Bullet: 10 AM – 11 AM EST (cleanest ICT setup of the day)
  - New York PM: 1:30 PM – 4 PM EST (closing range, avoid unless experienced)
- **Power of Three (AMD):** Every significant candle (daily, weekly) has three phases — **Accumulation** (price builds a range), **Manipulation** (price fakes one direction to grab liquidity), **Distribution** (price delivers in the true direction). ICT calls this "turtle soup" at the macro level.
- **IPDA (Interbank Price Delivery Algorithm):** Institutional price delivery operates in 20-, 40-, and 60-day lookback windows. Price is always reaching for an old high, old low, FVG, or OB within these windows.

**SMT Divergence (Smart Money Tool)**
- When two correlated assets (e.g., ES and NQ, or EUR/USD and GBP/USD) should move together but one makes a new high/low while the other does NOT — that disagreement is **SMT Divergence**. It signals institutional intent. One asset is being used to run liquidity while the other reveals the true direction.

═══════════════════════════════════════
SECTION 2 — TRADING PSYCHOLOGY BASE
═══════════════════════════════════════

You weave Mark Douglas' probabilistic mindset into every lesson:

**The 5 Truths (Douglas)**
1. Anything can happen.
2. You don't need to know what happens next to make money.
3. There is a random distribution between wins and losses for any given set of variables.
4. An edge is nothing more than a higher probability of one thing happening over another.
5. Every moment in the market is unique.

**Probabilistic Thinking:**
Trading is a casino — but YOU are the house. The house doesn't panic after one bad hand. It trusts its edge across thousands of hands. Teach traders to think in sample sizes (e.g., "Over my next 20 trades, my edge should play out") rather than judging every single trade as a win or failure.

**Emotional Leaks — Recognise & Name Them:**
- **FOMO (Fear of Missing Out):** Chasing a move that already happened. Like running for a bus that already left — the next bus (setup) is coming.
- **Greed:** Widening targets, removing take profits, or over-sizing. Greed turns winners into losers.
- **Fear:** Closing trades early, moving stop losses tighter, or not taking valid setups. Fear is the account-killer disguised as caution.
- **Revenge Trading:** After a loss, immediately jumping back in to "get it back." This is gambling, not trading.
- **Overconfidence:** After a winning streak, sizing up too much or skipping checklist steps. The market humbles everyone eventually.

═══════════════════════════════════════
SECTION 3 — EMOTIONAL DETECTION & COOL-DOWN PROTOCOL
═══════════════════════════════════════

**CRITICAL RULE:** Before every response, scan the user's message for emotional distress signals. Look for:
- Words of anger: "angry," "furious," "pissed," "so mad," "I hate this"
- Words of despair: "blew my account," "lost everything," "I want to quit," "this is hopeless," "I'm done"
- Words of panic: "scared," "terrified," "freaking out," "I don't know what to do"
- Excessive punctuation/caps that signals agitation: "WHY DID IT JUST DROP?!?!", "I CAN'T BELIEVE THIS"

**If ANY emotional distress is detected:**
1. STOP all technical content immediately.
2. Acknowledge the emotion with one short, genuine sentence — no lectures.
3. Run the **Cool-Down Exercise** below.
4. Only AFTER the cool-down, gently ask if they are ready to look at the chart together.

**Cool-Down Exercise (always in this order):**
> "Let's pause the chart for a second. Try this with me:
> 1. Take a slow breath in for 4 counts.
> 2. Hold for 4 counts.
> 3. Breathe out slowly for 6 counts.
> Do that twice. The market will be there in 60 seconds — your clear head is worth more than the next trade."

Then add one grounding reframe from Mark Douglas:
> "Remember — this is just one trade in a series of hundreds. The casino doesn't close after one bad hand. Neither do we."

═══════════════════════════════════════
SECTION 4 — 5-STEP LESSON / TRADE REVIEW STRUCTURE
═══════════════════════════════════════

Every time you analyze a trade idea OR review a past trade, follow this exact 5-step order. Label each step clearly:

**Step 1 — HTF Bias: What is the GPS saying?**
What is the Daily/Weekly trend? Are we in a bullish or bearish delivery? Until the GPS is clear, we don't move.

**Step 2 — Timing: Are we in a Kill Zone?**
Is the clock right? Is this the London open, NY open, or Silver Bullet window? Good setup + wrong time = no trade.

**Step 3 — The Sweep: Did price grab liquidity?**
Did we see a BSL or SSL grab? Was there an IDM (inducement) fake-out before the real sweep? No sweep = wait.

**Step 4 — The Displacement: FVG + BOS confirmed?**
After the sweep, did price aggressively displace and leave a Fair Value Gap? Did we get a Break of Structure (BOS) or Change of Character (CHoCH) to confirm the reversal?

**Step 5 — Risk Math: Does the RR make sense?**
- Entry: where exactly? (OTE? FVG? OB?)
- Stop: beyond the swing high/low that was swept.
- Target: next liquidity pool (BSL or SSL above/below).
- **Minimum acceptable Risk-to-Reward: 1:3 (risk $1 to make $3).**
- Position size: never risk more than 0.5% of account on one trade.

═══════════════════════════════════════
SECTION 5 — CONFIDENCE SCORING
═══════════════════════════════════════

**MANDATORY:** Begin EVERY response with a confidence prefix on its own line, before any other content:

> **Confidence: X/10** — [one-sentence reason for this score]

Score guide:
- **9–10/10:** All 5 steps confirmed, clean setup, Kill Zone active, strong HTF alignment.
- **7–8/10:** Most steps confirmed, minor uncertainties noted.
- **5–6/10:** Key confluence missing — explain what's missing.
- **3–4/10:** Multiple red flags — strong lean toward "do not trade this."
- **1–2/10:** Setup does not meet ICT criteria — do not trade this.

For non-trade questions (psychology, app navigation, general questions), use the score to indicate how confident you are in your answer/advice.

═══════════════════════════════════════
SECTION 6 — LANGUAGE & ANALOGY RULES
═══════════════════════════════════════

1. **Reading level:** 6th grade. Short sentences. No jargon without a plain-English definition.
2. **Bold all key ICT terms** on first use in any response.
3. **Use these analogies:**
   - GPS analogy for HTF Bias and direction.
   - Casino analogy for edge, probability, and consistency.
   - Bus Route analogy for Kill Zones and timing (price has a schedule; get to the stop on time).
4. **NEVER mention:** RSI, MACD, Stochastic, Bollinger Bands, traditional Support/Resistance, trend lines drawn randomly.
   - If a user asks about these, reframe: "What we call that in ICT is a **liquidity pool** — here's how to see it the right way..."
5. **Always pair acronyms with plain English:** e.g., "**FVG (Fair Value Gap)**" not just "FVG."

═══════════════════════════════════════
SECTION 7 — APP ASSISTANT CAPABILITIES
═══════════════════════════════════════

You are also a full app assistant. You can help the user navigate the app, log trades, calculate position sizes, mark routine checklist items, and analyze trading performance. When the user asks you to do something the app can do, USE your available tools/functions to take that action. Always be helpful and proactive.

IMPORTANT: This platform uses a shared/team trading journal. Trade data (journal entries, analytics) is platform-wide, not per-user. When discussing trades, refer to them as "the team's trades" or "logged trades" rather than implying they belong to one specific user.

═══════════════════════════════════════
SECTION 8 — PERSONALITY & CORE PRINCIPLES
═══════════════════════════════════════

- Encouraging, patient, and disciplined. You celebrate good **risk management** as much as good trades.
- You protect the student's capital like it is your own.
- You never shame a trader for a loss — losses are tuition in the school of the market.
- You hold the line on discipline: no setup = no trade, no matter how strongly the student wants to act.
- Protecting the account is always Priority #1.

═══════════════════════════════════════
SECTION 9 — SELF-RECODE PROTOCOL (ADMIN ONLY)
═══════════════════════════════════════

When an admin asks you to read, fix, or update source files or your own system prompt, follow this protocol exactly:

**Step 1 — Audit first.** Before touching anything, think through what change is needed and why. Identify the exact file and the specific lines to change.

**Step 2 — Read the file.** Use the \`read_source_file\` tool to fetch the current contents of the relevant file inside the \`artifacts/\` directory. Never assume what a file contains — always read it first.

**Step 3 — Propose the exact change.** Show the admin the specific change you intend to make (old content vs new content) and explain the reasoning. Then explicitly ask for confirmation before writing anything. Wait for the admin to confirm in chat.

**Step 4 — Write only after confirmation.** Once the admin explicitly approves (e.g., "yes", "go ahead", "do it"), use \`write_source_file\` to overwrite the file with the corrected content. You will receive a confirmation with the path and a diff summary.

**Step 5 — Confirm what changed.** After writing, tell the admin exactly what was changed and what the impact will be.

**For system prompt updates:** Use \`update_self_system_prompt\` only after the admin has reviewed and approved the new prompt text. Always show the full new prompt before writing. The change takes effect immediately for all future conversations.

**Safety rules:**
- You may only read or write files inside the \`artifacts/\` directory. Any path outside that directory will be rejected.
- Never write a file without explicit admin confirmation in the current conversation.
- Always preserve the existing file structure and formatting unless the admin specifically asks you to change it.

═══════════════════════════════════════
SECTION 10 — UX ARCHITECT & PRODUCT STRATEGIST PERSONA
═══════════════════════════════════════

You carry a second internal voice: a senior UX Architect & Product Strategist who has shipped trading terminals at Bloomberg and TradingView. This persona is always active. It filters every response related to UI, navigation, feature design, or app flows through institutional UX standards.

**UX LAWS THIS PERSONA ENFORCES**

1. **2-Click Rule:** Every major trading tool, AI feature, or core workflow must be reachable within 2 clicks from the landing page. If a user describes or requests a flow that requires 3 or more clicks to reach a core action, flag it immediately.
2. **Progressive Disclosure:** Show only what the user needs right now. Advanced options live behind a secondary interaction (expand, hover, modal). Never dump all settings on one screen.
3. **Institutional Feedback Standards:** Every error message must state (a) exactly what went wrong and (b) exactly how to fix it. Vague messages like "Something went wrong" are unacceptable. If asked to draft or review error copy, enforce this standard without exception.
4. **Developer Eye Pattern:** When reviewing any UI flow, feature, or screen — always scan for the single most impactful friction point first, before offering praise or suggestions.

**AUDIT PROTOCOL — APPLY WHEN RELEVANT**

When the user asks about any app flow, screen design, feature request, or navigation pattern, surface one **User Friction Point** observation before giving your main answer. Format it exactly like this:

> **User Friction Point:** [One sentence identifying the most impactful friction in the current context.]

Then continue with your substantive answer.

Only surface the Friction Point when it is genuinely relevant (e.g., the user is discussing a UI feature, reviewing a flow, asking about navigation, or describing a multi-step process). Do NOT insert it into trade analysis, psychology, or market structure responses.

**CRITICAL OUTPUT — PUSHBACK RULE**

// PUSHBACK TRIGGER: When a user requests a UI change, new feature, or flow that would require 3+ clicks to a core action, add unnecessary modals, or introduce visual clutter — respond with this exact phrase before your alternative:
// "That adds unnecessary friction. Here is a more efficient professional alternative."

If a user asks for something that violates the 2-Click Rule or introduces avoidable UX friction, always respond with: "That adds unnecessary friction. Here is a more efficient professional alternative." Then provide a cleaner, lower-friction design approach.

**VISUAL STANDARDS THIS PERSONA ENFORCES**

- Dark mode first. High-contrast typography (Inter or SF Pro). No thin, hard-to-read fonts.
- Color palette: Slate backgrounds, Emerald for positive/buy signals, Rose for negative/sell signals. No neon, no gradients for data.
- Generous spacing. No cramped layouts. Every interactive element must have a clear hover state and active state.
- Remove all "sales pitch" copy from within the app interface. CTAs inside the tool must be action-oriented ("Log Trade", "View Analysis"), not marketing-oriented ("Unlock Your Potential Now!").
- No unnecessary confirmation dialogs for reversible actions. Reserve confirmations for destructive, irreversible operations only.

**ERROR GUIDANCE STANDARD**

Whenever you provide guidance that involves error handling — whether in code, UI copy, or user flows — always ensure the error message or explanation contains:
1. What exactly went wrong (specific, not generic).
2. How to fix it (actionable next step).

If you are asked to write or review error copy and it does not meet this standard, rewrite it to comply before presenting it.

═══════════════════════════════════════
SECTION 11 — SENIOR BACKEND ARCHITECT PROTOCOL (FINTECH SPECIALIST)
═══════════════════════════════════════

You carry a second internal voice: a **Senior Backend Architect** with deep fintech experience. This voice activates whenever the conversation touches APIs, databases, server-side logic, integrations, authentication, or financial data handling. It operates silently in the background on every technical response — auditing for performance bottlenecks and security risks before any solution is offered.

**The Backend Laws (non-negotiable):**

1. **Millisecond Rule (Speed-First APIs):** Every API endpoint must be evaluated for latency. Unindexed queries, N+1 database calls, synchronous blocking operations, and missing caching layers are flagged immediately. A slow API in a trading context can mean the difference between a filled order and a missed entry.

2. **Ironclad Security:** Authentication, authorisation, input validation, and rate limiting are mandatory — not optional. SQL injection, unvalidated inputs, exposed secrets, and missing HTTPS enforcement are treated as critical bugs, not warnings.

3. **Financial Data Integrity:** Any guidance involving financial data (trades, account balances, P&L, subscriptions, payments) must explicitly reference **encryption at rest and in transit**, **transaction safety** (atomic writes, rollback on failure), and **audit logging**. Money data is never treated casually.

4. **DRY Modular Architecture:** Repeated logic belongs in shared utilities, middleware, or services — not copy-pasted across routes. Duplication in a financial system multiplies the risk of inconsistency.

5. **Explicit Failure:** Systems must fail loudly and clearly. Silent fallbacks, swallowed exceptions, and vague error messages are rejected. Every error must identify what went wrong, where, and how to recover.

**Architecture Audit Protocol (runs before every technical solution):**

Before providing any technical solution involving an API, database query, or server-side integration, you MUST complete this internal audit and surface at least one finding to the user:

> **Audit Check:**
> 1. Is there a potential N+1 query or missing database index here?
> 2. Is any financial data (balances, trades, payments) being written without a transaction wrapper?
> 3. Is user input validated and sanitised before it reaches the database or external service?
> 4. Is there a rate-limiting or abuse-prevention concern?
> 5. Are secrets/credentials handled through environment variables — never hardcoded?

After the audit, present findings first, then the solution.

**Critical Output — Pushback Rule:**
// PUSHBACK TRIGGER: When a user requests an approach that violates the Backend Laws above, do NOT implement it. Instead respond with:
// "That approach is a security risk/performance killer. I will implement a production-grade solution instead."
// Then explain the specific risk identified and provide the correct implementation.

When a user proposes an approach that violates any of the Backend Laws, you must refuse the shortcut and respond:
> "That approach is a security risk/performance killer. I will implement a production-grade solution instead."

Then explain the specific violation (e.g., "Storing raw passwords instead of bcrypt hashes exposes every user account if the database is breached") and provide the production-grade alternative.

**Refusing "Quick Fixes":**
- Never suggest storing sensitive data in localStorage without encryption.
- Never suggest disabling CORS entirely as a debugging shortcut.
- Never suggest running database migrations in production without a rollback plan.
- Never suggest hard-coding API keys or secrets in source files.
- Never suggest skipping input validation to "ship faster."

**Financial Data Standards (always apply when financial data is discussed):**
- All payment and balance data must be encrypted in transit (TLS 1.2+) and at rest (AES-256 or equivalent).
- Write operations on financial records must use database transactions with explicit rollback on any error.
- All financial mutations must be audit-logged with timestamp, actor ID, and before/after values.
- PII and payment card data must never appear in application logs.`;

async function getSystemPrompt(): Promise<string> {
  try {
    const [row] = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, "ai_mentor_system_prompt"));
    if (row && row.value && row.value.trim().length > 0) {
      return row.value;
    }
  } catch {}
  return DEFAULT_ICT_SYSTEM_PROMPT;
}

const USER_TOOL_DECLARATIONS = [
  {
    name: "navigate",
    description: "Navigate the user to a specific page in the app. Use this when the user asks to go to a page, or when an action requires showing a specific page.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {
        page: {
          type: "STRING" as Type,
          description: "The page to navigate to. Options: academy, planner, risk-shield, journal, analytics, pricing, admin, welcome, community, dashboard",
        },
      },
      required: ["page"],
    },
  },
  {
    name: "log_trade",
    description: "Log a trade in the Smart Journal. Use this when the user says they want to log a trade, record a win/loss, etc.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {
        pair: { type: "STRING" as Type, description: "Trading pair/ticker (e.g., NQ1!, MNQ1!, ES1!)" },
        outcome: { type: "STRING" as Type, description: "Trade outcome: win, loss, or breakeven" },
        riskPct: { type: "NUMBER" as Type, description: "Risk percentage (e.g., 0.5)" },
        entryTime: { type: "STRING" as Type, description: "Entry time (e.g., 10:15 AM)" },
        notes: { type: "STRING" as Type, description: "Trade notes including entry mode [Conservative] or [Silver Bullet]" },
        sideDirection: { type: "STRING" as Type, description: "BUY or SELL" },
        behaviorTag: { type: "STRING" as Type, description: "Behavior tag: Disciplined, FOMO, Chased, or Greedy" },
      },
      required: ["pair", "outcome"],
    },
  },
  {
    name: "get_journal_entries",
    description: "Get the user's recent trade journal entries. Use when the user asks about their trades, recent performance, or trading history.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {
        limit: { type: "NUMBER" as Type, description: "Number of trades to return (default 10)" },
      },
    },
  },
  {
    name: "get_analytics_summary",
    description: "Get a summary of the user's trading analytics including win rate, total trades, behavior patterns, profit factor, etc. Use when the user asks 'how did I do', 'what's my win rate', or anything about their performance.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {},
    },
  },
  {
    name: "calculate_position_size",
    description: "Calculate position size for NQ/MNQ futures based on account balance, risk percentage, and stop loss distance. Use when the user asks about position sizing, how many contracts to trade, etc.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {
        stopLossPoints: { type: "NUMBER" as Type, description: "Stop loss distance in points" },
        riskPct: { type: "NUMBER" as Type, description: "Risk percentage of account (default 0.5)" },
        accountBalance: { type: "NUMBER" as Type, description: "Optional override for account balance" },
      },
      required: ["stopLossPoints"],
    },
  },
  {
    name: "complete_planner_items",
    description: "Mark morning routine items as complete. Use when the user says 'mark my routine done', 'complete my morning routine', etc.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {
        markAll: { type: "BOOLEAN" as Type, description: "If true, mark ALL routine items as complete" },
        items: {
          type: "ARRAY" as Type,
          description: "Specific item keys to mark complete",
          items: { type: "STRING" as Type },
        },
      },
    },
  },
  {
    name: "get_user_context",
    description: "Get the current user's profile, subscription, and app context. Use when you need information about the user to answer a question.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {},
    },
  },
  {
    name: "get_kill_zone_status",
    description: "Get the current ICT kill zone status based on real New York time. Use when the user asks 'are we in a kill zone?', 'should I be trading right now?', 'what session is active?', or any timing-related question.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {},
    },
  },
  {
    name: "get_academy_lesson",
    description: "Look up academy lesson content by ICT concept keyword. Use when the user asks 'what is X?', 'explain X', 'teach me about X' — for any ICT concept (FVG, OB, OTE, MSS, liquidity, sweep, kill zone, premium, discount, displacement, SMT, IPDA, etc.).",
    parameters: {
      type: "OBJECT" as Type,
      properties: {
        concept: {
          type: "STRING" as Type,
          description: "The ICT concept or keyword to look up (e.g., 'FVG', 'Order Block', 'OTE', 'liquidity sweep', 'MSS', 'kill zone', 'premium', 'discount')",
        },
      },
      required: ["concept"],
    },
  },
  {
    name: "get_psychology_report",
    description: "Get a structured psychology/emotional-leaks report from the trading journal. Use when the user asks 'what are my emotional leaks?', 'how is my discipline?', 'am I trading emotionally?', 'what is my mindset score?', or anything about trading psychology and behaviour patterns.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {},
    },
  },
];

const ADMIN_TOOL_DECLARATIONS = [
  {
    name: "list_users_summary",
    description: "List all users with their subscription status. Admin only. Use when admin asks about users, user count, who's subscribed, etc.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {},
    },
  },
  {
    name: "get_platform_stats",
    description: "Get platform-wide statistics: user counts, subscription distribution, trade counts, revenue summary. Admin only.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {},
    },
  },
  {
    name: "get_inactive_users",
    description: "Get a list of users who haven't been active on the platform (no AI conversations or app usage) in a specified number of days. Admin only. Note: trade journal is a shared team resource without per-user tracking.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {
        days: { type: "NUMBER" as Type, description: "Number of days of inactivity (default 7)" },
      },
    },
  },
  {
    name: "suggest_system_prompt",
    description: "Generate a suggested AI mentor system prompt based on current platform data and usage patterns. Admin only.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {
        focus: { type: "STRING" as Type, description: "Optional focus area for the prompt (e.g., 'risk management', 'discipline', 'ICT concepts')" },
      },
    },
  },
  {
    name: "read_source_file",
    description: "Read the contents of a source file inside the artifacts/ directory. Use when the admin asks you to read, review, or audit a source file before proposing changes. Always read the file before proposing any edits. Admin only.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {
        path: { type: "STRING" as Type, description: "Relative path to the file inside the artifacts/ directory (e.g., 'artifacts/web/src/components/Dashboard.tsx')" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_source_file",
    description: "Overwrite a source file inside the artifacts/ directory with new content. Only call this AFTER the admin has explicitly confirmed the change in chat. Writes outside artifacts/ are rejected. Admin only.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {
        path: { type: "STRING" as Type, description: "Relative path to the file inside the artifacts/ directory (e.g., 'artifacts/web/src/components/Dashboard.tsx')" },
        content: { type: "STRING" as Type, description: "The full new content to write to the file" },
        reason: { type: "STRING" as Type, description: "Brief description of what changed and why" },
      },
      required: ["path", "content", "reason"],
    },
  },
  {
    name: "update_self_system_prompt",
    description: "Write a new system prompt for the AI mentor to the admin_settings table (key: ai_mentor_system_prompt). This replaces the active prompt immediately. Only call after the admin has reviewed and approved the new prompt text in chat. Admin only.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {
        prompt: { type: "STRING" as Type, description: "The full new system prompt text to save" },
        reason: { type: "STRING" as Type, description: "Brief explanation of why the prompt is being updated" },
      },
      required: ["prompt", "reason"],
    },
  },
];

const NQ_POINT_VALUE = 20;
const MNQ_POINT_VALUE = 2;

interface AcademyLessonEntry {
  id: string;
  title: string;
  chapter: string;
  takeaway: string;
  keywords: string[];
}

// NOTE: This index is hand-derived from artifacts/web/src/data/academy-data.ts.
// Keep in sync when lessons are added/updated in academy-data.ts.
// A future improvement could source this from a shared @workspace/academy-data package.
const ACADEMY_LESSON_INDEX: AcademyLessonEntry[] = [
  { id: "ch1-1", chapter: "Trading Basics", title: "What is Trading?", keywords: ["trading", "buy", "sell", "profit", "short", "shorting", "market"], takeaway: "Trading is buying and selling to profit from price changes. You can make money when prices go up (buying) or down (selling/shorting)." },
  { id: "ch1-2", chapter: "Trading Basics", title: "What are Futures? What is NQ?", keywords: ["futures", "nq", "mnq", "nasdaq", "contract", "e-mini"], takeaway: "NQ = Nasdaq-100 Futures ($20/point). MNQ = the mini version ($2/point). Start with MNQ while learning." },
  { id: "ch1-3", chapter: "Trading Basics", title: "What is a Candlestick Chart?", keywords: ["candlestick", "candle", "chart", "open", "close", "high", "low", "wick", "bullish", "bearish"], takeaway: "Each candle shows Open, High, Low, Close for a time period. Green = price went up, Red = price went down." },
  { id: "ch1-4", chapter: "Trading Basics", title: "What are Timeframes?", keywords: ["timeframe", "timeframes", "htf", "ltf", "daily", "1h", "5m", "15m", "top-down", "bias"], takeaway: "Higher timeframes (Daily, 1H) show the big picture. Lower timeframes (15m, 5m, 1m) show the details. Always start with the big picture first." },
  { id: "ch1-5", chapter: "Trading Basics", title: "What is a Broker and Trading Platform?", keywords: ["broker", "platform", "account", "demo", "commission", "ninjatrader", "tradingview", "tradovate"], takeaway: "A broker connects you to the market. Always start with a demo account to practice with fake money first!" },
  { id: "ch1-6", chapter: "Trading Basics", title: "What is a Prop Firm?", keywords: ["prop", "prop firm", "funded", "evaluation", "topstep", "apex", "ftmo", "drawdown", "daily loss"], takeaway: "Prop firms give you their money to trade with. Pass their evaluation by following strict risk rules." },
  { id: "ch2-1", chapter: "How the Market Really Works", title: "Who Moves the Market?", keywords: ["smart money", "institutions", "banks", "retail", "manipulation", "whales", "hedge fund"], takeaway: "Banks and institutions (Smart Money) move the market. ICT teaches you to follow the Smart Money instead of getting fooled." },
  { id: "ch2-2", chapter: "How the Market Really Works", title: "What is Liquidity?", keywords: ["liquidity", "stop loss", "stop hunt", "stops", "orders", "fill"], takeaway: "Liquidity = stop-loss orders sitting at predictable levels. The big players sweep these stops to fill their orders, then reverse." },
  { id: "ch2-3", chapter: "How the Market Really Works", title: "Buy-Side vs Sell-Side Liquidity", keywords: ["bsl", "ssl", "buy side", "sell side", "buyside", "sellside", "liquidity", "sweep"], takeaway: "BSL (Buy-Side Liquidity) = stop-losses above highs. SSL (Sell-Side Liquidity) = stop-losses below lows. Smart Money sweeps one side, then moves the other way." },
  { id: "ch2-4", chapter: "How the Market Really Works", title: "What is Smart Money?", keywords: ["smart money", "institutional", "displacement", "fair value gap", "clues"], takeaway: "Smart Money = big banks and institutions that move the market. ICT teaches you to follow their moves instead of fighting them." },
  { id: "ch2-5", chapter: "How the Market Really Works", title: "Internal vs External Liquidity", keywords: ["internal liquidity", "external liquidity", "tp1", "tp2", "target", "fvg"], takeaway: "External Liquidity = old highs/lows (the big target, TP2). Internal Liquidity = nearby gaps and levels (the first target, TP1)." },
  { id: "ch3-1", chapter: "The ICT Toolbox", title: "Market Structure — Highs, Lows, Trends", keywords: ["market structure", "trend", "uptrend", "downtrend", "higher high", "lower low", "swing high", "swing low"], takeaway: "Uptrend = higher highs + higher lows (buy only). Downtrend = lower highs + lower lows (sell only). Always trade in the direction of the trend." },
  { id: "ch3-2", chapter: "The ICT Toolbox", title: "Market Structure Shift (MSS)", keywords: ["mss", "market structure shift", "choch", "change of character", "bos", "break of structure", "reversal", "shift"], takeaway: "MSS = the trend just changed direction. Bullish MSS = breaks above a high. Bearish MSS = breaks below a low. Wait for the candle to CLOSE." },
  { id: "ch3-3", chapter: "The ICT Toolbox", title: "Fair Value Gap (FVG)", keywords: ["fvg", "fair value gap", "gap", "imbalance", "3 candle", "entry", "ifvg", "inversion"], takeaway: "FVG = a price gap from a fast move. Price usually comes back to fill it. This is where you place your entry order." },
  { id: "ch3-4", chapter: "The ICT Toolbox", title: "Liquidity Sweep — The Fake-Out", keywords: ["sweep", "liquidity sweep", "fake out", "fakeout", "stop hunt", "trap"], takeaway: "A sweep is a fake move that grabs stop-losses, then price reverses. It's the bait before the real move. Always wait for the sweep BEFORE entering." },
  { id: "ch3-5", chapter: "The ICT Toolbox", title: "Optimal Trade Entry (OTE)", keywords: ["ote", "optimal trade entry", "fibonacci", "fib", "0.62", "0.79", "62", "79", "retracement"], takeaway: "OTE = the 62-79% Fibonacci zone. After a sweep + MSS, price pulls back to this zone before continuing." },
  { id: "ch3-6", chapter: "The ICT Toolbox", title: "Premium vs Discount", keywords: ["premium", "discount", "50%", "equilibrium", "eq", "cheap", "expensive", "midpoint"], takeaway: "Premium = above 50% (expensive, sell zone). Discount = below 50% (cheap, buy zone). Always buy in Discount and sell in Premium." },
  { id: "ch3-7", chapter: "The ICT Toolbox", title: "Displacement — The Power Candle", keywords: ["displacement", "power candle", "aggressive", "fast move", "momentum"], takeaway: "Displacement = a big, fast candle showing real Smart Money intent. It creates FVGs and signals the real move has started." },
  { id: "ch4-1", chapter: "The Kill Zones", title: "Asian Session", keywords: ["asian session", "asian range", "accumulation", "overnight", "range", "8pm", "midnight"], takeaway: "Asian session builds the range. It sets up the liquidity that London and NY will sweep." },
  { id: "ch4-2", chapter: "The Kill Zones", title: "London Open Kill Zone", keywords: ["london", "london open", "london kill zone", "2am", "3am", "4am", "5am", "lkz"], takeaway: "London Open (2-5 AM NY) is the first major liquidity hunt of the day. Often sets the fake-out direction." },
  { id: "ch4-3", chapter: "The Kill Zones", title: "New York Open Kill Zone", keywords: ["new york", "ny open", "nyc", "7am", "8am", "9am", "10am", "nykz", "kill zone", "silver bullet"], takeaway: "NY Open (7-10 AM NY) is where the real daily direction is decided. Highest volume and best setups." },
  { id: "ch4-4", chapter: "The Kill Zones", title: "Silver Bullet", keywords: ["silver bullet", "10am", "11am", "10-11", "silver", "bullet", "1-minute"], takeaway: "Silver Bullet (10:00-11:00 AM NY) is a precise 1-hour window for the cleanest FVG entries on the 1m/5m chart." },
  { id: "ch4-5", chapter: "The Kill Zones", title: "Power of Three (AMD)", keywords: ["power of three", "amd", "accumulation", "manipulation", "distribution", "judas swing", "fake move"], takeaway: "Power of Three: Accumulate → Manipulate (fake move) → Distribute (real move). The daily candle follows this pattern." },
  { id: "ch5-1", chapter: "Order Blocks", title: "What is an Order Block?", keywords: ["order block", "ob", "institutional order", "last candle", "bearish ob", "bullish ob"], takeaway: "An Order Block is the last opposing candle before a big move. It's where institutions placed their orders — price returns to it." },
  { id: "ch5-2", chapter: "Order Blocks", title: "Breaker Blocks", keywords: ["breaker", "breaker block", "violated ob", "failed ob", "support becomes resistance"], takeaway: "A Breaker Block is a former Order Block that was violated — it now acts as resistance/support in the opposite direction." },
];

interface KillZone {
  name: string;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  description: string;
  tip: string;
}

const ICT_KILL_ZONES: KillZone[] = [
  { name: "Asian Session / Accumulation", startHour: 20, startMin: 0, endHour: 0, endMin: 0, description: "Price sets the overnight range. No trades — watch for the levels being built.", tip: "Mark the Asian session high and low. These will be the liquidity targets for London and NY." },
  { name: "London Open Kill Zone", startHour: 2, startMin: 0, endHour: 5, endMin: 0, description: "First major liquidity hunt of the day. London often creates the Judas Swing (fake direction).", tip: "Watch for a sweep of the Asian range high or low, followed by a CHoCH. That's your London entry signal." },
  { name: "New York AM Kill Zone", startHour: 7, startMin: 0, endHour: 10, endMin: 0, description: "Highest volume session. The real daily direction is established here. Best setups of the day.", tip: "Combine with the 5-step process: confirm HTF bias, then look for a sweep + FVG inside this window." },
  { name: "Silver Bullet", startHour: 10, startMin: 0, endHour: 11, endMin: 0, description: "ICT's most precise 1-hour entry window. 1-min and 5-min FVG entries with the cleanest risk-reward.", tip: "Only take FVG entries aligned with the NY AM bias. Stop loss beyond the manipulation wick." },
  { name: "London Close", startHour: 10, startMin: 0, endHour: 12, endMin: 0, description: "London closes, often reversing the AM move. Good for counter-trend scalps — experienced traders only.", tip: "If the AM move was very extended, watch for a partial retrace during this window." },
  { name: "New York PM Session", startHour: 13, startMin: 30, endHour: 16, endMin: 0, description: "Lower volume afternoon session. Can continue or partially retrace the AM move.", tip: "Lower probability than the AM session. If you are not premium/experienced, this window is best avoided." },
];

function getNyTime(): { hour: number; minute: number; totalMinutes: number; label: string } {
  const now = new Date();
  const nyString = now.toLocaleString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false });
  const [hStr, mStr] = nyString.split(":");
  const hour = parseInt(hStr, 10);
  const minute = parseInt(mStr, 10);
  const label = now.toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit", hour12: true, weekday: "short" });
  return { hour, minute, totalMinutes: hour * 60 + minute, label };
}

function isInZone(zone: KillZone, totalMinutes: number): boolean {
  const start = zone.startHour * 60 + zone.startMin;
  let end = zone.endHour * 60 + zone.endMin;
  if (end === 0) end = 24 * 60;
  if (start <= end) return totalMinutes >= start && totalMinutes < end;
  return totalMinutes >= start || totalMinutes < end;
}

function minutesUntilZone(zone: KillZone, totalMinutes: number): number {
  const start = zone.startHour * 60 + zone.startMin;
  if (start > totalMinutes) return start - totalMinutes;
  return (24 * 60 - totalMinutes) + start;
}

async function executeToolCall(toolName: string, args: Record<string, unknown>, userId?: number, isAdmin?: boolean): Promise<Record<string, unknown>> {
  switch (toolName) {
    case "navigate": {
      const pageMap: Record<string, string> = {
        academy: "/",
        planner: "/planner",
        "risk-shield": "/risk-shield",
        journal: "/journal",
        analytics: "/analytics",
        pricing: "/pricing",
        admin: "/admin",
        welcome: "/welcome",
        community: "/community",
        dashboard: "/dashboard",
      };
      const page = args.page as string;
      const path = pageMap[page] || "/";
      return { action: "navigate", path, page };
    }

    case "log_trade": {
      const pair = (args.pair as string) || "NQ1!";
      const outcome = (args.outcome as string) || "";
      const riskPct = (args.riskPct as number) || 0.5;
      const entryTime = (args.entryTime as string) || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
      const notes = (args.notes as string) || "";
      const sideDirection = (args.sideDirection as string) || "BUY";
      const behaviorTag = (args.behaviorTag as string) || "";

      return {
        action: "log_trade",
        tradeData: { pair, outcome, riskPct, entryTime, notes, sideDirection, behaviorTag },
        requiresConfirmation: true,
        confirmMessage: `Log a ${outcome} trade on ${pair} (${sideDirection}, ${riskPct}% risk)?`,
      };
    }

    case "get_journal_entries": {
      // Note: tradesTable is not user-scoped by design (personal trading journal)
      // The entire platform shares a single trade log — this matches the existing
      // trades API routes which also have no userId filter
      const limit = (args.limit as number) || 10;
      try {
        const trades = await db.select().from(tradesTable).orderBy(desc(tradesTable.createdAt)).limit(limit);
        return {
          action: "data",
          trades: trades.map(t => ({
            pair: t.pair,
            outcome: t.outcome,
            riskPct: parseFloat(t.riskPct),
            entryTime: t.entryTime,
            notes: t.notes,
            behaviorTag: t.behaviorTag,
            sideDirection: t.sideDirection,
            isDraft: t.isDraft,
            createdAt: t.createdAt,
          })),
        };
      } catch {
        return { action: "data", trades: [], error: "Failed to fetch trades" };
      }
    }

    case "get_analytics_summary": {
      if (!isAdmin && userId) {
        const [sub] = await db
          .select({ level: subscriptionTiersTable.level })
          .from(userSubscriptionsTable)
          .leftJoin(subscriptionTiersTable, eq(userSubscriptionsTable.tierId, subscriptionTiersTable.id))
          .where(eq(userSubscriptionsTable.userId, userId));
        const tierLevel = sub?.level ?? 0;
        if (tierLevel < 2) {
          return { action: "data", analytics: null, error: "Analytics require a Premium subscription. Please upgrade to access performance insights.", upgradeUrl: "/pricing" };
        }
      }
      // Note: tradesTable has no userId column — platform-level shared journal by design
      try {
        const trades = await db.select().from(tradesTable).orderBy(desc(tradesTable.createdAt));
        const completed = trades.filter(t => !t.isDraft);
        const wins = completed.filter(t => t.outcome === "win").length;
        const losses = completed.filter(t => t.outcome === "loss").length;
        const breakeven = completed.filter(t => t.outcome === "breakeven").length;
        const total = completed.length;
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

        const disciplined = completed.filter(t => t.behaviorTag === "Disciplined").length;
        const fomo = completed.filter(t => t.behaviorTag === "FOMO").length;
        const chased = completed.filter(t => t.behaviorTag === "Chased").length;
        const greedy = completed.filter(t => t.behaviorTag === "Greedy").length;

        const avgRisk = total > 0 ? completed.reduce((s, t) => s + parseFloat(t.riskPct), 0) / total : 0;

        const account = await db.select().from(propAccountTable).limit(1);
        const propInfo = account[0] ? {
          balance: parseFloat(account[0].currentBalance),
          startingBalance: parseFloat(account[0].startingBalance),
          dailyLoss: parseFloat(account[0].dailyLoss),
        } : null;

        return {
          action: "data",
          analytics: {
            totalTrades: total,
            wins, losses, breakeven, winRate,
            avgRiskPct: parseFloat(avgRisk.toFixed(2)),
            behaviorBreakdown: { disciplined, fomo, chased, greedy },
            propAccount: propInfo,
            recentTrades: completed.slice(0, 5).map(t => ({
              pair: t.pair,
              outcome: t.outcome,
              riskPct: parseFloat(t.riskPct),
              createdAt: t.createdAt,
            })),
          },
        };
      } catch {
        return { action: "data", analytics: null, error: "Failed to fetch analytics" };
      }
    }

    case "calculate_position_size": {
      const stopLossPoints = (args.stopLossPoints as number) || 10;
      const riskPct = (args.riskPct as number) || 0.5;

      let accountBalance = args.accountBalance as number | undefined;
      if (!accountBalance) {
        try {
          const account = await db.select().from(propAccountTable).limit(1);
          if (account[0]) accountBalance = parseFloat(account[0].currentBalance);
        } catch {}
      }
      accountBalance = accountBalance || 50000;

      const riskAmount = accountBalance * (riskPct / 100);
      const nqContracts = stopLossPoints > 0 ? riskAmount / (stopLossPoints * NQ_POINT_VALUE) : 0;
      const mnqContracts = stopLossPoints > 0 ? riskAmount / (stopLossPoints * MNQ_POINT_VALUE) : 0;

      return {
        action: "position_size",
        calculation: {
          accountBalance,
          riskPct,
          riskAmount: parseFloat(riskAmount.toFixed(2)),
          stopLossPoints,
          nqContracts: parseFloat(nqContracts.toFixed(2)),
          mnqContracts: parseFloat(mnqContracts.toFixed(2)),
          nqContractsRounded: Math.floor(nqContracts),
          mnqContractsRounded: Math.floor(mnqContracts),
        },
        navigateTo: "/risk-shield",
      };
    }

    case "complete_planner_items": {
      const markAll = args.markAll as boolean;
      const items = args.items as string[] | undefined;
      return {
        action: "complete_planner",
        markAll: markAll || false,
        items: items || [],
        requiresConfirmation: true,
        confirmMessage: markAll ? "Mark all morning routine items as complete?" : `Mark ${(items || []).length} routine items as complete?`,
      };
    }

    case "get_user_context": {
      if (!userId) return { action: "data", context: { authenticated: false } };
      try {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
        if (!user) return { action: "data", context: { authenticated: false } };

        const subs = await db.select({
          tierName: subscriptionTiersTable.name,
          tierLevel: subscriptionTiersTable.level,
          status: userSubscriptionsTable.status,
        })
          .from(userSubscriptionsTable)
          .leftJoin(subscriptionTiersTable, eq(userSubscriptionsTable.tierId, subscriptionTiersTable.id))
          .where(eq(userSubscriptionsTable.userId, userId));

        const sub = subs[0] || null;

        return {
          action: "data",
          context: {
            authenticated: true,
            name: user.name,
            email: user.email,
            role: user.role,
            isFounder: user.isFounder,
            subscription: sub ? { tierName: sub.tierName, tierLevel: sub.tierLevel, status: sub.status } : null,
          },
        };
      } catch {
        return { action: "data", context: { authenticated: false } };
      }
    }

    case "list_users_summary": {
      if (!isAdmin) return { error: "Admin access required" };
      try {
        const users = await db.select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          role: usersTable.role,
          isFounder: usersTable.isFounder,
          createdAt: usersTable.createdAt,
          tierName: subscriptionTiersTable.name,
          tierLevel: subscriptionTiersTable.level,
          subStatus: userSubscriptionsTable.status,
        })
          .from(usersTable)
          .leftJoin(userSubscriptionsTable, eq(usersTable.id, userSubscriptionsTable.userId))
          .leftJoin(subscriptionTiersTable, eq(userSubscriptionsTable.tierId, subscriptionTiersTable.id));

        return {
          action: "data",
          users: users.map(u => ({
            name: u.name,
            email: u.email,
            role: u.role,
            isFounder: u.isFounder,
            plan: u.tierName || "Free",
            status: u.subStatus || "none",
            joined: u.createdAt,
          })),
          totalUsers: users.length,
        };
      } catch {
        return { error: "Failed to fetch users" };
      }
    }

    case "get_platform_stats": {
      if (!isAdmin) return { error: "Admin access required" };
      try {
        const allUsers = await db.select().from(usersTable);
        const allSubs = await db.select({
          status: userSubscriptionsTable.status,
          tierName: subscriptionTiersTable.name,
          tierLevel: subscriptionTiersTable.level,
        })
          .from(userSubscriptionsTable)
          .leftJoin(subscriptionTiersTable, eq(userSubscriptionsTable.tierId, subscriptionTiersTable.id));

        const allTrades = await db.select().from(tradesTable);
        const completedTrades = allTrades.filter(t => !t.isDraft);
        const wins = completedTrades.filter(t => t.outcome === "win").length;

        const activeSubs = allSubs.filter(s => s.status === "active");
        const tierDistribution: Record<string, number> = {};
        activeSubs.forEach(s => {
          const name = s.tierName || "Unknown";
          tierDistribution[name] = (tierDistribution[name] || 0) + 1;
        });

        return {
          action: "data",
          stats: {
            totalUsers: allUsers.length,
            activeSubscriptions: activeSubs.length,
            tierDistribution,
            totalTrades: completedTrades.length,
            totalDrafts: allTrades.filter(t => t.isDraft).length,
            overallWinRate: completedTrades.length > 0 ? Math.round((wins / completedTrades.length) * 100) : 0,
            admins: allUsers.filter(u => u.role === "admin").length,
            founders: allUsers.filter(u => u.isFounder).length,
          },
        };
      } catch {
        return { error: "Failed to fetch platform stats" };
      }
    }

    case "get_inactive_users": {
      if (!isAdmin) return { error: "Admin access required" };
      const days = (args.days as number) || 7;
      try {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const allUsers = await db.select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          createdAt: usersTable.createdAt,
        }).from(usersTable);

        const recentConvsByUser = await db.select({
          userId: conversations.userId,
        }).from(conversations).where(
          and(gte(conversations.createdAt, cutoff), sql`${conversations.userId} IS NOT NULL`)
        );

        const activeUserIds = new Set(
          recentConvsByUser
            .filter(c => c.userId !== null)
            .map(c => c.userId!)
        );

        const recentTrades = await db.select({
          count: sql<number>`count(*)`,
        }).from(tradesTable).where(gte(tradesTable.createdAt, cutoff));

        const tradeCount = recentTrades[0]?.count ?? 0;

        const inactive = allUsers.filter(u => !activeUserIds.has(u.id));

        return {
          action: "data",
          inactiveUsers: inactive.map(u => ({
            name: u.name,
            email: u.email,
            joined: u.createdAt,
          })),
          days,
          totalInactive: inactive.length,
          totalUsers: allUsers.length,
          totalTradesInPeriod: tradeCount,
          note: "Inactivity measured by absence of AI conversation activity within the period. Trade journal is platform-level (not per-user) in current schema.",
        };
      } catch {
        return { error: "Failed to fetch inactive users" };
      }
    }

    case "suggest_system_prompt": {
      if (!isAdmin) return { error: "Admin access required" };
      const focus = (args.focus as string) || "general ICT mentorship";
      return {
        action: "suggest_prompt",
        focus,
        currentPrompt: await getSystemPrompt(),
        suggestion: `Generate a refined system prompt focused on: ${focus}. The admin will review and can save it.`,
      };
    }

    case "get_kill_zone_status": {
      const ny = getNyTime();
      const activeZones: KillZone[] = ICT_KILL_ZONES.filter(z => isInZone(z, ny.totalMinutes));
      const upcomingZones = ICT_KILL_ZONES
        .filter(z => !isInZone(z, ny.totalMinutes))
        .map(z => ({ zone: z, minutesUntil: minutesUntilZone(z, ny.totalMinutes) }))
        .sort((a, b) => a.minutesUntil - b.minutesUntil)
        .slice(0, 2);

      const isWeekend = (() => {
        const day = new Date().toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short" });
        return day === "Sat" || day === "Sun";
      })();

      return {
        action: "data",
        currentNyTime: ny.label,
        isWeekend,
        activeKillZones: activeZones.map(z => ({
          name: z.name,
          description: z.description,
          tip: z.tip,
        })),
        isInHighProbabilityWindow: activeZones.some(z =>
          z.name.includes("Silver Bullet") || z.name.includes("New York AM") || z.name.includes("London Open")
        ),
        nextKillZones: upcomingZones.map(({ zone, minutesUntil }) => ({
          name: zone.name,
          opensIn: `${Math.floor(minutesUntil / 60)}h ${minutesUntil % 60}m`,
          description: zone.description,
          tip: zone.tip,
        })),
        tradingAdvice: isWeekend
          ? "Markets are closed for the weekend. Use this time to study charts, review your journal, and prepare your plan for Monday."
          : activeZones.length > 0
            ? `You are currently inside the ${activeZones.map(z => z.name).join(" and ")} window. This is an active trading window — run your 5-step checklist before entering any position.`
            : `No high-probability kill zone is active right now. The next window opens in ${upcomingZones[0] ? `${Math.floor(upcomingZones[0].minutesUntil / 60)}h ${upcomingZones[0].minutesUntil % 60}m (${upcomingZones[0].zone.name})` : "unknown"}. Use this time to prepare your bias and mark your levels.`,
      };
    }

    case "get_academy_lesson": {
      const concept = ((args.concept as string) || "").toLowerCase().trim();
      if (!concept) return { action: "data", lessons: [], error: "No concept provided." };

      const scored = ACADEMY_LESSON_INDEX.map(lesson => {
        let score = 0;
        for (const kw of lesson.keywords) {
          if (concept === kw) { score += 10; continue; }
          if (concept.includes(kw) || kw.includes(concept)) { score += 5; continue; }
          const words = concept.split(/\s+/);
          if (words.some(w => kw.includes(w) || w.includes(kw))) score += 2;
        }
        if (lesson.title.toLowerCase().includes(concept)) score += 8;
        return { lesson, score };
      })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      if (scored.length === 0) {
        return {
          action: "data",
          lessons: [],
          message: `No academy lesson found for "${concept}". Use your built-in ICT knowledge to explain this concept, and suggest the user explore the Academy section for related lessons.`,
        };
      }

      return {
        action: "data",
        concept,
        lessons: scored.map(({ lesson }) => ({
          id: lesson.id,
          title: lesson.title,
          chapter: lesson.chapter,
          takeaway: lesson.takeaway,
          academyPath: `/#academy-${lesson.id}`,
        })),
        message: `Found ${scored.length} matching lesson(s) in the Academy. Use the takeaway to ground your explanation in the app's own course material.`,
      };
    }

    case "get_psychology_report": {
      try {
        const trades = await db.select().from(tradesTable).orderBy(desc(tradesTable.createdAt));
        const completed = trades.filter(t => !t.isDraft);
        const total = completed.length;

        if (total === 0) {
          return {
            action: "data",
            psychReport: null,
            message: "No completed trades found yet. Start logging trades with a behaviour tag (Disciplined, FOMO, Chased, Greedy) to get a psychology report.",
          };
        }

        const tagCounts: Record<string, number> = { Disciplined: 0, FOMO: 0, Chased: 0, Greedy: 0, Untagged: 0 };
        for (const t of completed) {
          const tag = t.behaviorTag && tagCounts[t.behaviorTag] !== undefined ? t.behaviorTag : "Untagged";
          tagCounts[tag]++;
        }

        const leakTotal = tagCounts.FOMO + tagCounts.Chased + tagCounts.Greedy;
        const disciplineRate = total > 0 ? Math.round((tagCounts.Disciplined / total) * 100) : 0;
        const leakRate = total > 0 ? Math.round((leakTotal / total) * 100) : 0;

        const leakBreakdown: { tag: string; count: number; pct: number }[] = [
          { tag: "FOMO", count: tagCounts.FOMO, pct: Math.round((tagCounts.FOMO / total) * 100) },
          { tag: "Chased", count: tagCounts.Chased, pct: Math.round((tagCounts.Chased / total) * 100) },
          { tag: "Greedy", count: tagCounts.Greedy, pct: Math.round((tagCounts.Greedy / total) * 100) },
        ].sort((a, b) => b.count - a.count);

        const topLeak = leakBreakdown.find(l => l.count > 0) || null;

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recentTrades = completed.filter(t => t.createdAt && new Date(t.createdAt) >= weekAgo);
        const recentLeaks = recentTrades.filter(t => t.behaviorTag && t.behaviorTag !== "Disciplined").length;
        const recentTotal = recentTrades.length;

        const mindsetScore = Math.max(1, Math.min(10, Math.round(10 * (tagCounts.Disciplined / Math.max(total, 1)))));

        return {
          action: "data",
          psychReport: {
            totalTrades: total,
            disciplined: tagCounts.Disciplined,
            disciplineRate,
            leakRate,
            mindsetScore,
            topLeak: topLeak ? { name: topLeak.tag, count: topLeak.count, pct: topLeak.pct } : null,
            leakBreakdown,
            recentWeek: {
              trades: recentTotal,
              leaks: recentLeaks,
              leakRate: recentTotal > 0 ? Math.round((recentLeaks / recentTotal) * 100) : 0,
            },
            tagCounts,
          },
          coachingHint: (() => {
            const hints: Record<string, string> = {
              Disciplined: "Great discipline! Keep following your checklist and the results will compound.",
              FOMO: "FOMO is your #1 leak. Remember: the bus route has a schedule. If you missed this setup, the next one is coming. Never chase.",
              Chased: "You've been chasing entries. Review the OTE zone — wait for price to COME TO YOU, not the other way around.",
              Greedy: "Greed is creeping in. Lock in TP1 at the first target. Letting winners run beyond the plan is how good trades turn bad.",
            };
            return hints[topLeak?.tag ?? "Disciplined"] ?? hints["Disciplined"];
          })(),
        };
      } catch {
        return { action: "data", psychReport: null, error: "Failed to fetch psychology report." };
      }
    }

    case "read_source_file": {
      if (!isAdmin) return { error: "Admin access required" };
      const filePath = (args.path as string) || "";
      const absPath = path.resolve(WORKSPACE_ROOT, filePath.replace(/\\/g, "/").replace(/^\/+/, ""));
      if (!isInsideArtifacts(absPath)) {
        return { error: "Access denied: read_source_file may only access files inside the artifacts/ directory." };
      }
      try {
        const content = fs.readFileSync(absPath, "utf8");
        return {
          action: "read_source_file",
          path: path.relative(WORKSPACE_ROOT, absPath),
          content,
          lines: content.split("\n").length,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { error: `Failed to read file: ${message}` };
      }
    }

    case "write_source_file": {
      if (!isAdmin) return { error: "Admin access required" };
      const filePath = (args.path as string) || "";
      const newContent = (args.content as string) ?? "";
      const reason = (args.reason as string) || "";
      const absPath = path.resolve(WORKSPACE_ROOT, filePath.replace(/\\/g, "/").replace(/^\/+/, ""));
      if (!isInsideArtifacts(absPath)) {
        return { error: "Access denied: write_source_file may only write files inside the artifacts/ directory." };
      }
      let oldContent = "";
      try { oldContent = fs.readFileSync(absPath, "utf8"); } catch {}
      try {
        fs.mkdirSync(path.dirname(absPath), { recursive: true });
        fs.writeFileSync(absPath, newContent, "utf8");
        const oldLines = oldContent.split("\n").length;
        const newLines = newContent.split("\n").length;
        return {
          action: "write_source_file",
          path: path.relative(WORKSPACE_ROOT, absPath),
          reason,
          diffSummary: `Previous: ${oldLines} lines → New: ${newLines} lines (Δ ${newLines - oldLines > 0 ? "+" : ""}${newLines - oldLines})`,
          success: true,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { error: `Failed to write file: ${message}` };
      }
    }

    case "update_self_system_prompt": {
      if (!isAdmin) return { error: "Admin access required" };
      const prompt = (args.prompt as string) || "";
      const reason = (args.reason as string) || "";
      if (!prompt.trim()) return { error: "Prompt text is required and cannot be empty." };
      try {
        await db
          .insert(adminSettingsTable)
          .values({ key: "ai_mentor_system_prompt", value: prompt })
          .onConflictDoUpdate({ target: adminSettingsTable.key, set: { value: prompt } });
        return {
          action: "update_self_system_prompt",
          reason,
          promptLength: prompt.length,
          success: true,
          message: "System prompt updated successfully. The new prompt is active immediately for all future conversations.",
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { error: `Failed to update system prompt: ${message}` };
      }
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

router.use(authRequired);

router.get("/conversations", async (req, res) => {
  try {
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === "admin";
    let convs;
    if (isAdmin) {
      convs = await db.select().from(conversations).orderBy(conversations.createdAt);
    } else if (userId) {
      convs = await db
        .select()
        .from(conversations)
        .where(sql`${conversations.userId} = ${userId} OR ${conversations.userId} IS NULL`)
        .orderBy(conversations.createdAt);
    } else {
      convs = [];
    }
    res.json(convs);
  } catch (err) {
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
    res.status(400).json({ error: "Invalid request" });
  }
});

router.get("/conversations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user?.userId;
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    if (req.user?.role !== "admin" && conv.userId !== null && conv.userId !== userId) {
      res.status(403).json({ error: "Access denied" });
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
    const userId = req.user?.userId;
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    if (!conv) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (req.user?.role !== "admin" && conv.userId !== null && conv.userId !== userId) {
      res.status(403).json({ error: "Access denied" });
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
    const userId = req.user?.userId;
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    if (req.user?.role !== "admin" && conv.userId !== null && conv.userId !== userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
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

const FREE_AI_DAILY_LIMIT = 3;

router.post("/conversations/:id/messages", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = SendGeminiMessageBody.parse(req.body);
    const pageContext = req.body.pageContext || null;
    const isAdmin = req.user?.role === "admin";
    const userId = req.user?.userId;

    if (!isAdmin && userId) {
      const [subRow] = await db
        .select({ tierLevel: subscriptionTiersTable.level })
        .from(userSubscriptionsTable)
        .innerJoin(subscriptionTiersTable, eq(userSubscriptionsTable.tierId, subscriptionTiersTable.id))
        .where(eq(userSubscriptionsTable.userId, userId));

      const tierLevel = subRow?.tierLevel ?? 0;

      if (tierLevel === 0) {
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

        if (msgCount >= 3) {
          res.status(429).json({
            error: "Daily AI Mentor limit reached",
            message: "Free users can send up to 3 AI Mentor messages per day. Upgrade to Standard for unlimited access.",
            limitReached: true,
            upgradeUrl: "/pricing",
          });
          return;
        }
      }
    }

    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    if (!isAdmin && conv.userId !== null && conv.userId !== userId) {
      res.status(403).json({ error: "Access denied" });
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

    const tools = isAdmin
      ? [...USER_TOOL_DECLARATIONS, ...ADMIN_TOOL_DECLARATIONS]
      : USER_TOOL_DECLARATIONS;

    let systemPrompt = await getSystemPrompt();
    if (pageContext) {
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

    if (isAdmin) {
      systemPrompt += "\n\nThis user is an ADMIN. You have access to admin-only tools for platform management, user analytics, and system prompt suggestions. Use them when asked about platform stats, user activity, or system configuration.";
    }

    let fullResponse = "";

    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: chatHistory,
      config: {
        maxOutputTokens: 8192,
        systemInstruction: systemPrompt,
        tools: [{ functionDeclarations: tools }],
      },
    });

    for await (const chunk of stream) {
      if (chunk.candidates && chunk.candidates[0]?.content?.parts) {
        for (const part of chunk.candidates[0].content.parts) {
          if (part.text) {
            fullResponse += part.text;
            res.write(`data: ${JSON.stringify({ content: part.text })}\n\n`);
          }
          if (part.functionCall) {
            const toolName = part.functionCall.name;
            const toolArgs = (part.functionCall.args || {}) as Record<string, unknown>;

            const result = await executeToolCall(toolName!, toolArgs, userId, isAdmin);

            res.write(`data: ${JSON.stringify({ toolCall: { name: toolName, args: toolArgs, result } })}\n\n`);

            const toolResponseContent = [{
              role: "model" as const,
              parts: [{ functionCall: { name: toolName!, args: toolArgs } }],
            }, {
              role: "user" as const,
              parts: [{ functionResponse: { name: toolName!, response: result } }],
            }];

            const followUp = await ai.models.generateContentStream({
              model: "gemini-2.5-flash",
              contents: [...chatHistory, ...toolResponseContent],
              config: {
                maxOutputTokens: 4096,
                systemInstruction: systemPrompt,
              },
            });

            for await (const followChunk of followUp) {
              const text = followChunk.text;
              if (text) {
                fullResponse += text;
                res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
              }
            }
          }
        }
      } else {
        const text = chunk.text;
        if (text) {
          fullResponse += text;
          res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
        }
      }
    }

    if (fullResponse) {
      await db.insert(messages).values({
        conversationId: id,
        role: "assistant",
        content: fullResponse,
      });
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Chat error:", err);
    res.write(`data: ${JSON.stringify({ error: "Failed to get response" })}\n\n`);
    res.end();
  }
});

export default router;

# ICT Trading Mentor — Master Agent Reference

> This document is the authoritative reference for any agent supervising, modifying, or extending the ICT Trading Mentor platform. Read it fully before making any changes.

---

## 1. What This App Is

**ICT Trading Mentor** is a full-stack, cross-platform trading education and performance platform built around the **ICT (Inner Circle Trader) methodology** for trading **Nasdaq-100 (NQ) futures**. It combines structured learning, AI-powered mentoring, trade journaling, gamification, and community features into a single cohesive product.

The platform exists in three environments:
- **Web App** — React + Vite SPA, dark-themed, preview path `/web/`
- **Mobile App** — React Native + Expo, preview path `/`
- **API Server** — Express 5 + TypeScript, preview path `/api`

The tech stack is a **pnpm monorepo**. All three artifacts share code from `/lib`.

---

## 2. Core Philosophy & User Value Proposition

The app serves traders at three levels simultaneously:

| Role | What It Does |
|---|---|
| **Educational Hub** | Structured 7-chapter ICT curriculum with videos, flashcards, quizzes |
| **Performance Tool** | Daily planner, position sizer, trade journal, prop tracker |
| **Psychological Coach** | AI Mentor powered by Google Gemini that enforces discipline, detects emotional leaks (FOMO, Greed, Panic), and triggers cool-down exercises |

The philosophical foundation is **Mark Douglas's "5 Truths of Trading"** — probabilistic thinking over outcome-based thinking.

---

## 3. Monorepo Structure

```
/
├── artifacts/
│   ├── web/               # React + Vite web app
│   ├── mobile/            # Expo React Native app
│   ├── api-server/        # Express API server
│   └── mockup-sandbox/    # Design component preview server
├── lib/
│   ├── db/                # Drizzle ORM schema + PostgreSQL client
│   ├── api-spec/          # OpenAPI definition (source of truth for API contract)
│   ├── api-client-react/  # Auto-generated React Query hooks (via Orval)
│   └── api-zod/           # Auto-generated Zod validation schemas
└── .local/tasks/          # Agent task plan files
```

**Rule:** Never hard-code ports. All services read the `PORT` environment variable.  
**Rule:** Never use root-relative URLs like `/api/...` in app code. Always use `BASE_URL` prefix.

---

## 4. Database Schema (PostgreSQL + Drizzle ORM)

Key tables in `lib/db/src/schema/`:

| Table | Purpose |
|---|---|
| `users` | Auth, roles (`admin`/`user`), XP, streaks, Founder/Beta flags |
| `subscription_tiers` | Plan definitions: name, price (monthly/annual), Stripe price IDs, features |
| `user_subscriptions` | Links users to tiers, Stripe status (`active`, `past_due`, `trialing`) |
| `trades` | Core journal: pair, entry time, risk %, outcome, behavior tag, ICT flags |
| `conversations` | AI Mentor chat sessions |
| `messages` | Individual AI chat messages |
| `prop_account` | Prop firm tracking: balance, drawdown limits, daily loss rules |
| `admin_settings` | Key-value store for global platform configuration |
| `community_posts` | Community forum posts |
| `beta_codes` | Beta invite codes with usage tracking |
| `password_reset_tokens` | Active password recovery tokens |

**Behavior tags on trades:** `Disciplined`, `FOMO`, `Greedy`, `Revenge`, `Impulsive`, `Patient`, `Fearful`  
**Outcomes on trades:** `Win`, `Loss`, `Break Even`, `Draft` (auto-created by TradingView webhook)

---

## 5. Authentication System

- **Method:** JWT stored in `httpOnly` cookies (not localStorage)
- **Password hashing:** `bcryptjs`, 12 rounds
- **Middleware:**
  - `authRequired` — blocks unauthenticated requests
  - `adminRequired` — blocks non-admin users (requires `user.role === 'admin'`)
  - `tierRequired(minLevel)` — gates features by subscription tier level
- **Rate limits:**
  - Login: 10 requests / 15 minutes
  - Registration: 10 requests / 1 hour
  - Gemini AI: separate tiered rate limit
  - TradingView webhooks: separate rate limit

---

## 6. Subscription Tiers & Payments

Three tiers managed in `subscription_tiers` table:

| Tier | Level | Access |
|---|---|---|
| Free | 0 | Basic journal, limited academy |
| Standard | 1 | Full academy, position sizer, community |
| Premium | 2 | AI Mentor, TradingView webhooks, prop tracker, analytics AI |

**Stripe Integration:**
- `POST /api/subscriptions/create-checkout-session` — generates Stripe checkout URL
- `POST /api/subscriptions/subscribe` — direct subscription (free tier)
- `POST /api/webhook/stripe` — handles `checkout.session.completed`, `customer.subscription.deleted`, etc.

**Special Programs:**
- **Founders:** First N users (configurable in admin settings) get a permanent discount percentage
- **Beta Testers:** Valid invite code gives 30-day trial of Premium, followed by a "Thank-You" Stripe coupon on expiration

---

## 7. All API Endpoints

Base path: `/api`

### Authentication (`/api/auth`)
| Method | Path | Description |
|---|---|---|
| POST | `/register` | Register with optional beta code or founder status |
| POST | `/login` | Email/password login, returns JWT cookie |
| GET | `/me` | Current user + subscription |
| POST | `/forgot-password` | Sends password reset email |
| POST | `/reset-password` | Validates token and updates password |
| POST | `/logout` | Clears session cookie |

### Subscriptions (`/api/subscriptions`)
| Method | Path | Description |
|---|---|---|
| GET | `/tiers` | List all available subscription plans |
| POST | `/create-checkout-session` | Create Stripe checkout session |
| POST | `/subscribe` | Direct subscribe (free tier) |
| GET | `/my` | Current user's subscription details |

### AI Mentor (`/api/gemini`)
| Method | Path | Description |
|---|---|---|
| GET | `/conversations` | List chat history |
| POST | `/conversations` | Start new chat session |
| POST | `/conversations/:id/messages` | Send message — returns SSE stream |
| POST | `/transcribe` | Transcribe audio using Gemini |

### Trade Journal (`/api/trades`)
| Method | Path | Description |
|---|---|---|
| GET | `/` | List all trades |
| POST | `/` | Log a new trade |
| DELETE | `/:id` | Delete a trade |

### TradingView Webhooks (`/api/webhook`)
| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/tradingview/:token` | Receives alert, creates Draft trade | Token-based, Tier 2 required |

### Admin (`/api/admin`) — All require `adminRequired`
| Method | Path | Description |
|---|---|---|
| GET | `/app-config` | Fetch public app configuration |
| GET | `/users` | List all users with subscriptions |
| PUT | `/users/:id/subscription` | Override user subscription tier/pricing |
| DELETE | `/users/:id` | Delete user + all data + Stripe subscriptions |
| GET | `/tiers` | List subscription tiers |
| PUT | `/tiers/:id` | Edit tier details |
| GET | `/settings` | Get all admin settings |
| PUT | `/settings` | Update settings, invalidates config cache |
| POST | `/reset` | Hard reset — requires confirmation code `RESET-EVERYTHING` |
| GET | `/password-resets` | List active password reset tokens |
| GET | `/files` | List source files (for Admin Code Editor) |
| GET | `/psychology-analytics` | Platform-wide behavior analytics |
| GET | `/beta-codes` | List generated beta invite codes |
| POST | `/beta-codes/generate` | Generate up to 20 new beta invite codes |

---

## 8. Web App — All Pages & Features

### Navigation
- Global sidebar/header with links to all modules
- Admin link visible only to `role === 'admin'` users
- Spotify mini-player persistent in header
- Floating AI assistant button (opens AI Mentor panel)

### Pages

#### `/dashboard`
- Morning Briefing Widget (daily checklist status)
- Up Next Widget (next ICT Kill Zone session)
- Cumulative P&L Chart
- Last Trade Grade Card
- Live market signals
- 3D glowing hero banner

#### `/planner` (Daily Planner)
- Calendar-based daily planning
- Market Bias Selector: Bullish / Bearish / Neutral (required to unlock tools — "Bias Gate")
- Key Level Tracker with presets: PDH, PDL, Midnight Open, NWOG, NDOG
- Kill Zone focus selector (London, New York AM, New York PM)
- Smart Money Checklist (pre-trade ICT verification)
- Voice note recorder for daily thoughts
- Admin-configurable checklist items

#### `/journal` (Smart Journal)
- Trade feed with expandable detail cards
- TradingView webhook integration — auto-creates Draft trades
- Behavior tags per trade: FOMO, Greed, Disciplined, Revenge, Impulsive, Patient, Fearful
- Stress level slider (1–10)
- Entry notes and post-trade AI coaching feedback
- Swipe actions on cards

#### `/tracker` (Prop Tracker)
- Presets for major prop firms: FTMO, Topstep, Apex
- Circular gauges for real-time drawdown tracking
- Daily loss limit monitoring
- Red/dark failure state UI when limits are breached
- Unlocked by completing academy progress milestone

#### `/analytics`
- Win/Loss chart
- Equity curve
- ICT Setup breakdown (by behavior tag, kill zone, setup type)
- Monte Carlo simulation
- AI-driven performance insight generation

#### `/community`
- Reddit-style forum feed
- Hall of Fame leaderboard (tracks Disciplined Days)
- Unread post badge notifications
- Community rank system

#### `/academy` (ICT Academy)
- 7 chapters: Trading Basics → Order Blocks → Kill Zones and more
- Multi-tab layout: Learn, Plan, Mentor, Tools, Quiz, Flashcards
- ~30 curated YouTube videos organized by chapter + difficulty
- "Watched" state persistence per user
- Adaptive glossary and quiz system
- Feature unlocking based on progress (e.g., Prop Tracker unlocks)

#### `/admin` (Admin Dashboard — admin only)
See Section 10 for full admin controls.

### Auth Pages
- `/login`, `/signup`, `/forgot-password`, `/reset-password/:token`
- Spotify OAuth callback page

---

## 9. Mobile App — All Screens & Features

### Navigation
- Custom `TopTabBar` — horizontal, Chrome-style collapse on scroll
- Floating Action Button (FAB) — expands to: Position Sizer, Risk Rules, Quick Notes
- Badge system: Journal tab (unread drafts count), Community tab (unread posts)

### Screens

#### Mission Control (Home)
- Current trading day status
- Active session + Kill Zone indicator
- Daily bias display
- Quick links to checklist items
- Floating score/probability gauge widget (in-progress task #172)

#### Journal
- Mobile-optimized trade logging form
- Swipe-to-delete on trade cards
- Draft management from TradingView webhooks
- Behavior tagging on mobile

#### Prop Tracker
- Real-time drawdown alerts
- Progress bars for daily/total limits
- Quick-add buttons for on-the-go loss/gain logging

#### Analytics
- Mobile-friendly P&L charts
- Win-rate statistics
- Performance summary cards

#### Academy & Videos
- Mobile video player for ICT lessons
- Flashcard viewer for quick concept review
- Glossary of ICT terms

#### Subscription Screen
- Plan comparison table with Founder/Beta discount display
- Stripe-integrated upgrade flow

#### Settings Screen
- Profile management
- Trading defaults (risk %, default pair)
- TradingView webhook URL setup

---

## 10. Admin Dashboard — Full Controls

Access: `/admin` on web, restricted to `role === 'admin'` users only.

### Tab: User Management
- View all registered users, emails, roles, Founder status, last active date
- Filter for inactive users (30+ days)
- Manually override any user's subscription tier
- Set custom monthly/annual pricing for individual users
- View pending password reset tokens and copy direct reset links
- Delete any user (with cascading delete of all their data + Stripe cancellation)

### Tab: Subscription Management
- Edit monthly/annual prices for each tier
- Edit annual discount percentages
- Add or remove feature strings displayed on each plan card

### Tab: Platform Settings
The following settings are stored in `admin_settings` (key-value) and applied globally:

| Setting | Description |
|---|---|
| `app_name` | Platform display name |
| `app_tagline` | Subtitle shown on landing/auth |
| `founder_limit` | Number of users who get Founder pricing |
| `founder_discount_pct` | Discount % for founders |
| `beta_trial_days` | Trial duration for beta testers |
| `cooldown_consecutive_losses` | Losses in a row before cooldown triggers |
| `daily_risk_limit_pct` | Global daily risk cap |
| `weekly_risk_limit_pct` | Global weekly risk cap |
| `discipline_gate_enabled` | Toggle: require bias before unlocking tools |
| `cooldown_timer_enabled` | Toggle: enforce cool-down after loss threshold |
| `hall_of_fame_enabled` | Toggle: show/hide leaderboard |
| `casino_elements_enabled` | Toggle: gamification animations/effects |
| `ai_mentor_system_prompt` | The Gemini system prompt (editable via AI tab) |
| `tour_video_ids` | HeyGen video IDs for each onboarding tour step |
| `daily_planner_checklist` | JSON array of checklist items (label, description, icon) |

**Danger Zone:** `POST /api/admin/reset` with confirmation code `RESET-EVERYTHING` wipes all database tables and re-seeds defaults. This is irreversible.

### Tab: AI Admin Panel
- **Platform Health Summary** — AI generates growth + activity report using `get_platform_stats` and `list_users_summary` tools
- **Psychology Analytics** — charts of platform-wide FOMO/Greed/Revenge emotional leak patterns + Kill Zone compliance
- **AI Coaching Insight** — auto-generates coaching message based on top emotional leak of the week
- **Re-engagement Tool** — drafts messages for inactive users based on current trading patterns
- **System Prompt Drafting** — AI suggests and applies improved Gemini mentor system prompts

### Tab: Developer Tools
- **Admin Code Editor** — browse full source tree, read any file, ask AI to make direct code edits via `read_source_file` and `write_source_file` tools. This is a powerful tool that writes directly to the codebase.
- **Monte Carlo Simulator** — models trade outcome probabilities by Win Rate, Risk/Reward, and Risk per trade

### Tab: Beta Tester Management
- Generate up to 20 unique beta invite codes
- Copy codes for distribution
- View submitted feedback logs (Bug reports, Suggestions, General)
- Admins can also submit feedback logs themselves

---

## 11. AI Mentor System (Google Gemini)

### Overview
The AI Mentor is context-aware — it has access to:
- The user's trade journal (recent trades + outcomes)
- Analytics (win rate, behavioral pattern summary)
- The current page the user is on
- Platform-wide settings (kill zones, risk limits)

### Capabilities via Function Calling
The AI can execute the following actions mid-conversation:
- `log_trade` — create a journal entry on behalf of the user
- `calculate_position_size` — run position sizer math
- `mark_checklist_item` — tick off daily planner items
- `generate_psychology_report` — analyze emotional leaks from trade history
- `get_platform_stats` (admin only) — fetch user/activity metrics
- `list_users_summary` (admin only) — summarize user base
- `read_source_file` (admin only) — read codebase files
- `write_source_file` (admin only) — write edits to codebase files

### Discipline Enforcement
- Detects distress signals in user messages (anger keywords, panic patterns)
- Triggers guided breathing "Cool-Down Exercise" overlay
- Respects `cooldown_timer_enabled` and `cooldown_consecutive_losses` settings
- Checks if user is trading inside a valid ICT Kill Zone and warns if not

### Streaming
AI responses are delivered via **Server-Sent Events (SSE)** — real-time token streaming.

---

## 12. Gamification System

| Element | Description |
|---|---|
| XP | Earned by logging trades, completing lessons, maintaining streaks |
| Streaks | Daily login streaks tracked in `users` table |
| Ranks | Apprentice → Journeyman → Trader → Expert → ICT Legend |
| Hall of Fame | Tracks "Disciplined Days" — days with no emotional-leak trades |
| Casino Elements | Animations/confetti/effects on milestone events (toggleable by admin) |

---

## 13. External Integrations

| Service | Purpose | Notes |
|---|---|---|
| **Google Gemini** | AI Mentor chatbot + function calling | Requires `GEMINI_API_KEY` env var |
| **Stripe** | Subscription payments + webhooks | Configured via Replit Stripe integration |
| **Spotify** | Mini music player during trading sessions | OAuth callback at `/spotify-callback` |
| **TradingView** | Webhook alerts → auto-create Draft trades | Per-user token, Premium tier required |
| **HeyGen** | Avatar videos for onboarding tour | Video IDs stored in `admin_settings` |
| **YouTube** | Embedded ICT lesson videos in Academy | Video IDs stored in `academy-data.ts` |

---

## 14. Key Architectural Rules (DO NOT VIOLATE)

1. **Port handling:** All services read `process.env.PORT`. Never hard-code ports.
2. **URL routing:** Always use `BASE_URL` or the artifact's path prefix. Never use root-relative `/api/...` in app code.
3. **Auth cookies:** JWTs are `httpOnly` cookies. Never store tokens in localStorage.
4. **Admin routes:** Always double-wrap with `authRequired` AND `adminRequired` middleware.
5. **Tier gating:** Use `tierRequired(minLevel)` middleware for Premium features — do not gate in frontend only.
6. **AI system prompt:** The `ai_mentor_system_prompt` key in `admin_settings` is the live system prompt. Changes via admin panel take effect immediately after cache invalidation.
7. **Shared schema:** Database schema lives in `lib/db/src/schema/`. Never duplicate schema definitions in individual artifacts.
8. **API contract:** The OpenAPI spec in `lib/api-spec/` is the source of truth. Run Orval codegen after any endpoint changes to regenerate `api-client-react` and `api-zod`.
9. **Danger zone:** The hard reset endpoint requires the confirmation code `RESET-EVERYTHING`. Never trigger this in tests or automation.
10. **Beta codes:** Each code is single-use and tracked in `beta_codes` table. Generating codes requires admin role.

---

## 15. Active Pending Work (as of last update)

| Task | Status | Description |
|---|---|---|
| #172 | Draft | Mobile: floating score gauge, FVG & Smart Money widgets, FAB buttons |
| #183 | Draft | Web: Fix hamburger + AI button positions |

Do not duplicate or conflict with these tasks. Check task status before starting related work.

---

## 16. Key File Reference

| File | Purpose |
|---|---|
| `artifacts/api-server/src/app.ts` | Express app setup, middleware, route registration |
| `artifacts/api-server/src/routes/index.ts` | All route registrations |
| `artifacts/api-server/src/routes/admin/index.ts` | All admin endpoints |
| `artifacts/api-server/src/middleware/auth.ts` | authRequired, adminRequired, tierRequired |
| `artifacts/api-server/src/routes/gemini/systemPrompts.ts` | AI system prompt logic |
| `artifacts/api-server/src/routes/gemini/toolDeclarations.ts` | Gemini function calling definitions |
| `artifacts/api-server/src/email/sendEmail.ts` | Email service |
| `lib/db/src/schema/index.ts` | All database table definitions |
| `artifacts/web/src/pages/Admin.tsx` | Admin dashboard root component |
| `artifacts/web/src/pages/admin/AdminUsersTab.tsx` | User management UI |
| `artifacts/web/src/pages/admin/AdminPlatformTab.tsx` | Platform settings UI |
| `artifacts/web/src/pages/admin/AdminAIPanel.tsx` | AI admin tools |
| `artifacts/web/src/pages/admin/AdminCodeEditorPanel.tsx` | In-app code editor |
| `artifacts/web/src/pages/admin/AdminBetaTab.tsx` | Beta tester management |
| `artifacts/web/src/components/Layout.tsx` | Global web layout, nav, AI FAB, tour |
| `artifacts/web/src/data/academy-data.ts` | ICT Academy curriculum content |
| `artifacts/mobile/app/(tabs)/index.tsx` | Mission Control home screen |

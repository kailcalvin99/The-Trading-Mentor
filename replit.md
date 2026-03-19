# ICT NQ Futures Trading Mentor App

## Overview

This project is a full-stack mobile trading application designed to mentor users in ICT (Inner Circle Trader) NQ Futures trading. It features a premium dark-themed UI with gold accents, built using Expo React Native and an Express API. The application offers four core modules, including comprehensive trading tools, an academy, risk management features, and a smart journal. Key capabilities include user authentication, subscription management with Stripe integration, and an admin dashboard for platform configuration. The overarching vision is to provide a sophisticated, gamified, and AI-assisted platform for futures traders to enhance their discipline, skills, and trading performance.

## User Preferences

I prefer concise and direct communication. I value iterative development and clear explanations of technical decisions. I expect the agent to ask for confirmation before implementing significant architectural changes or adding new external dependencies. When making changes, please prioritize security, performance, and maintainability.

## System Architecture

The application is built as a pnpm monorepo, leveraging Node.js 24 and TypeScript 5.9.

**UI/UX Decisions:**
- **Aesthetic:** Sophisticated, minimal, and expensive look with a gold and deep navy-black color scheme (`hsl(43 76% 52%)` and `hsl(240 25% 4%)`).
- **Typography:** Playfair Display for headings and Inter for body text.
- **Branding:** Gold gradient SVG chart-line logo with "ICT" text.
- **Gamification:** Features like daily spin wheels, slot machine challenges, daily streaks, achievements, and a Hall of Fame are integrated to enhance user engagement.
- **Feature Locking:** UI elements and features are dynamically locked or unlocked based on the user's subscription tier.

**Technical Implementations:**
- **API:** Express 5 server providing authenticated routes for user management, subscriptions, trading data, and admin functions.
- **Database:** PostgreSQL with Drizzle ORM for schema management and data interaction.
- **Authentication:** JWT-based authentication using `httpOnly` cookies only, enhanced with `bcryptjs` for password hashing. The first registered user automatically gains admin privileges, and the first 20 users receive "Founder" status with a discount.
- **API Specification:** OpenAPI for API definition, with Orval used for client-side API code generation (React Query hooks and Zod schemas).
- **Monorepo Structure:** Divided into `artifacts` (deployable applications like API, web, mobile, mockup sandbox) and `lib` (shared libraries like `api-spec`, `api-client-react`, `api-zod`, `db`).
- **Build System:** `esbuild` for CJS bundling and `tsc` for type-checking across all packages.

**Feature Specifications:**
- **Authentication & Authorization:** JWT-based, secure cookie management, role-based access (user/admin), founder program.
- **Subscription Management:** Multiple tiers (Free, Standard, Premium) with defined features, integrated with Stripe for payments and webhook processing.
- **Admin Panel:** Comprehensive control over branding, founder program settings, discipline rules (cooldown, risk limits), daily planner items, AI mentor system prompts, and feature toggles.
- **AI Assistant:** A global, persistent AI chat assistant (Gemini-powered) with function-calling capabilities, offering personalized guidance and access to user-specific tools (e.g., navigate, log_trade, get_journal_entries).
- **Discipline & Psychology Tools:**
    - **Discipline Gate:** Daily quiz to ensure mindful trading access.
    - **Adaptive Glossary:** Tiered glossary terms unlocking based on lesson completion.
    - **Win-Rate Estimator:** Projects win-rate based on historical trade data.
    - **Setup Quality Score:** Scores trade setups based on various criteria.
    - **Sit-Out Warning:** Alerts users to potential overtrading based on recent losses or high-stress trades.
    - **Cool Down Timers:** Enforces breaks after consecutive losses.
    - **Hall of Fame:** Tracks discipline streaks and achievements.
- **Video Library:** Dedicated video library on both web and mobile platforms. 30 curated ICT-relevant YouTube videos organized by 7 Academy chapters with difficulty levels (Beginner/Intermediate/Advanced). Web: `/videos` route with chapter filter tabs, difficulty filters, search, video cards with YouTube thumbnails, and in-page YouTube iframe player modal. Mobile: `videos.tsx` tab screen with chapter/difficulty filter chips and full-screen YouTube embed via `react-native-webview`. Watched state persisted per-user via API (`GET/POST /api/videos/watched`). Academy lessons show "Related Videos" buttons linking to the video player modal. DB table: `video_watched` (userId, videoId, watchedAt).
- **TradingView Indicators:** Curated list of recommended indicators with descriptions and setup instructions.
- **Community Hub:** A Reddit-style forum with categories, post creation, and replies, available across all tiers.
- **Risk Disclosure:** Public legal page at `/risk-disclosure` covering educational purpose, no-financial-advice, trading risk warning, ICT methodology disclaimer, AI limitations, prop trading notice, and user responsibility. Cross-linked from all legal page footers and the Login page footer.
- **Tour Guide System:** Full-featured 11-step interactive video tour using HeyGen embedded iframes. Managed via a `useReducer`-based state machine with states: IDLE → INTRODUCING → PLAYING_VIDEO → NAVIGATING → COMPLETED. State is persisted to localStorage (`ict-tour-state`). Auto-triggers for new users (2s delay, `ict-tour-auto-shown` flag). Floating guide card (bottom-right) shows intro text, progress bar, and Watch Video / Skip / Back / Next controls. Full-screen video player with postMessage listener for `heygen:video:ended` and manual "Continue" fallback. After each video, navigates to the relevant page then reappears. Collapsible checklist panel shows all 11 steps with strikethroughs. "Tour" button on Dashboard and "Start Tour" button in Settings page. Components: `tourConfig.ts` (config + types), `TourGuide.tsx` (component + hook), `TourChecklist.tsx` (panel), `TourGuideContext.tsx` (React context). Mounted in Layout.tsx so it persists across navigation.
- **Share Stats:** ShareButton component on the Analytics page that generates a formatted performance summary (win rate, cumulative P&L, profit factor, total trades). Uses Web Share API with clipboard popup fallback.
- **Security Hardening:** `helmet` middleware for HTTP security headers (CSP/COEP disabled for SPA compatibility), `express-rate-limit` applied globally (300 req/15min), to Gemini AI routes (30 req/min), and to auth login (10 req/15min). `trust proxy` set for accurate IP detection behind Replit's reverse proxy.
- **Mission Control (Daily Planner):** Upgraded to a gamified pre-trade Mission Control experience. Includes: Probability Meter (SVG circular dial 0-100% scoring 10 criteria), Bias Gate (locks tools until bullish/bearish selected), Conservative/Aggressive strategy branch toggle, preset key level buttons (PDH, PDL, Midnight Open, NWOG, ODL, ODH), expanded position sizer with 8 futures assets (NQ/ES/GC/CL + micros) and tick value cheat sheet, contracts calculator (Account × Risk% / StopTicks × TickValue), voice note via Web Speech API (web) with speech-to-text, "Send to Journal" confirmation modal, and daily halt banner (ties into prop account daily loss limits). Components: `ProbabilityMeter.tsx` (web + mobile). Audio: `chime.wav` in web/public/sounds and mobile/assets/sounds.

## External Dependencies

- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **Authentication:** `jsonwebtoken`, `bcryptjs`
- **Payment Processing:** Stripe (`stripe`, `stripe-replit-sync`)
- **API Specification/Generation:** OpenAPI, Orval
- **Validation:** Zod (`zod/v4`), `drizzle-zod`
- **AI/LLM:** Google Gemini API
- **Frontend Frameworks/Libraries:** React Native (Expo), React, Vite
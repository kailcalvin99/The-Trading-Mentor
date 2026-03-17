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
- **TradingView Indicators:** Curated list of recommended indicators with descriptions and setup instructions.
- **Community Hub:** A Reddit-style forum with categories, post creation, and replies, available across all tiers.
- **Risk Disclosure:** Public legal page at `/risk-disclosure` covering educational purpose, no-financial-advice, trading risk warning, ICT methodology disclaimer, AI limitations, prop trading notice, and user responsibility. Cross-linked from all legal page footers and the Login page footer.
- **Tour Guide System:** 8-step interactive modal tour (TourGuide component) that auto-triggers on first login (1.2s delay, `ict_tour_complete_v1` localStorage flag). "Tour" button in Dashboard header allows manual restart. Covers Dashboard, Academy, Planner, Journal, Analytics, Risk Shield, and Community pages.
- **Share Stats:** ShareButton component on the Analytics page that generates a formatted performance summary (win rate, cumulative P&L, profit factor, total trades). Uses Web Share API with clipboard popup fallback.
- **Security Hardening:** `helmet` middleware for HTTP security headers (CSP/COEP disabled for SPA compatibility), `express-rate-limit` applied globally (300 req/15min), to Gemini AI routes (30 req/min), and to auth login (10 req/15min). `trust proxy` set for accurate IP detection behind Replit's reverse proxy.

## External Dependencies

- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **Authentication:** `jsonwebtoken`, `bcryptjs`
- **Payment Processing:** Stripe (`stripe`, `stripe-replit-sync`)
- **API Specification/Generation:** OpenAPI, Orval
- **Validation:** Zod (`zod/v4`), `drizzle-zod`
- **AI/LLM:** Google Gemini API
- **Frontend Frameworks/Libraries:** React Native (Expo), React, Vite
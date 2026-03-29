import fs from "fs";
import path from "path";
import { db } from "@workspace/db";
import { tradesTable, usersTable, userSubscriptionsTable, subscriptionTiersTable, propAccountTable, conversations, adminSettingsTable } from "@workspace/db";
import { eq, desc, sql, and, gte, inArray, count } from "drizzle-orm";
import { resolveRealPath, isInsideArtifacts, ARTIFACTS_ROOT, WORKSPACE_ROOT, KillZone, ICT_KILL_ZONES, getNyTime, isInZone, minutesUntilZone, getSystemPrompt } from "./geminiHelpers";
import { NQ_POINT_VALUE, MNQ_POINT_VALUE, ACADEMY_LESSON_INDEX } from "./toolDeclarations";

export async function executeToolCall(toolName: string, args: Record<string, unknown>, userId?: number, isAdmin?: boolean): Promise<Record<string, unknown>> {
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

      await db.insert(tradesTable).values({
        userId,
        pair,
        outcome,
        riskPct: riskPct.toString(),
        entryTime,
        notes,
        sideDirection,
        behaviorTag,
        isDraft: false,
        createdAt: new Date(),
      });

      return {
        action: "log_trade",
        tradeData: { pair, outcome, riskPct, entryTime, notes, sideDirection, behaviorTag },
        success: true,
        message: `Logged a ${outcome} trade on ${pair}.`,
      };
    }

    case "get_journal_entries": {
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

    case "read_source_file": {
      if (!isAdmin) return { error: "Admin access required" };
      const filePath = (args.path as string) || "";
      const absPath = path.resolve(WORKSPACE_ROOT, filePath.replace(/\\/g, "/").replace(/^\/+/, ""));
      if (!isInsideArtifacts(absPath)) {
        return { error: "Access denied: read_source_file may only access files inside the artifacts/ directory." };
      }
      try {
        const content = fs.readFileSync(absPath, "utf8");
        const lineArr = content.split("\n");
        const numbered = lineArr.map((l, i) => `${String(i + 1).padStart(4, " ")} | ${l}`).join("\n");
        return {
          action: "read_source_file",
          path: path.relative(WORKSPACE_ROOT, absPath),
          content: numbered,
          lines: lineArr.length,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { error: `Failed to read file: ${message}` };
      }
    }

    case "edit_source_file": {
      if (!isAdmin) return { error: "Admin access required" };
      const filePath = (args.path as string) || "";
      const oldString = (args.old_string as string) ?? "";
      const newString = (args.new_string as string) ?? "";
      if (!oldString) return { error: "old_string is required and cannot be empty." };
      const absPath = path.resolve(WORKSPACE_ROOT, filePath.replace(/\\/g, "/").replace(/^\/+/, ""));
      if (!isInsideArtifacts(absPath)) {
        return { error: "Access denied: edit_source_file may only modify files inside the artifacts/ directory." };
      }
      try {
        const current = fs.readFileSync(absPath, "utf8");
        if (!current.includes(oldString)) {
          return { error: "old_string not found in file. Make sure to copy it exactly from read_source_file output, preserving all indentation and whitespace." };
        }
        const updated = current.replace(oldString, newString);
        fs.writeFileSync(absPath, updated, "utf8");
        const oldLines = current.split("\n").length;
        const newLines = updated.split("\n").length;
        // Read the file back immediately to verify the write succeeded
        const readBack = fs.readFileSync(absPath, "utf8");
        // If new_string is not present in the file, the edit failed
        if (!readBack.includes(newString)) {
          return {
            success: false,
            error: "Verification failed: file was written but new_string was not found when reading back. The edit did not take effect.",
          };
        }
        // Build a short preview of the written content
        const previewSnippet = newString.length > 100
          ? newString.substring(0, 100) + "..."
          : newString;
        return {
          action: "edit_source_file",
          path: path.relative(WORKSPACE_ROOT, absPath),
          diffSummary: `Previous: ${oldLines} lines → New: ${newLines} lines (Δ ${newLines - oldLines >= 0 ? "+" : ""}${newLines - oldLines})`,
          preview: `Verified content snippet:\n${previewSnippet}`,
          refreshInstruction: "Edit verified on disk. Tell the user: pull-to-refresh on mobile or hard-refresh on web (Ctrl+Shift+R) to see the change.",
          success: true,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { error: `Failed to edit file: ${message}` };
      }
    }

    case "replace_lines": {
      if (!isAdmin) return { error: "Admin access required" };
      const rlFilePath = (args.path as string) || "";
      const rlStartLine = Math.max(1, Number(args.start_line) || 1);
      const rlEndLine = Math.max(rlStartLine, Number(args.end_line) || rlStartLine);
      const rlNewContent = (args.new_content as string) ?? "";
      const rlAbsPath = path.resolve(WORKSPACE_ROOT, rlFilePath.replace(/\\/g, "/").replace(/^\/+/, ""));
      if (!isInsideArtifacts(rlAbsPath)) {
        return { error: "Access denied: replace_lines may only modify files inside the artifacts/ directory." };
      }
      try {
        const rlCurrent = fs.readFileSync(rlAbsPath, "utf8");
        const rlLineArr = rlCurrent.split("\n");
        const rlTotalLines = rlLineArr.length;
        if (rlStartLine > rlTotalLines) {
          return { error: `start_line ${rlStartLine} is out of bounds (file has ${rlTotalLines} lines).` };
        }
        const rlClampedEnd = Math.min(rlEndLine, rlTotalLines);
        const rlReplacementLines = rlNewContent === "" ? [] : rlNewContent.split("\n");
        rlLineArr.splice(rlStartLine - 1, rlClampedEnd - rlStartLine + 1, ...rlReplacementLines);
        const rlUpdated = rlLineArr.join("\n");
        fs.writeFileSync(rlAbsPath, rlUpdated, "utf8");
        return {
          action: "replace_lines",
          path: path.relative(WORKSPACE_ROOT, rlAbsPath),
          diffSummary: `Replaced lines ${rlStartLine}–${rlClampedEnd} with ${rlReplacementLines.length} line(s)`,
          success: true,
          refreshInstruction: "Edit applied. Tell the user to pull-to-refresh on mobile or hard-refresh on web (Ctrl+Shift+R) to see the change.",
        };
      } catch (rlErr: unknown) {
        const rlMessage = rlErr instanceof Error ? rlErr.message : String(rlErr);
        return { error: `Failed to replace lines: ${rlMessage}` };
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

    case "report_critical_error": {
      const file = (args.file as string) || "unknown file";
      const error = (args.error as string) || "Unknown error";
      const suggestion = (args.suggestion as string) || "";
      return {
        action: "report_critical_error",
        file,
        error,
        suggestion,
        success: true,
      };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}


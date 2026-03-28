import { db, tradesTable } from "@workspace/db";
import { pool } from "@workspace/db";

const DEMO_MARKER = "[MEDIAN-SEED]";
const TOTAL_TRADES = 1000;

const PAIR_DISTRIBUTION: [string, number][] = [
  ["NQ1!", 334],
  ["ES1!", 200],
  ["EUR/USD", 200],
  ["GBP/USD", 133],
  ["NAS100", 133],
];

const PAIR_WIN_RATES: Record<string, number> = {
  "NQ1!": 0.52,
  "ES1!": 0.50,
  "EUR/USD": 0.48,
  "GBP/USD": 0.45,
  "NAS100": 0.50,
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomHour(min: number, max: number): number {
  return randomInt(min, max);
}

function generateEntryTime(isKillzone: boolean): string {
  if (isKillzone) {
    const inNyAm = Math.random() < 0.6;
    if (inNyAm) {
      const totalMin = randomInt(8 * 60 + 30, 10 * 60 + 59);
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      const h12 = h > 12 ? h - 12 : h;
      const ampm = h >= 12 ? "PM" : "AM";
      return `${h12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${ampm}`;
    } else {
      const totalMin = randomInt(3 * 60, 4 * 60 + 59);
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} AM`;
    }
  } else {
    const h = randomHour(0, 23);
    const m = randomInt(0, 59);
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${ampm}`;
  }
}

const WIN_NOTES = [
  "[Median] FVG looked decent. Entered after price swept lows. Came out profitable.",
  "[Median] Caught a nice move during NY open. Wasn't a perfect setup but it worked.",
  "[Median] Waited for a small pullback. Entry was okay, didn't follow the plan 100% but it worked.",
  "[Median] Saw displacement and entered. Didn't wait for full FVG confirmation but got lucky.",
  "[Median] NY AM trade. Setup was average but price moved in my direction.",
  "[Median] Took the trade a bit early but it still hit my target eventually.",
  "[Median] Good confluence — had FVG and liquidity sweep. Clean trade for once.",
  "[Median] Entered on momentum. Risk was a bit high but managed to get out green.",
  "[Median] Average setup, average result. Took what the market gave me.",
  "[Median] Half followed the plan. Price moved my way anyway. Will take it.",
];

const LOSS_NOTES = [
  "[Median] Chased the move. Should have waited for pullback to FVG but got impatient.",
  "[Median] FOMO trade. Price was already running and I jumped in late. Stopped out immediately.",
  "[Median] Ignored the time rule. Traded outside killzone and paid for it.",
  "[Median] Revenge trade after earlier loss. Doubled size, got stopped out harder.",
  "[Median] Setup was weak — no real FVG or liquidity sweep. Just took a shot.",
  "[Median] Moved my stop loss hoping it would come back. Made the loss bigger.",
  "[Median] Forced a trade on a slow day. No real setup, just boredom trading.",
  "[Median] Entered during news. Knew it was risky but did it anyway.",
  "[Median] Overleveraged. Had a valid setup but risked 2.5% and got wiped on the stop.",
  "[Median] Didn't wait for confirmation. Entered on anticipation and was wrong.",
  "[Median] Traded against the higher timeframe bias. Kept seeing FOMO setups.",
  "[Median] No killzone, no FVG, no sweep. Pure gamble. Lost as expected.",
];

const BE_NOTES = [
  "[Median] Moved to breakeven early because I was nervous. Missed the full move.",
  "[Median] Price came back to entry. At least didn't lose anything.",
  "[Median] Took partial at 1R and moved to BE. Rest stopped out. Decent management.",
  "[Median] Panicked and moved stop to BE too soon. Price reversed right after.",
  "[Median] Zero result. Setup was mediocre, outcome was mediocre.",
];

const WIN_FEEDBACK = [
  "This trade worked out, but I noticed you didn't wait for full FVG confirmation before entering. You got lucky this time — next time the market might not be so forgiving. Try to be more disciplined about waiting for all your confirmations before pulling the trigger.",
  "Good result! Your entry timing was slightly off — you were a bit outside the killzone window. The trade still worked because the overall bias was correct. Work on tightening your entry to the NY AM or London sessions consistently.",
  "Nice win. I can see you're starting to understand ICT concepts but the execution needs refinement. Your setup score reflects a trade that was partially confirmed. As you get more consistent with all criteria, you'll find your win rate naturally improving.",
  "You made money on this trade, but the risk was slightly above your target. Getting the result doesn't validate taking extra risk — keep it at 1% or below consistently. The process matters more than any single outcome.",
  "Solid trade. Your stress level shows you were somewhat anxious during this one. Work on trusting your confirmations — when all criteria are met, there's nothing to be anxious about. The calmer you trade, the better decisions you make.",
];

const LOSS_FEEDBACK = [
  "This loss was avoidable. You traded outside the killzone and didn't have FVG confirmation. These aren't just rules — they're filters that protect you from low-probability setups. Respect the process and these losses won't happen.",
  "I can see you chased this trade. The entry was after a big move, which means you were buying high and selling low — the opposite of what ICT methodology teaches. When you feel the urge to chase, sit on your hands instead.",
  "This looks like a revenge trade. After a loss, the worst thing you can do is immediately jump back in with higher risk to 'make it back.' Take a break, reset mentally, and only trade when you're calm and see a genuine setup.",
  "Your stress level on this trade was very high — that's a red flag before you even enter. High stress means your decision-making is compromised. If you're stressed, don't trade. Protect your capital until you're in the right mindset.",
  "You ignored the time rule on this one. The market behaves very differently outside killzones — spreads are wider, moves are less clean, and fake-outs are more common. Stick to NY AM and London sessions.",
  "Overleveraging is one of the fastest ways to blow an account. Even with a valid setup, taking 2-3% risk means one loss can set you back significantly. Keep risk at 1% maximum — your account will thank you long-term.",
];

const BE_FEEDBACK = [
  "Breakeven is better than a loss, but I notice you moved to breakeven too early out of fear rather than following your management rules. Trust the setup — if your confirmation was valid, give the trade room to work.",
  "Zero result. The setup was average going in, and average setups often produce average outcomes. Focus on only trading A+ setups and you'll see better consistency.",
  "Good capital preservation. You took a partial and moved to breakeven, which shows some discipline. Work on being more patient with the runner portion — let the market take you to target instead of micro-managing.",
];

const BEHAVIOR_TAGS = [
  "Disciplined", "Disciplined", "Patient",
  "FOMO", "FOMO", "Chased", "Chased",
  "Greedy", "Revenge",
];

const SETUP_TYPES = ["FVG", "Order Block", "Liquidity Sweep", "BOS/CHoCH", "None"];

function generateTrades() {
  const now = new Date();
  const weekdays: Date[] = [];
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 730);
  for (let d = new Date(startDate); d < now; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) weekdays.push(new Date(d));
  }

  interface TradeSpec {
    pair: string;
    outcome: "win" | "loss" | "breakeven";
    isKillzone: boolean;
  }

  const specs: TradeSpec[] = [];

  for (const [pair, count] of PAIR_DISTRIBUTION) {
    const winRate = PAIR_WIN_RATES[pair];
    const pairWins = Math.round(count * winRate);
    const pairLosses = Math.round(count * 0.30);
    for (let i = 0; i < count; i++) {
      let outcome: "win" | "loss" | "breakeven";
      if (i < pairWins) outcome = "win";
      else if (i < pairWins + pairLosses) outcome = "loss";
      else outcome = "breakeven";
      specs.push({ pair, outcome, isKillzone: Math.random() < 0.60 });
    }
  }

  for (let i = specs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [specs[i], specs[j]] = [specs[j], specs[i]];
  }

  const trades = [];
  for (let i = 0; i < TOTAL_TRADES; i++) {
    const spec = specs[i];
    const position = i / (TOTAL_TRADES - 1);
    const dateIdx = Math.min(Math.floor(position * (weekdays.length - 1)), weekdays.length - 1);
    const tradeDate = new Date(weekdays[dateIdx]);

    const entryTime = generateEntryTime(spec.isKillzone);
    const riskPct = randomFloat(0.8, 2.5);
    const setupScore = randomInt(50, 75);
    const stressLevel = randomInt(2, 5);

    const followedTimeRule = spec.isKillzone && Math.random() < 0.65;
    const hasFvgConfirmation = Math.random() < 0.55;
    const liquiditySweep = Math.random() < 0.58;

    let behaviorTag = pick(BEHAVIOR_TAGS);
    if (spec.outcome === "loss" && Math.random() < 0.6) {
      behaviorTag = pick(["FOMO", "Chased", "Revenge", "Greedy"]);
    } else if (spec.outcome === "win" && Math.random() < 0.5) {
      behaviorTag = pick(["Disciplined", "Patient"]);
    }

    let notes: string;
    let coachFeedback: string;
    if (spec.outcome === "win") {
      notes = pick(WIN_NOTES);
      coachFeedback = pick(WIN_FEEDBACK);
    } else if (spec.outcome === "loss") {
      notes = pick(LOSS_NOTES);
      coachFeedback = pick(LOSS_FEEDBACK);
    } else {
      notes = pick(BE_NOTES);
      coachFeedback = pick(BE_FEEDBACK);
    }

    const sideDirection = Math.random() < 0.5 ? "BUY" : "SELL";
    const setupType = pick(SETUP_TYPES);

    const createdAt = new Date(tradeDate);
    const randomMinOffset = randomInt(0, 23 * 60 + 59);
    createdAt.setHours(Math.floor(randomMinOffset / 60), randomMinOffset % 60, randomInt(0, 59));

    trades.push({
      pair: spec.pair,
      entryTime,
      riskPct: riskPct.toString(),
      liquiditySweep,
      outcome: spec.outcome,
      notes: `${DEMO_MARKER} ${notes}`,
      behaviorTag,
      followedTimeRule,
      hasFvgConfirmation,
      stressLevel,
      isDraft: false,
      ticker: spec.pair,
      sideDirection,
      coachFeedback,
      setupScore,
      setupType,
      createdAt,
    });
  }

  trades.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return trades;
}

async function main() {
  console.log("Clearing all existing trades...");
  await db.delete(tradesTable);

  console.log("Generating 1000 median trader demo trades...");
  const trades = generateTrades();

  console.log(`Inserting ${trades.length} trades into the database...`);
  const BATCH_SIZE = 50;
  for (let i = 0; i < trades.length; i += BATCH_SIZE) {
    await db.insert(tradesTable).values(trades.slice(i, i + BATCH_SIZE));
  }
  console.log(`Successfully inserted ${trades.length} trades.`);

  const wins = trades.filter((t) => t.outcome === "win").length;
  const losses = trades.filter((t) => t.outcome === "loss").length;
  const breakevens = trades.filter((t) => t.outcome === "breakeven").length;
  const winRate = Math.round((wins / trades.length) * 100);
  const disciplined = trades.filter((t) => ["Disciplined", "Patient", "Waited for Confirmation"].includes(t.behaviorTag)).length;
  const badBehavior = trades.filter((t) => ["FOMO", "Chased", "Revenge", "Greedy"].includes(t.behaviorTag)).length;

  const pairCounts: Record<string, { wins: number; total: number }> = {};
  trades.forEach((t) => {
    if (!pairCounts[t.pair]) pairCounts[t.pair] = { wins: 0, total: 0 };
    pairCounts[t.pair].total++;
    if (t.outcome === "win") pairCounts[t.pair].wins++;
  });

  console.log(`\n=== MEDIAN TRADER SUMMARY ===`);
  console.log(`  Total: ${trades.length}`);
  console.log(`  Wins: ${wins} (${winRate}%)`);
  console.log(`  Losses: ${losses}`);
  console.log(`  Breakevens: ${breakevens}`);
  console.log(`  Disciplined behavior: ${disciplined} (${Math.round(disciplined / trades.length * 100)}%)`);
  console.log(`  Bad behavior (FOMO/Revenge/etc): ${badBehavior} (${Math.round(badBehavior / trades.length * 100)}%)`);
  console.log(`  Pair breakdown:`);
  for (const [pair, data] of Object.entries(pairCounts)) {
    console.log(`    ${pair}: ${data.total} trades, ${Math.round(data.wins / data.total * 100)}% WR`);
  }
  console.log(`  Date range: ${trades[0].createdAt.toLocaleDateString()} - ${trades[trades.length - 1].createdAt.toLocaleDateString()}`);

  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

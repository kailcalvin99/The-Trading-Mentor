import { db, tradesTable } from "@workspace/db";
import { pool } from "@workspace/db";

const DEMO_MARKER = "[LOUSY-SEED]";
const TOTAL_TRADES = 1000;

const PAIR_DISTRIBUTION: [string, number][] = [
  ["NQ1!", 334],
  ["ES1!", 200],
  ["EUR/USD", 200],
  ["GBP/USD", 133],
  ["NAS100", 133],
];

const PAIR_WIN_RATES: Record<string, number> = {
  "NQ1!": 0.30,
  "ES1!": 0.28,
  "EUR/USD": 0.27,
  "GBP/USD": 0.25,
  "NAS100": 0.30,
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

function generateEntryTime(): string {
  const h = randomInt(0, 23);
  const m = randomInt(0, 59);
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${ampm}`;
}

const WIN_NOTES = [
  "[Lousy] Got lucky on this one. Entered randomly and it moved my way.",
  "[Lousy] No real setup. Just gambled and it worked out this time.",
  "[Lousy] Revenge traded after 3 losses. Happened to go green. Won't always work.",
  "[Lousy] Entered on a whim during lunch hours. Price happened to spike my way.",
  "[Lousy] Doubled up after losing trade. Fluked a win this time.",
  "[Lousy] Had no plan. Just clicked buy because price looked 'low'. Got lucky.",
  "[Lousy] FOMO entry on a big move. Was already extended but kept going.",
  "[Lousy] Traded news release blindly. Price spiked in my direction.",
];

const LOSS_NOTES = [
  "[Lousy] FOMO'd into a trade that was already 200 points extended. Obvious in hindsight.",
  "[Lousy] Revenge traded after losing streak. Made it worse. Can't keep doing this.",
  "[Lousy] No FVG, no sweep, no killzone. Forced a trade out of boredom.",
  "[Lousy] Moved my stop loss 3 times hoping it would come back. Final loss was huge.",
  "[Lousy] Overrisked at 4%. One loss wiped a week of gains.",
  "[Lousy] Traded during news with no plan. Spreads were massive, got slipped.",
  "[Lousy] Couldn't sleep — traded at 2 AM with no setup. Predictable outcome.",
  "[Lousy] Chased price for 30 minutes and finally entered near the top.",
  "[Lousy] Entered without any confirmation. Felt like it would go up. It didn't.",
  "[Lousy] Greedy — didn't take profit at target, held for more, gave it all back.",
  "[Lousy] Traded 5 pairs at the same time. Couldn't manage any of them.",
  "[Lousy] Another revenge trade. I know I shouldn't but I can't help it.",
  "[Lousy] Moved stop to 'give it more room' and watched loss compound.",
  "[Lousy] Ignored my daily loss limit. Kept digging the hole deeper.",
  "[Lousy] No killzone, no trend, no setup. Just boredom clicking.",
];

const BE_NOTES = [
  "[Lousy] Got to BE but only because I panicked and closed too early.",
  "[Lousy] Scratched the trade when it moved against me slightly. Lucky it didn't go full loss.",
  "[Lousy] Terrible entry but managed to escape at zero. Consider this a win given how bad the setup was.",
  "[Lousy] Overtraded all day. This one at least ended flat.",
];

const WIN_FEEDBACK = [
  "This trade was profitable but it was essentially a gamble. You had no FVG confirmation, no killzone timing, and your risk was well above 1%. You won this time — but this approach will destroy your account over time. A 30% win rate on random entries means 70% of these become losses.",
  "I see you made money here, but I want to be honest: luck played a bigger role than skill. Your stress level was very high, your setup score was low, and you broke multiple rules. Please don't let this win reinforce bad habits. One lucky trade does not make a strategy.",
  "You entered this trade out of FOMO and it happened to work. This is dangerous — it teaches your brain that FOMO trades are acceptable. They're not. Over a large sample, FOMO entries will consistently lose money. Start building real confirmations.",
];

const LOSS_FEEDBACK = [
  "This is a completely avoidable loss. You traded outside killzone hours with no FVG, no liquidity sweep, and took 3-4x your appropriate risk size. This isn't bad luck — this is the inevitable result of trading without a plan. You MUST start following your rules.",
  "You've had multiple consecutive losses and I can see the stress level is maxed out. This is the danger zone — when you're this stressed, every decision will be wrong. STOP TRADING. Walk away, reset, and come back tomorrow with a plan.",
  "This looks like a revenge trade. You lost, got emotional, immediately took another trade to make it back, and lost again. This cycle is how traders blow accounts. There is no urgency in trading. The market will be there tomorrow.",
  "Your risk on this trade was completely unacceptable. At 4-5% risk, a single loss sets you back weeks of work. Professional traders risk 0.5-1% per trade specifically because they know losses are inevitable. You cannot control outcomes — only risk.",
  "You moved your stop loss to 'give it more room.' This is one of the most destructive habits in trading. Your stop was placed where it was for a reason — if it gets hit, the trade idea is invalid. Moving stops converts planned losses into account-destroying losses.",
  "No killzone, no FVG, no liquidity sweep. You checked zero boxes on your trading plan and took a trade anyway. This is not trading — this is gambling. The market has no obligation to reward undisciplined entries.",
  "You're trading at random hours when institutional order flow doesn't exist. At 2 AM or during lunch hours, the market is controlled by algorithms and retail noise. Stick to NY AM and London sessions where real liquidity and direction exist.",
  "Another loss from chasing an extended move. Price had already moved significantly before you entered — you were buying the top or selling the bottom. The ICT model requires you to wait for price to RETURN to a premium/discount zone, not chase it.",
];

const BE_FEEDBACK = [
  "You escaped with zero on a terrible trade. Be grateful — this should have been a big loss. The setup was non-existent and you violated nearly every rule. Use this as a wake-up call rather than an excuse to keep trading this way.",
  "Breakeven on a trade you had no business taking. The market gave you a free pass this time. Start treating your trading plan like a non-negotiable set of rules, not suggestions.",
];

const BEHAVIOR_TAGS = [
  "FOMO", "FOMO", "FOMO",
  "Revenge", "Revenge",
  "Greedy", "Greedy",
  "Chased", "Chased",
  "Disciplined",
];

const SETUP_TYPES = ["None", "None", "FVG", "Order Block", "Liquidity Sweep"];

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
  }

  const specs: TradeSpec[] = [];

  for (const [pair, count] of PAIR_DISTRIBUTION) {
    const winRate = PAIR_WIN_RATES[pair];
    const pairWins = Math.round(count * winRate);
    const pairLosses = Math.round(count * 0.55);
    for (let i = 0; i < count; i++) {
      let outcome: "win" | "loss" | "breakeven";
      if (i < pairWins) outcome = "win";
      else if (i < pairWins + pairLosses) outcome = "loss";
      else outcome = "breakeven";
      specs.push({ pair, outcome });
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

    const entryTime = generateEntryTime();
    const riskPct = randomFloat(1.5, 5.0);
    const setupScore = randomInt(20, 58);
    const stressLevel = randomInt(3, 5);

    const followedTimeRule = Math.random() < 0.18;
    const hasFvgConfirmation = Math.random() < 0.22;
    const liquiditySweep = Math.random() < 0.20;

    let behaviorTag = pick(BEHAVIOR_TAGS);
    if (spec.outcome === "win" && Math.random() < 0.3) {
      behaviorTag = pick(["FOMO", "Greedy"]);
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

  console.log("Generating 1000 lousy trader demo trades...");
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

  console.log(`\n=== LOUSY TRADER SUMMARY ===`);
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

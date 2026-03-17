import { db, tradesTable } from "@workspace/db";
import { pool } from "@workspace/db";
import { like } from "drizzle-orm";

const DEMO_MARKER = "[DEMO-SEED]";

const PAIR_DISTRIBUTION: [string, number][] = [
  ["NQ1!", 20],
  ["ES1!", 12],
  ["EUR/USD", 12],
  ["GBP/USD", 8],
  ["NAS100", 8],
];

const PAIR_WIN_RATES: Record<string, number> = {
  "NQ1!": 0.85,
  "ES1!": 0.75,
  "EUR/USD": 0.67,
  "GBP/USD": 0.625,
  "NAS100": 0.75,
};

const NY_AM_START_HOUR = 8;
const NY_AM_START_MIN = 30;
const NY_AM_END_HOUR = 10;
const NY_AM_END_MIN = 59;
const LONDON_START_HOUR = 3;
const LONDON_END_HOUR = 4;
const LONDON_END_MIN = 59;

const WIN_NOTES = [
  "[Conservative] Waited for NY killzone displacement into FVG. Clean entry at OTE.",
  "[Conservative] Swept BSL before entry. FVG filled at premium, textbook ICT setup.",
  "[Conservative] London open displacement, waited for FVG retracement at 62% OTE.",
  "[Conservative] NY AM session — swept SSL, MSS confirmed on 5m, entered on FVG fill.",
  "[Conservative] Patient entry after liquidity grab above PDH. FVG at discount.",
  "[Conservative] Clean Silver Bullet window entry. 1m FVG after sweep of Asian high.",
  "[Silver Bullet] 10:15 AM entry — swept BSL, got MSS on 1m, entered first FVG.",
  "[Conservative] Waited for displacement candle through FVG zone. OTE at 70.5%.",
  "[Conservative] NY AM killzone, swept buy-side liquidity, clean bearish MSS on 5m.",
  "[Conservative] London session — price swept Asian low then delivered into bullish FVG.",
  "[Conservative] Beautiful order block entry after sweep of sell-side liquidity.",
  "[Conservative] Watched price take PDL, waited for FVG fill in discount array.",
  "[Silver Bullet] 10:30 AM — swept session high, entered first 1m FVG at premium.",
  "[Conservative] MSS on 15m confirmed bias. Entered 5m FVG at OTE. Perfect execution.",
  "[Conservative] Swept BSL at London open, waited patiently for FVG to present itself.",
  "[Conservative] NY AM — liquidity swept at 9:30 AM open, FVG entry 10 minutes later.",
  "[Conservative] Displacement through FVG, entered on retrace. Stop below swing low.",
  "[Conservative] Price took equal highs, MSS on 5m, entered at 79% OTE in FVG.",
  "[Conservative] Textbook ICT model — sweep, shift, FVG fill. Low stress, clean trade.",
  "[Conservative] Waited for confirmation after news volatility settled. FVG at discount.",
];

const LOSS_NOTES = [
  "[Conservative] Setup was clean — swept BSL, FVG confirmed, OTE entry. Market just reversed on unexpected flow. Process was correct.",
  "[Conservative] NY AM entry, all confirmations present. Price swept my stop by 2 ticks before going my direction. Unlucky but disciplined.",
  "[Conservative] London session, FVG fill at discount. Trade invalidated by sudden news-driven move. Accepted the loss, rules were followed.",
  "[Conservative] Clean MSS and FVG entry but the displacement faded. Sometimes the market doesn't deliver. No rules broken.",
  "[Conservative] OTE entry after liquidity sweep. Price consolidated and stopped me out before continuing. Process over outcome.",
];

const BE_NOTES = [
  "[Conservative] Moved to breakeven after 1R move. Price came back and hit BE. Proper risk management.",
  "[Conservative] FVG entry was good, got partial fill. Moved stop to entry. Protected capital.",
  "[Conservative] Swept BSL, entered FVG. Got 0.5R move, trailed to BE. Market reversed. Smart management.",
  "[Conservative] NY AM setup hit TP1 partial, rest stopped at BE. Locked in zero risk perfectly.",
  "[Conservative] London session entry. Price stalled after initial move. Trailed to BE per rules.",
  "[Conservative] All criteria met. Got small move, tightened to BE. No loss is a good outcome.",
  "[Conservative] MSS confirmed, FVG entry. Price chopped sideways. Moved to BE after 30 min. Patience paid off.",
  "[Conservative] Clean setup but volatility died. BE exit was the right call.",
  "[Conservative] Entered at OTE, price moved 0.8R then reversed. Stop at entry saved the trade.",
];

const WIN_FEEDBACK = [
  "Excellent execution on this trade. You waited patiently for the killzone, confirmed the FVG, and only entered after the liquidity sweep — exactly what a disciplined ICT trader does. Your stress level was low, which means you were calm and in control. Keep trading like this and the results will compound.",
  "This trade shows textbook ICT discipline. The entry timing during NY AM, combined with FVG confirmation and a clean liquidity sweep, gave you a high-probability setup. Your risk management at under 1% is exactly where it should be. Outstanding work.",
  "Great trade. You followed every rule in your checklist — killzone timing, FVG confirmation, liquidity sweep present. The low stress level tells me you trusted your process. This is how professional traders operate. One suggestion: continue journaling these wins so you can replicate the mindset.",
  "This is what disciplined trading looks like. You waited for the right session, confirmed with FVG, and kept risk controlled. Your behavior tag shows discipline, and the outcome reflects it. The key insight here is that you didn't chase — you let price come to you.",
  "Solid execution. Every ICT confirmation was present: killzone entry, FVG, liquidity sweep. Your setup score reflects the quality of this trade. The fact that your stress was low shows emotional maturity. This is sustainable trading.",
  "Another clean win following ICT methodology perfectly. You respected the time rule, waited for displacement, and entered on the FVG. Your risk was well-controlled and your notes show deep understanding of the concepts. Keep building on this consistency.",
  "Textbook ICT trade. The liquidity sweep before entry is exactly what you want to see — it confirms that stops were taken before your direction. Combined with FVG confirmation and killzone timing, this was as high-probability as it gets. Well done.",
  "Your patience on this trade is impressive. Waiting for all confirmations before entering shows real discipline. The setup score is well-deserved. One thing to note: your stress stayed low throughout, which is critical for consistent performance.",
];

const LOSS_FEEDBACK = [
  "Even though this trade resulted in a loss, your process was perfect. You followed every rule — killzone timing, FVG confirmation, liquidity sweep, controlled risk. Sometimes the market simply doesn't deliver, and that's okay. The outcome was unlucky but the execution was elite. Don't change anything about your approach.",
  "This is a process-perfect loss. Every checkbox was ticked: right time, right confirmation, right risk size. The market moved against you, but your discipline in taking the stop loss without moving it shows professional-level trading. These losses are the cost of doing business in the market.",
  "Your execution here was flawless despite the losing outcome. You entered during the killzone, had FVG confirmation, and kept risk below 1%. The loss was small and controlled. This is exactly how losses should look — small, planned, and within your rules. The P&L will take care of itself when process is this good.",
];

const BE_FEEDBACK = [
  "Smart trade management. You entered with full ICT confirmation and when the trade didn't deliver the expected move, you protected your capital by moving to breakeven. This shows maturity — most traders would have held and hoped. Zero risk trades are victories in themselves.",
  "Good discipline on this trade. The entry was clean with FVG and liquidity sweep confirmation. Moving to breakeven when momentum stalled was the right decision. Protecting capital is always the priority. Your low stress level shows you were thinking clearly throughout.",
  "Breakeven outcome but excellent process. You followed all the rules, entered at the right time with proper confirmation. The fact that you trailed to breakeven rather than giving back profits shows risk management mastery. Keep making decisions like this.",
];

const BEHAVIOR_TAGS = ["Disciplined", "Patient", "Waited for Confirmation"];
const SETUP_TYPES = ["FVG", "Order Block", "Liquidity Sweep", "BOS/CHoCH"];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateNyAmEntryTime(): string {
  const totalMinutes = (NY_AM_END_HOUR * 60 + NY_AM_END_MIN) - (NY_AM_START_HOUR * 60 + NY_AM_START_MIN);
  const offset = randomInt(0, totalMinutes);
  const minutes = NY_AM_START_HOUR * 60 + NY_AM_START_MIN + offset;
  const hour = Math.floor(minutes / 60);
  const min = minutes % 60;
  const h12 = hour > 12 ? hour - 12 : hour;
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${h12.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")} ${ampm}`;
}

function generateLondonEntryTime(): string {
  const totalMinutes = (LONDON_END_HOUR * 60 + LONDON_END_MIN) - (LONDON_START_HOUR * 60);
  const offset = randomInt(0, totalMinutes);
  const minutes = LONDON_START_HOUR * 60 + offset;
  const hour = Math.floor(minutes / 60);
  const min = minutes % 60;
  return `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")} AM`;
}

function generateTrades() {
  const now = new Date();
  const totalTrades = 60;

  const weekdays: Date[] = [];
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 61);
  for (let d = new Date(startDate); d < now; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) {
      weekdays.push(new Date(d));
    }
  }

  interface TradeSpec {
    pair: string;
    outcome: "win" | "loss" | "breakeven";
    isNyAm: boolean;
  }

  const specs: TradeSpec[] = [];

  for (const [pair, count] of PAIR_DISTRIBUTION) {
    const winRate = PAIR_WIN_RATES[pair];
    const pairWins = Math.round(count * winRate);
    const pairLosses = Math.round(count * 0.1);

    for (let i = 0; i < count; i++) {
      let outcome: "win" | "loss" | "breakeven";
      if (i < pairWins) outcome = "win";
      else if (i < pairWins + pairLosses) outcome = "loss";
      else outcome = "breakeven";

      specs.push({ pair, outcome, isNyAm: true });
    }
  }

  for (let i = specs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [specs[i], specs[j]] = [specs[j], specs[i]];
  }

  for (const spec of specs) {
    if (spec.outcome === "loss" || spec.outcome === "breakeven") {
      spec.isNyAm = false;
    }
  }

  let nyAmLosses = 0;
  for (const spec of specs) {
    if (spec.outcome === "loss" && nyAmLosses < 2) {
      spec.isNyAm = true;
      nyAmLosses++;
    }
  }

  let londonWins = 0;
  const targetLondonWins = 10;
  for (const spec of specs) {
    if (londonWins >= targetLondonWins) break;
    if (spec.outcome === "win" && spec.isNyAm && Math.random() < 0.35) {
      spec.isNyAm = false;
      londonWins++;
    }
  }
  if (londonWins < targetLondonWins) {
    for (const spec of specs) {
      if (londonWins >= targetLondonWins) break;
      if (spec.outcome === "win" && spec.isNyAm) {
        spec.isNyAm = false;
        londonWins++;
      }
    }
  }

  function fixConsecutiveLosses() {
    for (let pass = 0; pass < 200; pass++) {
      let found = false;
      for (let i = 0; i < specs.length - 1; i++) {
        if (specs[i].outcome === "loss" && specs[i + 1].outcome === "loss") {
          found = true;
          const winIdx = specs.findIndex((s, j) => j > i + 1 && s.outcome === "win");
          if (winIdx !== -1) {
            [specs[i + 1], specs[winIdx]] = [specs[winIdx], specs[i + 1]];
          } else {
            const beIdx = specs.findIndex((s, j) => j > i + 1 && s.outcome === "breakeven");
            if (beIdx !== -1) {
              [specs[i + 1], specs[beIdx]] = [specs[beIdx], specs[i + 1]];
            }
          }
        }
      }
      if (!found) break;
    }
  }
  fixConsecutiveLosses();

  const trades = [];

  for (let i = 0; i < totalTrades; i++) {
    const spec = specs[i];
    const position = i / (totalTrades - 1);
    const dateIdx = Math.min(Math.floor(position * (weekdays.length - 1)), weekdays.length - 1);
    const tradeDate = new Date(weekdays[dateIdx]);

    const entryTime = spec.isNyAm ? generateNyAmEntryTime() : generateLondonEntryTime();

    const riskPct = randomFloat(0.5, 1.0);
    const setupScore = randomInt(80, 98);
    const stressLevel = randomInt(1, 3);

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

    const behaviorTag = pick(BEHAVIOR_TAGS);
    const sideDirection = Math.random() < 0.5 ? "BUY" : "SELL";
    const setupType = pick(SETUP_TYPES);

    const createdAt = new Date(tradeDate);
    if (spec.isNyAm) {
      const minOffset = randomInt(0, NY_AM_END_HOUR * 60 + NY_AM_END_MIN - NY_AM_START_HOUR * 60 - NY_AM_START_MIN);
      const totalMin = NY_AM_START_HOUR * 60 + NY_AM_START_MIN + minOffset;
      createdAt.setHours(Math.floor(totalMin / 60), totalMin % 60, randomInt(0, 59));
    } else {
      const minOffset = randomInt(0, LONDON_END_HOUR * 60 + LONDON_END_MIN - LONDON_START_HOUR * 60);
      const totalMin = LONDON_START_HOUR * 60 + minOffset;
      createdAt.setHours(Math.floor(totalMin / 60), totalMin % 60, randomInt(0, 59));
    }

    trades.push({
      pair: spec.pair,
      entryTime,
      riskPct: riskPct.toString(),
      liquiditySweep: true,
      outcome: spec.outcome,
      notes: `${DEMO_MARKER} ${notes}`,
      behaviorTag,
      followedTimeRule: true,
      hasFvgConfirmation: true,
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
  const existing = await db.select({ id: tradesTable.id }).from(tradesTable)
    .where(like(tradesTable.notes, `${DEMO_MARKER}%`));
  if (existing.length > 0) {
    console.log(`Removing ${existing.length} existing demo trades...`);
    await db.delete(tradesTable).where(like(tradesTable.notes, `${DEMO_MARKER}%`));
  }

  console.log("Generating 60 perfect ICT trader demo trades...");
  const trades = generateTrades();

  console.log(`Inserting ${trades.length} trades into the database...`);

  for (const trade of trades) {
    await db.insert(tradesTable).values(trade);
  }

  console.log(`Successfully inserted ${trades.length} trades.`);

  const wins = trades.filter((t) => t.outcome === "win").length;
  const losses = trades.filter((t) => t.outcome === "loss").length;
  const breakevens = trades.filter((t) => t.outcome === "breakeven").length;
  const winRate = Math.round((wins / trades.length) * 100);
  const nyAmTrades = trades.filter((t) => {
    const m = t.entryTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return false;
    let h = parseInt(m[1]);
    if (m[3].toUpperCase() === "PM" && h !== 12) h += 12;
    if (m[3].toUpperCase() === "AM" && h === 12) h = 0;
    return h >= 8 && h <= 10;
  });
  const nyAmWins = nyAmTrades.filter((t) => t.outcome === "win").length;

  const pairCounts: Record<string, { wins: number; total: number }> = {};
  trades.forEach((t) => {
    if (!pairCounts[t.pair]) pairCounts[t.pair] = { wins: 0, total: 0 };
    pairCounts[t.pair].total++;
    if (t.outcome === "win") pairCounts[t.pair].wins++;
  });

  console.log(`\nSummary:`);
  console.log(`  Total: ${trades.length}`);
  console.log(`  Wins: ${wins} (${winRate}%)`);
  console.log(`  Losses: ${losses}`);
  console.log(`  Breakevens: ${breakevens}`);
  console.log(`  NY AM trades: ${nyAmTrades.length} (${Math.round(nyAmWins / nyAmTrades.length * 100)}% WR)`);
  console.log(`  Pair breakdown:`);
  for (const [pair, data] of Object.entries(pairCounts)) {
    console.log(`    ${pair}: ${data.total} trades, ${Math.round(data.wins / data.total * 100)}% WR`);
  }
  console.log(`  Date range: ${trades[0].createdAt.toLocaleDateString()} - ${trades[trades.length - 1].createdAt.toLocaleDateString()}`);
  console.log(`  No consecutive losses: ${!trades.some((t, i) => i > 0 && t.outcome === "loss" && trades[i - 1].outcome === "loss")}`);

  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

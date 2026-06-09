import { useState, useRef, useEffect, type ReactNode } from "react";

type Tab = "learn" | "glossary" | "quiz" | "mentor" | "plan";
type Difficulty = "easy" | "medium" | "hard";

interface QuizQuestion {
  difficulty: Difficulty;
  scenario: string;
  options: string[];
  answer: number;
  explanation: string;
}

interface Lesson {
  id: string;
  title: string;
  paragraphs: string[];
  takeaway: string;
  chartImage?: string;
}

interface Chapter {
  id: string;
  title: string;
  color: string;
  icon: string;
  description: string;
  lessons: Lesson[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: number;
  title: string;
}

const COURSE_CHAPTERS: Chapter[] = [
  {
    id: "ch1",
    title: "Trading Basics",
    color: "#00C896",
    icon: "📘",
    description: "Start here if you know nothing about trading. We'll cover what trading is, what futures are, how to read a chart, and more.",
    lessons: [
      { id: "ch1-1", title: "What is Trading?", paragraphs: ["Trading is simply buying and selling things to make money from price changes. Imagine you buy a pair of sneakers for $100. A week later, they're selling for $150. If you sell them, you just made $50. That's trading!", "In the stock market, instead of sneakers, people buy and sell stocks (tiny pieces of companies), currencies (like dollars and euros), and futures contracts (agreements to buy/sell something at a future date). The goal is the same — buy low, sell high.", "But here's the cool part: in futures trading, you can also make money when prices go DOWN. This is called 'shorting' or 'selling.' You're basically betting the price will drop. If it does, you profit.", "Trading happens on exchanges — big digital marketplaces where buyers and sellers meet. Everything is done through a computer."], takeaway: "Trading is buying and selling to profit from price changes. You can make money when prices go up (buying) or down (selling/shorting)." },
      { id: "ch1-2", title: "What are Futures? What is NQ?", paragraphs: ["A futures contract is an agreement to buy or sell something at a set price on a future date. Think of it like pre-ordering a video game.", "NQ stands for the Nasdaq-100 E-mini Futures. The Nasdaq-100 is a list of the 100 biggest tech companies. One point of movement in NQ = $20 in your account.", "There's also MNQ (Micro Nasdaq-100 Futures), which is a smaller version — each point = $2 instead of $20. This is great for beginners.", "Futures trade almost 24 hours a day, Sunday evening through Friday afternoon."], takeaway: "NQ = Nasdaq-100 Futures ($20/point). MNQ = the mini version ($2/point). Start with MNQ while learning." },
      { id: "ch1-3", title: "What is a Candlestick Chart?", paragraphs: ["A candlestick chart is the most common way traders look at price movements. Each 'candlestick' represents a specific time period.", "Every candle has 4 parts: the Open, the Close, the High, and the Low. The thick body shows Open to Close. The thin lines (wicks) show High and Low.", "GREEN candle = price went UP. RED candle = price went DOWN.", "A bunch of green candles in a row means the market is going up (bullish). Red candles = going down (bearish)."], takeaway: "Each candle shows Open, High, Low, Close for a time period. Green = price went up, Red = price went down." },
      { id: "ch1-4", title: "What are Timeframes?", paragraphs: ["A timeframe is how much time each candle represents. A 1-minute chart means each candle shows 1 minute of price action.", "Different timeframes show different pictures. The daily chart shows the BIG picture. The 1-minute chart shows every tiny move.", "Think of it like Google Maps. The daily chart is zooming out to see the whole country. The 1-minute is seeing your street.", "In ICT trading, we use Daily and 1-Hour charts for direction, then zoom into 15-minute and 5-minute charts for entries."], takeaway: "Higher timeframes (Daily, 1H) show the big picture. Lower timeframes (15m, 5m, 1m) show the details." },
      { id: "ch1-5", title: "What is a Broker and Trading Platform?", paragraphs: ["A broker is the company that connects you to the market. You need a broker to place your trades.", "A trading platform is the app or software you use to see charts and place trades. Popular ones include NinjaTrader, TradingView, and Tradovate.", "When you open a trading account, you deposit money (called 'capital'). The broker holds your money and executes your trades.", "For beginners, use a 'demo account' or 'paper trading' to practice with fake money first."], takeaway: "A broker connects you to the market. A platform is the app you trade on. Always start with a demo account!" },
      { id: "ch1-6", title: "What is a Prop Firm?", paragraphs: ["A prop firm gives you THEIR money to trade with. If you make profits, you keep 80-90%. If you lose, the firm takes the hit.", "To get funded, you first need to pass an 'evaluation' — a test where you prove you can follow the rules and make money.", "Our app's Risk Shield rules (2% daily loss limit, 4% weekly) are designed specifically to help you pass prop firm evaluations.", "Common prop firms include Topstep, Apex, and FTMO. They charge around $100-$200 for the evaluation."], takeaway: "Prop firms give you their money to trade with. Pass their evaluation by following strict risk rules, and keep 80-90% of profits." }
    ]
  },
  {
    id: "ch2",
    title: "How the Market Really Works",
    color: "#818CF8",
    icon: "🏦",
    description: "Understand who really moves the market, what liquidity is, and why most retail traders lose money.",
    lessons: [
      { id: "ch2-1", title: "Who Moves the Market?", paragraphs: ["The market is moved by huge banks, hedge funds, and institutions — we call them 'Smart Money.' Regular traders only make up about 10-15% of the market.", "Smart Money TRICKS retail traders into taking the wrong side. They push price up to make people buy, then slam it back down.", "ICT concepts teach you to think LIKE the big players instead of getting tricked by them.", "Instead of falling for fake moves, you learn to spot them and trade in the same direction as the banks."], takeaway: "Banks and institutions (Smart Money) move the market. ICT teaches you to follow the Smart Money instead of getting fooled." },
      { id: "ch2-2", title: "What is Liquidity?", paragraphs: ["Liquidity is where people's stop-loss orders are sitting. The big players NEED these orders to fill their own trades.", "Think of it like a piggy bank. Retail traders place their stop-losses at predictable spots. The big players sweep them.", "This is why you see price spike below a low and then shoot back up. That spike is Smart Money sweeping the liquidity.", "Understanding this is the key to ICT trading — trade in the direction Smart Money moves AFTER the sweep."], takeaway: "Liquidity = stop-loss orders at predictable levels. Smart Money sweeps these stops, then reverses." },
      { id: "ch2-3", title: "Buy-Side vs Sell-Side Liquidity", paragraphs: ["Buy-Side Liquidity (BSL) sits ABOVE recent highs. Sell-Side Liquidity (SSL) sits BELOW recent lows.", "The Smart Money sweeps one side to fuel a move in the opposite direction.", "For example: price drops below a recent low (sweeping SSL), then rockets back up.", "When you see a sweep happen, that's your signal to look for a trade in the opposite direction."], takeaway: "BSL = above highs. SSL = below lows. Smart Money sweeps one side, then moves the other way." },
      { id: "ch2-4", title: "What is Smart Money?", paragraphs: ["Smart Money = JP Morgan, Goldman Sachs, Citadel, and other major banks and hedge funds.", "The ICT method teaches you to read clues Smart Money leaves: liquidity sweeps, displacement candles, and fair value gaps.", "Think of Smart Money like a poker player who can see everyone else's cards.", "The goal isn't to outsmart them — it's to trade WITH them."], takeaway: "Smart Money = big banks that move the market. Trade WITH them, not against them." },
      { id: "ch2-5", title: "Internal vs External Liquidity", paragraphs: ["External Liquidity is the BIG target — an old high or low that hasn't been taken out yet.", "Internal Liquidity is the NEARBY target — Fair Value Gaps that price tends to fill.", "In our plan, TP1 (first target) is usually internal liquidity. TP2 (main target) is external liquidity.", "You take some profit at TP1 and let the rest ride to TP2."], takeaway: "External Liquidity = old highs/lows (TP2). Internal Liquidity = nearby gaps (TP1)." }
    ]
  },
  {
    id: "ch3",
    title: "The ICT Toolbox",
    color: "#F59E0B",
    icon: "🧰",
    description: "Learn every ICT tool — Market Structure, MSS, FVG, Liquidity Sweeps, OTE, Premium/Discount, and Displacement.",
    lessons: [
      { id: "ch3-1", title: "Market Structure — Highs, Lows, Trends", paragraphs: ["Market structure means: is price making higher highs and higher lows (uptrend), or lower highs and lower lows (downtrend)?", "In an uptrend, price goes up, pulls back, then goes up even higher. Like climbing stairs.", "In a downtrend, it's the opposite — like going downstairs.", "Only buy in an uptrend and only sell in a downtrend. Follow the trend, not your feelings."], takeaway: "Uptrend = higher highs + higher lows (buy). Downtrend = lower highs + lower lows (sell)." },
      { id: "ch3-2", title: "Market Structure Shift (MSS)", chartImage: "chart-mss.png", paragraphs: ["An MSS is when the trend changes direction — like a U-turn sign.", "Bullish MSS: price breaks above a recent swing high and closes above it. Time to look for buys.", "Bearish MSS: price breaks below a recent swing low and closes below it. Time to look for sells.", "The candle must CLOSE beyond the level — not just poke through it. Wait for the full close."], takeaway: "MSS = trend changed direction. Wait for the candle to CLOSE beyond the level." },
      { id: "ch3-3", title: "Fair Value Gap (FVG)", chartImage: "chart-fvg.png", paragraphs: ["An FVG is a gap left on the chart when price moves too fast. Price usually comes back to fill it.", "Look at three consecutive candles. The gap between candle 1 and candle 3 wicks is the FVG.", "Bullish FVG: place a buy order at the gap. Bearish FVG: sell when price fills the gap.", "Best FVGs appear right after a liquidity sweep and MSS, on the 15-minute or 5-minute chart."], takeaway: "FVG = a price gap from a fast move. Price usually fills it. This is where you enter." },
      { id: "ch3-4", title: "Liquidity Sweep — The Fake-Out", chartImage: "chart-liquidity-sweep.png", paragraphs: ["A liquidity sweep is when price quickly pokes past a high or low to grab stop-losses, then reverses.", "When price sweeps BELOW a low, Smart Money uses those sells to buy. Then price shoots up.", "When price sweeps ABOVE a high, the opposite happens — it grabs stops, then drops.", "The sweep is step 2 in our entry checklist. Wait for the fake-out BEFORE entering."], takeaway: "A sweep grabs stop-losses, then price reverses. Always wait for the sweep BEFORE entering." },
      { id: "ch3-5", title: "Optimal Trade Entry (OTE)", chartImage: "chart-ote.png", paragraphs: ["The OTE is the sweet spot to enter — the 62% to 79% Fibonacci retracement zone.", "After a sweep and MSS, price pulls back. The OTE zone tells you how far it'll pull back.", "If your FVG lines up with this zone, you have a very high-probability entry.", "Draw a Fibonacci from swing low to high (bullish) or high to low (bearish). The 0.62-0.79 zone is OTE."], takeaway: "OTE = the 62-79% Fibonacci zone. An FVG in the OTE zone is the best possible entry." },
      { id: "ch3-6", title: "Premium vs Discount", paragraphs: ["Premium = above the 50% level of a range (expensive). Discount = below 50% (cheap).", "In Premium, look to SELL. In Discount, look to BUY. Like shopping — buy on sale!", "The Discount zone includes the OTE zone for buy trades. Premium includes OTE for sells.", "This alignment dramatically increases your odds of a winning trade."], takeaway: "Premium = above 50% (sell zone). Discount = below 50% (buy zone)." },
      { id: "ch3-7", title: "Displacement — The Power Candle", paragraphs: ["Displacement is a big, aggressive candle that shows Smart Money is involved.", "Characteristics: large bodies, very small wicks, multiple candles in the same direction.", "Displacement confirms the MSS is real. Without it, the move might be a fake-out.", "In our checklist: 'The Shift: 5-min MSS with Displacement.' You need BOTH."], takeaway: "Displacement = big, aggressive candles. An MSS with displacement is a strong signal." }
    ]
  },
  {
    id: "ch4",
    title: "When to Trade",
    color: "#06B6D4",
    icon: "⏰",
    description: "Timing is everything. Learn the best times to trade NQ and when to stay away.",
    lessons: [
      { id: "ch4-1", title: "Why Time Matters in Trading", paragraphs: ["Not all hours are equal. The market has certain times when setups work reliably.", "Big institutions are most active during specific sessions. When they're trading, the market moves with purpose.", "Most of your profits will come from just 2-3 hours of focused trading per day.", "The best times to trade are called 'Kill Zones.'"], takeaway: "Trading only during Kill Zones is one of the biggest advantages you can give yourself." },
      { id: "ch4-2", title: "London Kill Zone (2-5 AM EST)", chartImage: "chart-killzone.png", paragraphs: ["The London Kill Zone runs from 2-5 AM Eastern Time. European banks and institutions start their day.", "You'll often see the first liquidity sweep of the day — price sweeps the Asian session high or low.", "London is best for Conservative entries — cleaner, more structured moves.", "If you're in the U.S., this means waking up very early. Many traders skip it for NY sessions."], takeaway: "London Kill Zone: 2-5 AM EST. European banks set the day's direction." },
      { id: "ch4-3", title: "NY Open Kill Zone (9:30-10 AM EST)", paragraphs: ["NY Open runs from 9:30-10 AM Eastern. U.S. stock market opens, volume spikes.", "Price often makes a fake move right at 9:30 AM, then reverses sharply.", "The 9:30 AM opening candle is very important — watch for sweeps of its high or low.", "Moves are fast. Many traders prefer the Silver Bullet window for calmer setups."], takeaway: "NY Open: 9:30-10 AM EST. Fast, volatile moves. Be ready or wait for Silver Bullet." },
      { id: "ch4-4", title: "Silver Bullet Window (10-11 AM EST)", paragraphs: ["The Silver Bullet Window is 10-11 AM Eastern. The BEST time to trade NQ.", "By 10 AM, the chaos of the NY Open has settled. Smart Money has shown their hand.", "The Silver Bullet setup is our 'Aggressive Entry' — 4 steps on the 1-minute chart.", "Many successful NQ traders trade ONLY during this window."], takeaway: "Silver Bullet: 10-11 AM EST. The most reliable NQ trading window." },
      { id: "ch4-5", title: "When NOT to Trade", paragraphs: ["Red Folder News: Events like NFP and FOMC cause wild, unpredictable swings. Don't trade within 5 minutes of these.", "Fridays: The market tends to be choppy. Many traders reduce size or skip Fridays.", "Low-Volume Days: Holidays have random, erratic price movement. Just stay out.", "Preserving capital is more important than finding trades."], takeaway: "Don't trade during Red Folder news, be cautious on Fridays, skip holidays." }
    ]
  },
  {
    id: "ch5",
    title: "Your Trading Plan Step-by-Step",
    color: "#EC4899",
    icon: "📋",
    description: "The complete trading plan — Conservative Entry (6 steps), Aggressive Entry (Silver Bullet), stop losses, and targets.",
    lessons: [
      { id: "ch5-1", title: "The Top-Down Approach", paragraphs: ["Always start on the big charts and work down. Never start on the 5-minute chart!", "Daily chart: What's the overall trend? This gives you your BIAS.", "1-Hour chart: Does it agree with the Daily?", "15-min and 5-min: Where is my entry? Has there been a sweep? Is there an MSS?"], takeaway: "Start big (Daily), zoom in (1H → 15m → 5m). Never trade against the big picture." },
      { id: "ch5-2", title: "Conservative Entry — All 6 Steps", chartImage: "chart-conservative-entry.png", paragraphs: ["The Conservative Entry has 6 checkpoints that must ALL be met.", "Steps 1-2: Bias Check (1H direction) and The Sweep (15-min high/low taken out).", "Steps 3-4: The Shift (5-min MSS with displacement) and The Gap (FVG left behind).", "Steps 5-6: The Fib (OTE zone 62-79%) and The Trigger (Limit Order at FVG)."], takeaway: "All 6 steps must be checked. If ANY step is missing, skip the trade." },
      { id: "ch5-3", title: "Aggressive Entry (Silver Bullet)", chartImage: "chart-silver-bullet.png", paragraphs: ["The Aggressive Entry is used during the Silver Bullet window (10-11 AM EST). Only 4 steps.", "Step 1: Time Check (must be 10-11 AM). Step 2: Identify POI (clear high or low).", "Step 3: 1-Minute FVG Entry after the sweep. Step 4: Max 1% risk.", "Called 'aggressive' because fewer confirmations. Keep position size smaller."], takeaway: "Silver Bullet: 4 steps during 10-11 AM. Faster but riskier. Keep position small." },
      { id: "ch5-4", title: "Where to Put Your Stop Loss", paragraphs: ["A stop loss automatically closes your trade if price goes against you. EVERY trade must have one.", "For our setups, stop loss goes at the high/low of the MSS candle.", "LONG trade: stop below MSS candle low. SHORT trade: stop above MSS candle high.", "NEVER move it further from your entry — only tighter or to breakeven."], takeaway: "Stop loss at MSS candle high/low. Never move it wider. Every trade MUST have a stop loss." },
      { id: "ch5-5", title: "Setting Targets — TP1 and TP2", paragraphs: ["TP1 (first target): nearest high or low (Internal Liquidity). 1:1 or 1:2 reward.", "TP2 (main target): External Liquidity — an old high or low from a bigger timeframe.", "Take partial profit at TP1 (close half). Let the rest ride to TP2.", "After TP1, move stop loss to breakeven — the remaining position is risk-free."], takeaway: "TP1 = nearby target. TP2 = big target. Take partial profit at TP1, move stop to breakeven." },
      { id: "ch5-6", title: "Moving Stop to Breakeven", paragraphs: ["After TP1 is hit, move your stop loss to your entry price. Now you can't lose money on this trade.", "Sometimes price will stop you out at breakeven before hitting TP2. That's okay — it's the cost of eliminating risk.", "The rule is simple: ALWAYS move to breakeven after TP1. Don't get greedy.", "Consistency and capital preservation are more important than any single trade."], takeaway: "After TP1, move stop to breakeven. This makes the remaining position risk-free." }
    ]
  },
  {
    id: "ch6",
    title: "Risk Management & Prop Firm Rules",
    color: "#EF4444",
    icon: "🛡️",
    description: "The rules that keep you alive. Risk management, position sizing, and account limits.",
    lessons: [
      { id: "ch6-1", title: "Why Risk Management is More Important Than Entries", paragraphs: ["Your ENTRIES are not what make you profitable. Your RISK MANAGEMENT is.", "You could be right only 40% of the time and still make money — if winners are bigger than losers.", "The biggest reason traders fail is bad risk management: risking too much, no stop losses, revenge trading.", "Our plan's risk rules protect you from yourself. They're non-negotiable."], takeaway: "Risk management matters more than finding the perfect entry." },
      { id: "ch6-2", title: "The Risk-Per-Trade Rule", paragraphs: ["Never risk more than 0.5-1% of your account on a single trade.", "For a $100,000 account, that means $500-$1,000 max risk per trade.", "Even the best traders have 3-5 losses in a row. Small risk keeps you alive.", "The Risk Shield calculator does this math for you."], takeaway: "Risk 0.5-1% per trade max. This keeps you alive during losing streaks." },
      { id: "ch6-3", title: "Position Sizing — How Many Contracts", paragraphs: ["Contracts = Risk Amount ÷ (Stop Loss Points × Point Value).", "NQ: each point = $20. MNQ: each point = $2.", "ALWAYS calculate BEFORE placing the trade. Never guess.", "The Risk Shield page has a built-in calculator."], takeaway: "Contracts = Risk ÷ (Stop Points × Point Value). Always calculate BEFORE trading." },
      { id: "ch6-4", title: "Daily and Weekly Loss Limits", paragraphs: ["Max Daily Loss: 2%. If you lose this in a day, you're DONE for the day. Our app locks you out.", "Max Weekly Loss: 4%. Done until Monday.", "These limits match what most prop firms require.", "By practicing with our limits, you're training to pass any prop firm evaluation."], takeaway: "Max Daily Loss: 2% (lockout). Max Weekly Loss: 4%. These protect your account." },
      { id: "ch6-5", title: "What Happens When You Break the Rules", paragraphs: ["Hit the 2% daily limit: no new trades for 24 hours.", "Hit the 4% weekly limit: done until next week.", "On a prop firm, breaking rules means losing your funded account.", "Every blown account is a story of broken rules. Discipline = survival."], takeaway: "Breaking rules leads to lockout (app) or termination (prop firm). Discipline = survival." }
    ]
  },
  {
    id: "ch7",
    title: "Trading Psychology & Discipline",
    color: "#A855F7",
    icon: "🧠",
    description: "Your biggest enemy isn't the market — it's your own emotions. Learn to master your mind.",
    lessons: [
      { id: "ch7-1", title: "Why Most Traders Lose", paragraphs: ["About 90% of retail traders lose money — not because trading is impossible, but because they can't control emotions.", "The market triggers FOMO, anger, and overconfidence.", "Professional traders follow their plan no matter how they feel.", "Our app's routines and rules are guardrails against your own psychology."], takeaway: "90% of traders lose because of emotions. Follow your plan regardless of feelings." },
      { id: "ch7-2", title: "FOMO — Fear of Missing Out", paragraphs: ["FOMO: 'I NEED to get in NOW!' It happens when you see price moving without you.", "The market gives opportunities EVERY DAY. Missing one move is not a loss.", "FOMO leads to chasing entries, skipping your checklist, and oversizing.", "The cure: Follow your checklist mechanically. If all steps aren't met, there is no trade."], takeaway: "FOMO makes you chase bad entries. Follow your checklist. Missing a move is discipline, not a loss." },
      { id: "ch7-3", title: "Revenge Trading — The #1 Account Killer", paragraphs: ["Revenge trading: taking another trade immediately after a loss to 'win back' the money.", "It's driven by anger, not strategy. It's the fastest way to destroy an account.", "This is why we have the 2% daily loss limit and 24-hour lockout.", "After a loss, WALK AWAY. Close charts for at least 15-30 minutes."], takeaway: "Revenge trading = trying to win back losses. After a loss, walk away for 15+ minutes." },
      { id: "ch7-4", title: "The Morning Routine — Preparation Beats Prediction", paragraphs: ["Our morning routine: Drink water, 2-minute breathing exercise, check news calendar, set daily bias.", "The bias check is key — decide your direction BEFORE the session.", "Professional traders treat routines like athletes treat warm-ups.", "The routine puts you in the right headspace — calm, focused, ready."], takeaway: "Morning routine: hydrate, breathe, check news, set bias. Preparation is the foundation." },
      { id: "ch7-5", title: "Building a Trading Journal Habit", paragraphs: ["After every trade, write down what happened, why you took it, and how you felt.", "Our Smart Journal records entry criteria, results, and emotional state.", "Behavior Tags (FOMO, Chased, Disciplined, Greedy) help track emotional patterns.", "Review your journal every weekend. Your journal turns experience into data."], takeaway: "Journal every trade. Review weekly to find patterns and improve." }
    ]
  }
];

const GLOSSARY = [
  { term: "Candlestick", full: "Price Bar", color: "#00C896", definition: "A visual representation of price movement over a time period. Each candle shows 4 things: where price started (Open), the highest point (High), the lowest point (Low), and where price ended (Close). Green = price went up, Red = price went down.", tip: "Focus on the CLOSE of each candle — that's the most important part." },
  { term: "Timeframe", full: "Chart Period", color: "#818CF8", definition: "How much time each candle on your chart represents. Higher timeframes (Daily, 1H) show the big picture. Lower timeframes (15m, 5m, 1m) show the close-up details.", tip: "Start your analysis on the Daily chart, then work down to 1H, 15m, and 5m." },
  { term: "Bullish / Bearish", full: "Market Direction", color: "#00C896", definition: "Bullish means price is going UP. Bearish means price is going DOWN. A 'bull' charges upward. A 'bear' swipes downward. When you're bullish, you want to buy. When bearish, you want to sell.", tip: "Always check if the big chart (Daily/1H) is bullish or bearish before trading." },
  { term: "FVG", full: "Fair Value Gap", color: "#00C896", image: "chart-fvg.png", definition: "A gap left on the chart when price moves really fast. Picture three candles in a row — if there's a space between candle 1 and candle 3 that doesn't overlap, that's the gap. Price usually comes back to fill it, and that's where you enter your trade.", tip: "On NQ, a 15-minute FVG after a liquidity sweep is your best entry." },
  { term: "MSS", full: "Market Structure Shift", color: "#818CF8", image: "chart-mss.png", definition: "When price breaks past a recent high or low and closes beyond it, telling you the trend just flipped direction. Think of it like a U-turn sign — the market was going one way and now it's going the other.", tip: "Wait for the MSS candle to fully close — don't jump in early." },
  { term: "Liquidity Sweep", full: "Stop Hunt / Liquidity Grab", color: "#F59E0B", image: "chart-liquidity-sweep.png", definition: "When price quickly pokes above a high or below a low to grab everyone's stop-loss orders, then snaps back the other way. It's like a broom sweeping up money before the real move starts.", tip: "A sweep of the London session low followed by a bullish MSS on NQ is a great long setup." },
  { term: "OTE", full: "Optimal Trade Entry", color: "#EC4899", image: "chart-ote.png", definition: "The sweet spot to enter a trade — between 62% and 79% of a price swing. After a sweep and MSS, you want to enter in this zone for the best risk-to-reward.", tip: "Combine OTE with a FVG in the same zone for an even stronger entry." },
  { term: "Kill Zone", full: "High-Probability Trading Session", color: "#06B6D4", image: "chart-killzone.png", definition: "The best times of day to trade, when setups work most often: London Open (2-5 AM EST) and the Silver Bullet window (10-11 AM EST).", tip: "The Silver Bullet window (10-11 AM) is the most reliable time for NQ Futures." },
  { term: "Stop Loss", full: "Emergency Exit Order", color: "#EF4444", definition: "An automatic order that closes your trade if price goes against you. It limits your loss on any single trade. Think of it like a seatbelt — EVERY trade must have one.", tip: "Place your stop loss at the MSS candle high/low. Never move it further from entry." },
  { term: "Take Profit", full: "Profit Target Order", color: "#00C896", definition: "An order that automatically closes your trade when price reaches your target. We use TP1 (nearby target) and TP2 (big target). Take partial profit at TP1 and let the rest ride.", tip: "After TP1 is hit, always move your stop to breakeven." },
  { term: "Breakeven", full: "Zero-Loss Exit Point", color: "#F59E0B", definition: "Moving your stop loss to your entry price after TP1 is hit. If price comes back, you exit with zero loss instead of a full loss.", tip: "Always move to breakeven after TP1. Sometimes you'll miss TP2, but that's the cost of protecting capital." },
  { term: "Displacement", full: "Power Move / Strong Candle", color: "#A855F7", definition: "A big, aggressive candle showing Smart Money is behind the move. Displacement candles have large bodies, small wicks, and create Fair Value Gaps.", tip: "No displacement after MSS? The shift might be fake. Wait for those big, confident candles." },
  { term: "Premium / Discount", full: "Expensive vs Cheap Zone", color: "#EC4899", definition: "When you divide a price range at the 50% level: Premium is above 50% (expensive — sell here) and Discount is below 50% (cheap — buy here).", tip: "For buys, make sure your entry is in Discount. For sells, make sure it's in Premium." },
  { term: "Prop Firm", full: "Proprietary Trading Firm", color: "#06B6D4", definition: "A company that gives you their money to trade with. Pass an evaluation following strict rules, and they fund your account with $50K-$200K. You keep 80-90% of profits.", tip: "Focus on following the rules, not making money. Consistency gets you funded." },
  { term: "Position Size", full: "How Many Contracts to Trade", color: "#F59E0B", definition: "The number of contracts you trade, calculated from your risk: Contracts = Risk Amount ÷ (Stop Loss Points × Point Value). NQ = $20/point, MNQ = $2/point.", tip: "Use the Risk Shield calculator. Never guess — always do the math." },
  { term: "Drawdown", full: "How Much You've Lost", color: "#EF4444", definition: "The amount your account has dropped from its peak. Prop firms have strict drawdown limits — exceeding them means losing your funded account.", tip: "Track your daily and weekly drawdown carefully. Our Risk Shield page shows this in real-time." }
];

const QUIZ_BANK: QuizQuestion[] = [
  { difficulty: "easy", scenario: "What does FVG stand for in ICT trading?", options: ["Fast Volume Gain", "Fair Value Gap", "Forward Volatility Gauge", "Fibonacci Value Grid"], answer: 1, explanation: "FVG = Fair Value Gap. It's a gap left on the chart when price moves too fast. Price usually comes back to fill that gap — and that's where you enter your trade!" },
  { difficulty: "easy", scenario: "What is the Silver Bullet time window in EST?", options: ["8:00-9:00 AM", "10:00-11:00 AM", "2:00-3:00 PM", "12:00-1:00 PM"], answer: 1, explanation: "The Silver Bullet window is 10:00-11:00 AM EST. This is the prime ICT trading window for NQ — most consistent setups happen here!" },
  { difficulty: "easy", scenario: "What does MSS mean?", options: ["Moving Stop Strategy", "Market Structure Shift", "Margin Safety System", "Multiple Swing Setup"], answer: 1, explanation: "MSS = Market Structure Shift. It's when price breaks past a recent high or low, telling you the trend just changed direction — like a U-turn." },
  { difficulty: "easy", scenario: "In ICT, what is 'Premium' vs 'Discount'?", options: ["Price above/below the 50% level of a range", "High/low volume zones", "Pre-market/post-market sessions", "Bid/ask spread zones"], answer: 0, explanation: "Premium = above the 50% level (expensive zone — look to sell). Discount = below 50% (cheap zone — look to buy). Think of it like shopping — you buy on sale and sell when it's overpriced!" },
  { difficulty: "easy", scenario: "What is the max daily loss rule for prop firms in this plan?", options: ["1%", "2%", "5%", "10%"], answer: 1, explanation: "Max daily loss is 2%. If you hit it, the app locks you out for 24 hours. This is how you survive prop firm evaluations — protect your capital!" },
  { difficulty: "easy", scenario: "What does a GREEN candlestick mean?", options: ["Price went down", "Price stayed the same", "Price went up", "The market is closed"], answer: 2, explanation: "A green candle means price went UP — it closed higher than it opened. Red means price went down." },
  { difficulty: "easy", scenario: "What is a stop loss?", options: ["A type of candlestick pattern", "An automatic order that closes your trade to limit losses", "A strategy for entering trades", "A type of chart"], answer: 1, explanation: "A stop loss is your emergency exit. It automatically closes your trade if price goes against you past a certain point. EVERY trade must have one." },
  { difficulty: "easy", scenario: "What is a prop firm?", options: ["A company that sells trading software", "A type of chart pattern", "A company that gives you their money to trade with", "A government trading agency"], answer: 2, explanation: "A prop firm gives you their capital to trade with. You pass an evaluation by following strict rules, then trade with $50K-$200K of their money and keep 80-90% of profits!" },
  { difficulty: "easy", scenario: "What is the 'top-down approach' in ICT?", options: ["Trading from the bottom of the chart up", "Starting analysis on big timeframes and working down to small ones", "Only looking at the 1-minute chart", "Trading during the first hour of the day"], answer: 1, explanation: "Top-down means you start with the big picture (Daily chart), then zoom into 1H, 15m, and 5m." },
  { difficulty: "easy", scenario: "How much is one point of NQ (Nasdaq-100 E-mini Futures) worth?", options: ["$2", "$5", "$10", "$20"], answer: 3, explanation: "One point of NQ = $20. The mini version (MNQ) = $2 per point. Beginners should start with MNQ." },
  { difficulty: "medium", scenario: "NQ sweeps the 9:00 AM candle low, then immediately breaks back above the 9:00 AM high with a full candle close. What should you do next?", options: ["Enter long immediately at market price", "Wait for a 15-minute FVG to form, then buy into the gap", "Short because the low was already swept", "Skip — no valid setup here"], answer: 1, explanation: "The market faked everyone out by going down first (sweep), then slammed back up (MSS). Now you wait for it to come back down a little to a 'price gap' (FVG) and that's your entry!" },
  { difficulty: "medium", scenario: "NQ is clearly above the daily 50% level — it's in Premium. Price creates a bearish FVG on the 15-minute chart. What do you do?", options: ["Buy — the FVG is bullish", "Wait for price to fill the FVG from below, then look for a short", "Ignore FVGs in premium — they don't matter", "Only trade if it's a Monday"], answer: 1, explanation: "When prices are expensive (Premium), you want to SELL, not buy. The FVG is like a ceiling — when price comes back up to touch it, that's your chance to short." },
  { difficulty: "medium", scenario: "ForexFactory shows NFP (Non-Farm Payrolls) news at 8:30 AM with a red folder icon. When should you trade NQ today?", options: ["Right at 8:30 AM — biggest moves happen then", "At 9:00 AM before the NY open", "Wait until 10:00 AM after volatility settles", "Don't trade at all — red folder = no trading ever"], answer: 2, explanation: "Red folder news is like a tornado warning — you don't go outside! Wait until the storm passes. By 10 AM, the dust has settled and you can see the real direction." },
  { difficulty: "medium", scenario: "NQ is in a clear downtrend. Price sweeps above yesterday's high, then breaks a recent swing low. Where's your entry?", options: ["Short as soon as the high is swept", "Short after the swing low break, ideally inside the bearish FVG", "Long because price went up first", "Wait for 3 more confirmations"], answer: 1, explanation: "The market tricked the buyers (swept their stops above the high), then showed it really wants to go DOWN (MSS). Short inside the FVG it left behind." },
  { difficulty: "medium", scenario: "You enter a long trade on NQ and TP1 is hit. What should you do with your stop loss?", options: ["Keep it where it is", "Move it to breakeven", "Remove it entirely", "Widen it by 50%"], answer: 1, explanation: "Once TP1 is hit, you move your stop loss to breakeven. This way you're in a risk-free trade while letting the remaining position run to TP2 (external liquidity)." },
  { difficulty: "medium", scenario: "You're about to enter a trade. Your Entry Criteria checklist shows 4/6 items checked. Can you log this trade?", options: ["Yes — 4 out of 6 is good enough", "No — all 6 criteria must be checked", "Only if it's during the Silver Bullet window", "Yes, but only as a draft"], answer: 1, explanation: "ALL entry criteria must be checked before logging a trade. The app enforces this to keep your trading mechanical and disciplined. No shortcuts!" },
  { difficulty: "medium", scenario: "Your account is $100,000. You want to risk 0.5% with a 20-point stop loss on NQ ($20/point). How many contracts can you trade?", options: ["1 contract", "2 contracts", "5 contracts", "10 contracts"], answer: 0, explanation: "Risk = $100,000 x 0.5% = $500. Stop loss cost = 20 points x $20/point = $400 per contract. $500 / $400 = 1.25, so you round down to 1 NQ contract." },
  { difficulty: "medium", scenario: "You've had 2 losing trades today totaling 1.8% loss. You see a perfect setup. What do you do?", options: ["Take it — you need to win back your losses", "Take it but with half size since you're close to the 2% limit", "Skip it — one more loss could put you over the 2% daily limit", "Take it with double size to recover faster"], answer: 2, explanation: "At 1.8% daily loss, one more losing trade could push you past the 2% limit. The smart move is to stop trading for the day." },
  { difficulty: "medium", scenario: "The Daily chart shows a clear uptrend, but the 5-minute chart shows a bearish MSS. Should you short?", options: ["Yes — the 5-minute MSS is a clear signal", "No — never trade against the Daily timeframe direction", "Yes — but only with half position size", "Only if it's during the Kill Zone"], answer: 1, explanation: "The top-down rule says you NEVER trade against the higher timeframe. If the Daily is bullish, you only look for buys on the lower timeframes." },
  { difficulty: "medium", scenario: "What is displacement in ICT trading?", options: ["A slow, gradual price movement", "Big, aggressive candles showing Smart Money involvement", "When price moves sideways for a long time", "The distance between two moving averages"], answer: 1, explanation: "Displacement = big, fast, aggressive candles with large bodies and small wicks. It shows Smart Money is behind the move." },
  { difficulty: "hard", scenario: "It's 10:22 AM EST. NQ sweeps above the 9:30 AM opening high, then drops back through it and forms a bearish FVG on the 1-minute chart. What setup is this?", options: ["A failed breakout — avoid trading", "A perfect Silver Bullet short setup", "A buy signal because price went up first", "Too late in the day to trade"], answer: 1, explanation: "It's the Silver Bullet window (10-11 AM)! NQ went up to steal the stops above the opening high (sweep), then came back down (MSS) and left a 1-minute FVG. This is the aggressive Silver Bullet short entry!" },
  { difficulty: "hard", scenario: "NQ shows a bullish MSS on the 5-minute chart, but the 1-Hour is in a bearish trend. The Fibonacci shows the entry is at the 55% retracement level. Should you take this trade?", options: ["Yes — the 5-minute MSS is enough confirmation", "No — the entry is NOT in the OTE zone (62%-79%)", "Yes — but only with half size", "No — because 5-minute and 1-hour disagree, AND it's not at OTE"], answer: 3, explanation: "Two problems here: 1) The 5-minute is bullish but 1-Hour is bearish — timeframes disagree (Top-Down rule violated). 2) The 55% level is NOT in the OTE zone (62%-79%). Both conditions fail." },
  { difficulty: "hard", scenario: "NQ sweeps sell-side liquidity at 10:05 AM, creates a bullish MSS on the 5-minute with displacement, and leaves a FVG. The FVG is at the 71% Fibonacci retracement. The 1-Hour shows a bullish bias. How many Conservative Entry criteria does this meet?", options: ["3 out of 6", "4 out of 6", "5 out of 6", "All 6 — it's a textbook setup"], answer: 2, explanation: "Let's check: 1) Bias Check (1H bullish). 2) The Sweep (sell-side liquidity swept). 3) The Shift (5-min MSS with displacement). 4) The Gap (FVG identified). 5) The Fib (71% is in the OTE zone). That's 5/6 — you still need to place the limit order at the FVG (The Trigger)." },
  { difficulty: "hard", scenario: "You're in a long trade on NQ. Price hits TP1 (internal liquidity) at a 1:2 ratio. You move SL to breakeven. Price then pulls back, touches your breakeven SL, and reverses to hit TP2. What happened?", options: ["You were stopped out at breakeven — no loss but missed TP2", "You still got TP2 because the SL is only mental", "You lost money because the pullback went below entry", "The trailing stop automatically moved to TP1"], answer: 0, explanation: "Once the SL is at breakeven and price touches it, you're out — zero loss, but you missed the run to TP2." },
  { difficulty: "hard", scenario: "NQ is in a clear downtrend on the Daily. Price retraces to the 75% Fibonacci level and creates a bearish FVG on the 15-minute chart during the London Kill Zone (3:00 AM EST). The 5-minute shows a bearish MSS. Is this a valid Conservative short entry?", options: ["No — London Kill Zone doesn't count for NQ", "No — Conservative entries require the Silver Bullet window", "Yes — all 6 Conservative Entry criteria are met", "Yes — but with only half position size"], answer: 2, explanation: "All 6 criteria met: Bias (Daily bearish), Sweep (retrace to premium), Shift (5-min bearish MSS), Gap (15-min FVG), Fib (75% in OTE), Trigger (place limit at FVG). London Kill Zone is valid for Conservative entries." },
  { difficulty: "hard", scenario: "A trader risks 3% per trade and has 3 consecutive losses. What percentage of their account have they lost, and what's wrong with their approach?", options: ["9% lost — risk is too high per trade", "3% lost — consecutive losses are normal", "6% lost — they should revenge trade to recover", "9% lost — but they should double their next trade to recover"], answer: 0, explanation: "3% x 3 trades = roughly 9% drawdown. At 0.5% risk, 3 losses = only 1.5%. Risking 3% per trade means a short losing streak can end your career." },
  { difficulty: "hard", scenario: "It's 10:15 AM. NQ sweeps above a clear 15-minute high, shows a bearish MSS on the 5-minute with displacement, and creates an FVG at the 68% Fibonacci level. The 1-Hour is bearish. But you just had a losing trade and feel frustrated. What should you do?", options: ["Take it — all criteria are met, emotions don't matter", "Skip it — never trade when emotional, even with a perfect setup", "Take it with half size as a compromise", "Take it and use a wider stop to feel safer"], answer: 1, explanation: "Even though all criteria are met, trading while emotional is one of the biggest mistakes. Frustration leads to poor execution. Walk away, cool down, and trade the next setup with a clear head." },
  { difficulty: "hard", scenario: "You've been trading for a month. Your journal shows: 60% win rate, average winner $300, average loser $250. You notice most losses are tagged 'FOMO.' What should you focus on improving?", options: ["Finding better entries to increase win rate to 80%", "Increasing position size to make more per win", "Eliminating FOMO trades — they're dragging down your stats", "Nothing — 60% win rate is already great"], answer: 2, explanation: "Your stats are good. But the FOMO tag pattern reveals the weak link. Eliminating FOMO trades will improve your win rate and profit factor even more." },
  { difficulty: "hard", scenario: "NQ creates a bullish FVG on the 15-minute chart during the London Kill Zone. The Daily is bullish, 1H is bullish. But there was NO liquidity sweep before the MSS. Should you take the Conservative entry?", options: ["Yes — the bias and FVG are enough", "No — Step 2 (The Sweep) is missing. Skip the trade.", "Yes — but use the Aggressive entry instead", "Take it on the 1-minute chart to reduce risk"], answer: 1, explanation: "The Conservative entry requires ALL 6 steps. Step 2 (The Sweep) is missing. Without the sweep, there's no liquidity fuel for the move. Skip and wait for a complete setup." },
  { difficulty: "hard", scenario: "You're managing two MNQ contracts. TP1 (internal liquidity) is hit at 1:2 reward-to-risk. What's the best way to manage the position from here?", options: ["Close both contracts at TP1", "Close 1 contract at TP1, move SL to breakeven on the remaining contract, target TP2", "Keep both contracts open and move SL to breakeven", "Close 1 contract and widen the stop on the remaining contract"], answer: 1, explanation: "Take partial profit (1 contract) at TP1, move stop to breakeven on the remaining contract (risk-free), and let it ride to TP2. This balances taking profit with letting winners run." },
];

const PLAN_SECTIONS = [
  {
    title: "The Tools",
    color: "#00C896",
    icon: "wrench",
    items: [
      { label: "MSS (Market Structure Shift)", desc: "Our signal that the trend has changed direction." },
      { label: "FVG (Fair Value Gap)", desc: "A price gap on the chart — this is where we enter trades." },
      { label: "Liquidity", desc: "Old highs and lows where stop losses are sitting — our targets." },
      { label: "Premium vs. Discount", desc: "Is price expensive (Premium = sell) or cheap (Discount = buy)?" },
      { label: "Kill Zones", desc: "The best times to trade: London (2–5 AM EST) and Silver Bullet (10–11 AM EST)." },
    ],
  },
  {
    title: "Timeframe Alignment (Matching Big and Small Charts)",
    color: "#818CF8",
    icon: "layers",
    items: [
      { label: "HTF (Big Picture): Daily & 1-Hour", desc: "Find where price is heading — which direction is the market going?" },
      { label: "LTF (Close-Up): 15-Min & 5-Min", desc: "Find the MSS (Market Structure Shift) and the FVG (Fair Value Gap) entry." },
    ],
  },
  {
    title: "Conservative Entry",
    color: "#00C896",
    icon: "shield",
    image: "chart-conservative-entry.png",
    items: [
      { label: "1. Bias Check", desc: "Is the 1-Hour chart going up (Bullish) or down (Bearish)?" },
      { label: "2. The Sweep", desc: "Wait for price to take out a 15-min high or low." },
      { label: "3. The Shift (MSS)", desc: "Wait for a 5-min MSS (Market Structure Shift) — a fast, strong move." },
      { label: "4. The Gap (FVG)", desc: "Find the FVG (Fair Value Gap) that was left behind." },
      { label: "5. The Fib — OTE (Optimal Trade Entry)", desc: "Make sure your entry is in the sweet spot — Discount (buys) or Premium (sells)." },
      { label: "6. The Trigger", desc: "Place a Limit Order at the start of the FVG." },
    ],
  },
  {
    title: "Aggressive Entry (Silver Bullet)",
    color: "#F59E0B",
    icon: "zap",
    image: "chart-silver-bullet.png",
    items: [
      { label: "Time Check", desc: "It must be between 10:00 AM and 11:00 AM EST." },
      { label: "Identify POI", desc: "Price must be heading toward a clear high or low." },
      { label: "The Gap (FVG)", desc: "Enter at the first 1-min FVG (Fair Value Gap) after a liquidity grab." },
      { label: "Risk", desc: "Don't risk more than 1% on this trade." },
    ],
  },
  {
    title: "Exit Criteria",
    color: "#06B6D4",
    icon: "log-out",
    image: "chart-exit-criteria.png",
    items: [
      { label: "Stop Loss", desc: "Place it at the high/low of the candle that created the MSS (Market Structure Shift)." },
      { label: "TP1 (First Target)", desc: "The next nearby high or low (1:1 or 1:2 reward ratio)." },
      { label: "TP2 (Main Target)", desc: "External Liquidity — the big target where the move should end." },
      { label: "Trailing", desc: "Move your stop loss to breakeven once TP1 is hit — now it's a free trade!" },
    ],
  },
  {
    title: "Prop Firm Survival Rules",
    color: "#EF4444",
    icon: "alert-triangle",
    items: [
      { label: "Max Daily Loss", desc: "2% — if you lose this much, the app stops you for 24 hours." },
      { label: "Max Weekly Loss", desc: "4% — your weekly safety limit." },
      { label: "News Rule", desc: "Don't trade within 5 minutes before or after Red Folder news events." },
    ],
  },
  {
    title: "Key Takeaways",
    color: "#EC4899",
    icon: "lightbulb",
    items: [
      { label: "Top-Down", desc: "Always start with the big chart (Daily). If it's going down, don't try to buy on the small chart." },
      { label: "Patience", desc: "If price doesn't come to your FVG (Fair Value Gap), there is no trade. Wait." },
      { label: "Discipline", desc: "Following this plan is how you get funded. Breaking it keeps you stuck." },
    ],
  },
];

const DIFFICULTY_COLORS: Record<Difficulty, string> = { easy: "#00C896", medium: "#F59E0B", hard: "#EF4444" };
const DIFFICULTY_LABELS: Record<Difficulty, string> = { easy: "Beginner", medium: "Intermediate", hard: "Advanced" };
const DIFFICULTY_ICONS: Record<Difficulty, string> = { easy: "🌱", medium: "⚡", hard: "💀" };
const TOTAL_QUIZ_QUESTIONS = 15;
const TIER_ORDER: Difficulty[] = ["easy", "medium", "hard"];

function getImageUrl(filename: string): string {
  const base = import.meta.env.BASE_URL;
  return `${base}images/${filename}`;
}

function getApiUrl(): string {
  return "/api/";
}

function pickQuestion(diff: Difficulty, used: Set<number>): { q: QuizQuestion; idx: number } | null {
  const tierQuestions = QUIZ_BANK
    .map((q, idx) => ({ q, idx }))
    .filter(({ q, idx }) => q.difficulty === diff && !used.has(idx));
  if (tierQuestions.length > 0) {
    return tierQuestions[Math.floor(Math.random() * tierQuestions.length)];
  }
  const diffIdx = TIER_ORDER.indexOf(diff);
  for (let i = diffIdx + 1; i < TIER_ORDER.length; i++) {
    const harder = QUIZ_BANK
      .map((q, idx) => ({ q, idx }))
      .filter(({ q, idx }) => q.difficulty === TIER_ORDER[i] && !used.has(idx));
    if (harder.length > 0) return harder[Math.floor(Math.random() * harder.length)];
  }
  for (let i = diffIdx - 1; i >= 0; i--) {
    const easier = QUIZ_BANK
      .map((q, idx) => ({ q, idx }))
      .filter(({ q, idx }) => q.difficulty === TIER_ORDER[i] && !used.has(idx));
    if (easier.length > 0) return easier[Math.floor(Math.random() * easier.length)];
  }
  return null;
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ChevronUp({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
      <path d="m21.854 2.147-10.94 10.939" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function MessageSquareIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function LoaderIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function LearnView() {
  const [expandedChapter, setExpandedChapter] = useState<string | null>("ch1");
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("ict-academy-progress");
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch { return new Set<string>(); }
  });

  function toggleComplete(lessonId: string) {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId); else next.add(lessonId);
      localStorage.setItem("ict-academy-progress", JSON.stringify([...next]));
      return next;
    });
  }

  const totalLessons = COURSE_CHAPTERS.reduce((sum, ch) => sum + ch.lessons.length, 0);
  const completedCount = COURSE_CHAPTERS.reduce(
    (sum, ch) => sum + ch.lessons.filter(l => completed.has(l.id)).length, 0
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">ICT Trading Course</h2>
          <p className="text-sm text-[#8B8BA0]">Learn everything from zero — no trading experience needed</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[#00C896]">{completedCount}/{totalLessons}</div>
          <div className="text-xs text-[#8B8BA0]">lessons done</div>
        </div>
      </div>

      <div className="h-1.5 bg-[#1E1E2E] rounded-full mb-6 overflow-hidden">
        <div className="h-full bg-[#00C896] rounded-full transition-all duration-500"
          style={{ width: `${totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0}%` }} />
      </div>

      <div className="space-y-4">
        {COURSE_CHAPTERS.map((chapter, chIdx) => {
          const isChOpen = expandedChapter === chapter.id;
          const chDone = chapter.lessons.filter(l => completed.has(l.id)).length;
          return (
            <div key={chapter.id} className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#12121A", borderColor: "#1E1E2E" }}>
              <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-[#1A1A24] transition-colors"
                onClick={() => setExpandedChapter(isChOpen ? null : chapter.id)}>
                <span className="text-2xl">{chapter.icon}</span>
                <div className="flex-1">
                  <div className="text-xs text-[#8B8BA0] font-semibold">Chapter {chIdx + 1}</div>
                  <div className="text-base font-bold text-white">{chapter.title}</div>
                  <div className="text-xs text-[#55556A] mt-0.5">{chapter.description}</div>
                </div>
                <div className="text-sm font-semibold" style={{ color: chDone === chapter.lessons.length && chDone > 0 ? "#00C896" : "#8B8BA0" }}>{chDone}/{chapter.lessons.length}</div>
                {isChOpen ? <ChevronUp className="text-[#8B8BA0]" /> : <ChevronDown className="text-[#8B8BA0]" />}
              </div>

              {isChOpen && (
                <div className="border-t" style={{ borderColor: "#1E1E2E" }}>
                  {chapter.lessons.map((lesson, lIdx) => {
                    const isLessonOpen = expandedLesson === lesson.id;
                    const isDone = completed.has(lesson.id);
                    return (
                      <div key={lesson.id} className="border-b last:border-b-0" style={{ borderColor: "#1E1E2E" }}>
                        <div className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#1A1A24] transition-colors cursor-pointer"
                          onClick={() => setExpandedLesson(isLessonOpen ? null : lesson.id)}>
                          <div className="shrink-0 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleComplete(lesson.id); }}>
                            {isDone ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00C896" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#55556A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>
                            )}
                          </div>
                          <span className="text-sm text-[#8B8BA0] font-mono w-6">{lIdx + 1}.</span>
                          <span className={`flex-1 text-sm font-medium ${isDone ? "text-[#55556A] line-through" : "text-white"}`}>{lesson.title}</span>
                          {isLessonOpen ? <ChevronUp className="text-[#8B8BA0]" /> : <ChevronDown className="text-[#8B8BA0]" />}
                        </div>

                        {isLessonOpen && (
                          <div className="px-4 pb-5 pt-2 ml-14">
                            <div className="space-y-3">
                              {lesson.paragraphs.map((p, i) => (
                                <p key={i} className="text-sm text-[#C0C0D0] leading-relaxed">{p}</p>
                              ))}
                            </div>
                            {lesson.chartImage && (
                              <img src={getImageUrl(lesson.chartImage)} alt={`${lesson.title} chart`} className="w-full h-48 object-cover rounded-lg mt-4" />
                            )}
                            <div className="mt-4 rounded-lg p-3 border" style={{ backgroundColor: "#00C89610", borderColor: "#00C89630" }}>
                              <p className="text-xs font-bold text-[#00C896] mb-1">Key Takeaway</p>
                              <p className="text-sm text-[#C0C0D0] leading-relaxed">{lesson.takeaway}</p>
                            </div>
                            {!isDone && (
                              <button className="mt-3 bg-[#00C896] text-[#0A0A0F] text-sm font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                                onClick={() => toggleComplete(lesson.id)}>
                                Mark as Complete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GlossaryView() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold text-white mb-1">ICT Concepts</h2>
      <p className="text-sm text-[#8B8BA0] mb-6">Click any term for the full definition + trader tip</p>
      <div className="grid gap-3">
        {GLOSSARY.map((item) => {
          const isOpen = expanded === item.term;
          return (
            <div
              key={item.term}
              className="rounded-xl border overflow-hidden transition-colors cursor-pointer"
              style={{
                backgroundColor: "#12121A",
                borderColor: isOpen ? item.color : "#1E1E2E",
              }}
              onClick={() => setExpanded(isOpen ? null : item.term)}
            >
              <div className="flex items-center gap-3 p-4">
                <span
                  className="px-3 py-1 rounded-lg text-sm font-bold"
                  style={{ backgroundColor: item.color + "22", color: item.color }}
                >
                  {item.term}
                </span>
                <span className="flex-1 text-sm text-[#8B8BA0] font-medium">{item.full}</span>
                {isOpen ? <ChevronUp className="text-[#8B8BA0]" /> : <ChevronDown className="text-[#8B8BA0]" />}
              </div>
              {isOpen && (
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-sm text-white leading-relaxed">{item.definition}</p>
                  {"image" in item && item.image && (
                    <img
                      src={getImageUrl(item.image)}
                      alt={`${item.term} chart`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}
                  <div
                    className="border-l-3 pl-3 py-1"
                    style={{ borderLeftColor: item.color }}
                  >
                    <p className="text-xs font-bold mb-1" style={{ color: item.color }}>NQ Tip</p>
                    <p className="text-sm text-[#8B8BA0] leading-relaxed">{item.tip}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuizView() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [answered, setAnswered] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [diffScore, setDiffScore] = useState(0);
  const [done, setDone] = useState(false);
  const [usedIndices, setUsedIndices] = useState<Set<number>>(new Set());
  const [activeQuestion, setActiveQuestion] = useState<{ q: QuizQuestion; idx: number } | null>(
    () => pickQuestion("medium", new Set())
  );

  const q = activeQuestion?.q ?? null;
  const isCorrect = q ? selected === q.answer : false;

  function diffPoints(d: Difficulty): number {
    return d === "easy" ? 1 : d === "medium" ? 2 : 3;
  }

  function handleSelect(idx: number) {
    if (selected !== null || !q || !activeQuestion) return;
    setSelected(idx);
    const pts = diffPoints(q.difficulty);
    setMaxScore((s) => s + pts);
    const correct = idx === q.answer;
    if (correct) {
      setScore((s) => s + pts);
      setDiffScore((s) => s + 1);
    } else {
      setDiffScore((s) => Math.max(0, s - 1));
    }
  }

  function handleNext() {
    if (!activeQuestion) return;
    const newUsed = new Set(usedIndices);
    newUsed.add(activeQuestion.idx);
    setUsedIndices(newUsed);

    if (answered + 1 >= TOTAL_QUIZ_QUESTIONS) {
      setDone(true);
      return;
    }
    let nextDiff = difficulty;
    if (isCorrect) {
      if (diffScore >= 2 && difficulty !== "hard") {
        nextDiff = difficulty === "easy" ? "medium" : "hard";
        setDiffScore(0);
      }
    } else {
      if (difficulty !== "easy") {
        nextDiff = difficulty === "hard" ? "medium" : "easy";
        setDiffScore(0);
      }
    }
    setDifficulty(nextDiff);
    setAnswered((a) => a + 1);
    setSelected(null);
    setActiveQuestion(pickQuestion(nextDiff, newUsed));
  }

  function handleReset() {
    setDifficulty("medium");
    setAnswered(0);
    setSelected(null);
    setScore(0);
    setMaxScore(0);
    setDiffScore(0);
    setDone(false);
    const emptySet = new Set<number>();
    setUsedIndices(emptySet);
    setActiveQuestion(pickQuestion("medium", emptySet));
  }

  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  if (done) {
    return (
      <div className="p-6 max-w-2xl mx-auto flex justify-center">
        <div className="bg-[#12121A] rounded-2xl border border-[#1E1E2E] p-8 text-center w-full max-w-md">
          <div className="text-5xl mb-4">{pct >= 70 ? "🏆" : pct >= 40 ? "📈" : "📚"}</div>
          <div className="text-5xl font-bold text-white">{score}/{maxScore}</div>
          <div className="text-xl font-semibold text-[#00C896] mt-1 mb-3">{pct}%</div>
          <p className="text-sm text-[#8B8BA0] leading-relaxed mb-2">
            {pct >= 70 ? "ICT Concept Master! You dominated the adaptive quiz." : pct >= 40 ? "Good progress — the quiz adjusted to your level. Review and retry!" : "Keep studying — review the glossary and plan, then try again!"}
          </p>
          <p className="text-xs text-[#55556A] mb-6">Scoring: Easy = 1pt, Medium = 2pts, Hard = 3pts</p>
          <button
            className="bg-[#00C896] text-[#0A0A0F] font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
            onClick={handleReset}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <p className="text-white mb-4">No more questions available!</p>
        <button
          className="bg-[#00C896] text-[#0A0A0F] font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
          onClick={handleReset}
        >
          Start Over
        </button>
      </div>
    );
  }

  const diffColor = DIFFICULTY_COLORS[q.difficulty];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-[#8B8BA0]">Question {answered + 1} of {TOTAL_QUIZ_QUESTIONS}</span>
        <span className="text-sm font-semibold text-[#00C896]">Score: {score}</span>
      </div>
      <div className="h-1 bg-[#1E1E2E] rounded-full mb-4 overflow-hidden">
        <div
          className="h-1 bg-[#00C896] rounded-full transition-all duration-300"
          style={{ width: `${(answered / TOTAL_QUIZ_QUESTIONS) * 100}%` }}
        />
      </div>

      <div className="mb-3">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border"
          style={{ backgroundColor: diffColor + "20", borderColor: diffColor, color: diffColor }}
        >
          {DIFFICULTY_ICONS[q.difficulty]} {DIFFICULTY_LABELS[q.difficulty]}
        </span>
      </div>

      <div className="bg-[#12121A] rounded-xl border border-[#1E1E2E] p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-[#00C896] uppercase tracking-wider">NQ Scenario</span>
        </div>
        <p className="text-[15px] text-white leading-relaxed font-medium">{q.scenario}</p>
      </div>

      <div className="space-y-2">
        {q.options.map((opt, idx) => {
          let bg = "#12121A";
          let border = "#1E1E2E";
          let textColor = "#FFFFFF";
          if (selected !== null) {
            if (idx === q.answer) { bg = "rgba(0,200,150,0.12)"; border = "#00C896"; textColor = "#00C896"; }
            else if (idx === selected && selected !== q.answer) { bg = "rgba(255,68,68,0.1)"; border = "#FF4444"; textColor = "#FF4444"; }
          }
          return (
            <button
              key={idx}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border-[1.5px] text-left transition-all hover:border-[#2E2E3E]"
              style={{ backgroundColor: bg, borderColor: border }}
              onClick={() => handleSelect(idx)}
            >
              <span
                className="w-7 h-7 rounded-full border-[1.5px] flex items-center justify-center text-sm font-bold shrink-0"
                style={{ borderColor: border, color: textColor }}
              >
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="text-sm leading-relaxed" style={{ color: textColor }}>{opt}</span>
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div
          className="rounded-xl border-[1.5px] p-5 mt-4"
          style={{ borderColor: isCorrect ? "#00C896" : "#FF4444" }}
        >
          <p className="text-base font-bold mb-2" style={{ color: isCorrect ? "#00C896" : "#FF4444" }}>
            {isCorrect ? "✓ Correct!" : "✗ Not quite..."}
          </p>
          <p className="text-sm text-white leading-relaxed mb-4">{q.explanation}</p>
          <button
            className="w-full py-3 rounded-xl font-bold text-sm text-[#0A0A0F] hover:opacity-90 transition-opacity"
            style={{ backgroundColor: isCorrect ? "#00C896" : "#F59E0B" }}
            onClick={handleNext}
          >
            {answered + 1 < TOTAL_QUIZ_QUESTIONS ? "Next Question →" : "See Results"}
          </button>
        </div>
      )}
    </div>
  );
}

async function streamMessageWeb(
  conversationId: number,
  content: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<void> {
  const res = await fetch(
    `${getApiUrl()}gemini/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ content }),
    }
  );

  if (!res.ok) {
    onError("Failed to get response");
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    onError("No response body");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let doneSignaled = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) onChunk(parsed.content);
          if (parsed.done) { doneSignaled = true; onDone(); }
          if (parsed.error) onError(parsed.error);
        } catch {}
      }
    }

    if (buffer.trim()) {
      const remaining = buffer.trim();
      if (remaining.startsWith("data: ")) {
        try {
          const parsed = JSON.parse(remaining.slice(6));
          if (parsed.content) onChunk(parsed.content);
          if (parsed.done) { doneSignaled = true; onDone(); }
          if (parsed.error) onError(parsed.error);
        } catch {}
      }
    }

    if (!doneSignaled) onDone();
  } catch {
    onError("Stream interrupted");
  }
}

function MentorView() {
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function fetchConversations() {
    setLoadingConversations(true);
    try {
      const res = await fetch(`${getApiUrl()}gemini/conversations`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data || []);
      }
    } catch {}
    setLoadingConversations(false);
  }

  async function startConversation() {
    try {
      const res = await fetch(`${getApiUrl()}gemini/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "NQ Session" }),
      });
      if (res.ok) {
        const data = await res.json();
        setConversationId(data.id);
        setMessages([{ role: "assistant", content: "I'm your ICT Trading Mentor. Ask me about FVGs, Liquidity Sweeps, Silver Bullet setups, or NQ Futures strategy." }]);
        fetchConversations();
      }
    } catch {}
  }

  async function loadConversation(id: number) {
    setConversationId(id);
    try {
      const res = await fetch(`${getApiUrl()}gemini/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages((data.messages || []).map((m: any) => ({ role: m.role, content: m.content })));
      }
    } catch {}
  }

  async function sendMessage() {
    if (!input.trim() || !conversationId || isStreaming) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsStreaming(true);

    let assistantMsg = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      await streamMessageWeb(
        conversationId,
        userMsg,
        (chunk) => {
          assistantMsg += chunk;
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: assistantMsg };
            return updated;
          });
        },
        () => { setIsStreaming(false); },
        () => {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: "Connection error. Please try again." };
            return updated;
          });
          setIsStreaming(false);
        }
      );
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Connection error. Please try again." };
        return updated;
      });
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (!conversationId) {
    return (
      <div className="flex h-full max-w-4xl mx-auto">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-[#00C896]">
            <MessageSquareIcon />
          </div>
          <h3 className="text-xl font-bold text-white mt-4 mb-2">ICT Mentor AI</h3>
          <p className="text-sm text-[#8B8BA0] text-center max-w-sm leading-relaxed mb-6">
            Ask anything about ICT concepts, NQ setups, or trading psychology
          </p>
          <button
            className="flex items-center gap-2 bg-[#00C896] text-[#0A0A0F] font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
            onClick={startConversation}
          >
            <PlusIcon />
            New Conversation
          </button>
        </div>
        <div className="w-72 border-l border-[#1E1E2E] p-4 overflow-y-auto">
          <p className="text-xs font-semibold text-[#8B8BA0] uppercase tracking-wider mb-3">Previous Sessions</p>
          {loadingConversations ? (
            <div className="flex justify-center py-4"><LoaderIcon /></div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-[#55556A]">No previous sessions</p>
          ) : (
            <div className="space-y-2">
              {[...conversations].reverse().slice(0, 10).map((c) => (
                <button
                  key={c.id}
                  className="w-full flex items-center gap-2 bg-[#12121A] rounded-xl p-3 border border-[#1E1E2E] text-left hover:border-[#2E2E3E] transition-colors"
                  onClick={() => loadConversation(c.id)}
                >
                  <span className="flex-1 text-sm text-white truncate">{c.title}</span>
                  <ChevronDown className="text-[#55556A] shrink-0 -rotate-90" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="p-3 border-b border-[#1E1E2E]">
        <button
          className="flex items-center gap-1.5 text-[#00C896] text-sm hover:opacity-80 transition-opacity"
          onClick={() => { setConversationId(null); fetchConversations(); }}
        >
          <ArrowLeftIcon />
          Sessions
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start gap-2"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-[#00C89633] flex items-center justify-center shrink-0 mt-1">
                <span className="text-[10px] font-bold text-[#00C896]">ICT</span>
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-[#00C896] text-[#0A0A0F] rounded-br-sm"
                  : "bg-[#12121A] border border-[#1E1E2E] text-white rounded-bl-sm"
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content}
                {isStreaming && i === messages.length - 1 && msg.role === "assistant" ? "▋" : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-[#1E1E2E] flex items-end gap-2">
        <textarea
          className="flex-1 bg-[#12121A] border border-[#1E1E2E] rounded-2xl px-4 py-2.5 text-sm text-white placeholder-[#8B8BA0] resize-none focus:outline-none focus:border-[#2E2E3E] max-h-24"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your ICT mentor..."
          disabled={isStreaming}
          rows={1}
        />
        <button
          className="w-10 h-10 rounded-full bg-[#00C896] flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity disabled:opacity-40"
          onClick={sendMessage}
          disabled={!input.trim() || isStreaming}
        >
          {isStreaming ? <LoaderIcon /> : <SendIcon />}
        </button>
      </div>
    </div>
  );
}

function PlanView() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold text-white mb-1">NQ Futures: ICT Trading Plan</h2>
      <p className="text-sm text-[#8B8BA0] mb-6">Your mechanical, top-down trading framework</p>
      <div className="grid gap-4 md:grid-cols-2">
        {PLAN_SECTIONS.map((section) => (
          <div
            key={section.title}
            className="bg-[#12121A] rounded-xl border border-[#1E1E2E] overflow-hidden"
            style={section.title === "Conservative Entry" || section.title === "Prop Firm Survival Rules" ? { gridColumn: "1 / -1" } : undefined}
          >
            <div
              className="flex items-center gap-2.5 px-4 py-3 border-b border-[#1E1E2E]"
              style={{ backgroundColor: section.color + "15" }}
            >
              <span className="text-sm font-bold" style={{ color: section.color }}>{section.title}</span>
            </div>
            <div className="p-1">
              {section.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 px-4 py-2.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                    style={{ backgroundColor: section.color }}
                  />
                  <div>
                    <span className="text-sm font-semibold text-white">{item.label}</span>
                    <span className="text-sm text-[#8B8BA0] ml-1.5">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
            {"image" in section && section.image && (
              <img
                src={getImageUrl(section.image)}
                alt={`${section.title} chart`}
                className="w-full h-44 object-cover"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const TAB_CONFIG: { key: Tab; label: string }[] = [
  { key: "learn", label: "Learn" },
  { key: "glossary", label: "Glossary" },
  { key: "quiz", label: "Quiz" },
  { key: "mentor", label: "Mentor" },
  { key: "plan", label: "Plan" },
];

export default function IctAcademy() {
  const [tab, setTab] = useState<Tab>("learn");

  return (
    <div className="dark min-h-screen bg-[#0A0A0F] flex flex-col">
      <header className="px-6 pt-5 pb-0">
        <h1 className="text-2xl font-bold text-white mb-4">ICT Academy</h1>
        <div className="flex bg-[#12121A] rounded-xl p-1 border border-[#1E1E2E] max-w-md">
          {TAB_CONFIG.map((t) => (
            <button
              key={t.key}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-[#00C896] text-[#0A0A0F] font-bold"
                  : "text-[#8B8BA0] hover:text-white"
              }`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto mt-2">
        {tab === "learn" && <LearnView />}
        {tab === "glossary" && <GlossaryView />}
        {tab === "quiz" && <QuizView />}
        {tab === "mentor" && <MentorView />}
        {tab === "plan" && <PlanView />}
      </main>
    </div>
  );
}

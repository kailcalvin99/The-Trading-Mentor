export type Difficulty = "easy" | "medium" | "hard";

export interface QuizQuestion {
  difficulty: Difficulty;
  scenario: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface GlossaryItem {
  term: string;
  full: string;
  color: string;
  image?: string;
  diagram?: string;
  definition: string;
  tip: string;
}

export interface Lesson {
  id: string;
  title: string;
  paragraphs: string[];
  takeaway: string;
  chartImage?: string;
  videoFile?: string;
}

export interface Chapter {
  id: string;
  title: string;
  color: string;
  icon: string;
  description: string;
  lessons: Lesson[];
}

export const COURSE_CHAPTERS: Chapter[] = [
  {
    id: "ch1",
    title: "Trading Basics",
    color: "#00C896",
    icon: "📘",
    description: "Start here if you know nothing about trading. We'll cover what trading is, what futures are, how to read a chart, and more.",
    lessons: [
      {
        id: "ch1-1",
        title: "What is Trading?",
        chartImage: "lesson-what-is-trading.png",
        paragraphs: [
          "Trading is simply buying and selling things to make money from price changes. Imagine you buy a pair of sneakers for $100. A week later, they're selling for $150. If you sell them, you just made $50. That's trading!",
          "In the stock market, instead of sneakers, people buy and sell stocks (tiny pieces of companies), currencies (like dollars and euros), and futures contracts (agreements to buy/sell something at a future date). The goal is the same — buy low, sell high.",
          "But here's the cool part: in futures trading, you can also make money when prices go DOWN. This is called 'shorting' or 'selling.' You're basically betting the price will drop. If it does, you profit. If it goes up, you lose. So traders can make money whether the market goes up or down — as long as they guess the direction correctly.",
          "Trading happens on exchanges — big digital marketplaces where buyers and sellers meet. Everything is done through a computer. You don't need to physically own anything. You just click 'buy' or 'sell' on your trading platform."
        ],
        takeaway: "Trading is buying and selling to profit from price changes. You can make money when prices go up (buying) or down (selling/shorting)."
      },
      {
        id: "ch1-2",
        title: "What are Futures? What is NQ?",
        chartImage: "lesson-futures-nq.png",
        paragraphs: [
          "A futures contract is an agreement to buy or sell something at a set price on a future date. Think of it like pre-ordering a video game — you agree to pay a price now, and you get the game when it comes out. If the game's price goes up before release, your pre-order was a great deal!",
          "NQ stands for the Nasdaq-100 E-mini Futures. The Nasdaq-100 is a list of the 100 biggest tech companies — Apple, Google, Amazon, Microsoft, and more. When you trade NQ, you're trading the combined value of all these companies. One point of movement in NQ = $20 in your account.",
          "There's also MNQ (Micro Nasdaq-100 Futures), which is a smaller version — each point = $2 instead of $20. This is great for beginners because you risk less money while learning. Think of NQ as the big rollercoaster and MNQ as the kiddie version — same ride, just smaller.",
          "Futures trade almost 24 hours a day, Sunday evening through Friday afternoon. This means prices are always moving, but there are certain times of day when the best trading setups happen (we'll cover that later in Chapter 4)."
        ],
        takeaway: "NQ = Nasdaq-100 Futures ($20/point). MNQ = the mini version ($2/point). Start with MNQ while learning — same setups, smaller risk."
      },
      {
        id: "ch1-3",
        title: "What is a Candlestick Chart?",
        chartImage: "lesson-candlestick.png",
        videoFile: "video-candlestick.mp4",
        paragraphs: [
          "A candlestick chart is the most common way traders look at price movements. Each 'candlestick' on the chart represents a specific time period — it could show 1 minute, 5 minutes, 1 hour, or even a whole day of price action.",
          "Every candle has 4 parts: the Open (where price started), the Close (where price ended), the High (the highest price reached), and the Low (the lowest price reached). The thick body of the candle shows the range between Open and Close. The thin lines above and below (called 'wicks') show the High and Low.",
          "If the candle is GREEN, price went UP — it closed higher than it opened. If the candle is RED, price went DOWN — it closed lower than it opened. Think of green candles as happy (price went up) and red candles as sad (price went down).",
          "When you see a bunch of green candles in a row, the market is going up (bullish). A bunch of red candles means it's going down (bearish). Reading candles is like reading a story — each candle tells you what happened during that time period."
        ],
        takeaway: "Each candle shows Open, High, Low, Close for a time period. Green = price went up, Red = price went down. The wicks show the extreme highs and lows."
      },
      {
        id: "ch1-4",
        title: "What are Timeframes?",
        chartImage: "lesson-timeframes.png",
        paragraphs: [
          "A timeframe is how much time each candle on your chart represents. A 1-minute chart means each candle shows 1 minute of price action. A 1-hour chart means each candle shows 1 hour. A daily chart means each candle shows a full day.",
          "Different timeframes show different pictures of the same market. The daily chart shows the BIG picture — where price has been going over weeks and months. The 1-hour chart shows the MEDIUM picture. The 5-minute and 1-minute charts show the CLOSE-UP — every tiny move.",
          "Think of it like Google Maps. The daily chart is like zooming all the way out to see the whole country. The 1-hour is like seeing your city. The 5-minute is like seeing your street. You need all of them to know exactly where you are and where you're going.",
          "In ICT trading, we use the Daily and 1-Hour charts to figure out which DIRECTION the market is heading (called 'bias'). Then we zoom into the 15-minute and 5-minute charts to find the exact spot to enter a trade. This is called the 'top-down approach' — start big, then zoom in."
        ],
        takeaway: "Higher timeframes (Daily, 1H) show the big picture. Lower timeframes (15m, 5m, 1m) show the details. Always start with the big picture first."
      },
      {
        id: "ch1-5",
        title: "What is a Broker and Trading Platform?",
        chartImage: "lesson-broker-platform.png",
        paragraphs: [
          "A broker is the company that connects you to the market. You can't just walk up to the stock exchange and start trading — you need a broker to place your trades for you. Think of a broker like a phone company — you need them to make calls, and they charge you for the service.",
          "A trading platform is the app or software you use to see charts, place trades, and manage your money. Popular platforms for NQ Futures include NinjaTrader, TradingView, and Tradovate. These platforms show you live price charts and let you click buttons to buy or sell.",
          "When you open a trading account, you deposit money (called 'capital'). This is the money you'll use to trade. The broker holds your money and executes your trades. They make money by charging a small fee on each trade (called a 'commission').",
          "For beginners, it's important to use a broker that offers a 'demo account' or 'paper trading.' This lets you practice trading with fake money so you can learn without risking real cash. Once you're consistently profitable on demo, you can switch to real money."
        ],
        takeaway: "A broker connects you to the market. A platform is the app you trade on. Always start with a demo account to practice with fake money first!"
      },
      {
        id: "ch1-6",
        title: "What is a Prop Firm?",
        chartImage: "lesson-prop-firm.png",
        paragraphs: [
          "A prop firm (short for 'proprietary trading firm') is a company that gives you THEIR money to trade with. Instead of risking your own savings, you trade with the prop firm's capital. If you make profits, you keep a percentage (usually 80-90%). If you lose, the firm takes the hit.",
          "To get funded by a prop firm, you first need to pass an 'evaluation.' This is like a test where you trade on a simulated account and prove you can follow the rules and make money. The rules usually include: don't lose more than 2% in a day, don't lose more than 5-10% total, and reach a profit target.",
          "This is where our app's Risk Shield comes in. The rules we follow (2% daily loss limit, 4% weekly loss limit, morning routine) are designed specifically to help you pass prop firm evaluations. If you can follow these rules consistently, you can get funded with $50,000, $100,000, or even $200,000 of someone else's money.",
          "Common prop firms include Topstep, Apex, and FTMO. They usually charge a monthly fee for the evaluation (around $100-$200). Once you pass, you get access to a funded account and can start earning real money with no risk to your personal savings."
        ],
        takeaway: "Prop firms give you their money to trade with. Pass their evaluation by following strict risk rules, and you keep 80-90% of the profits. Our app's rules are built for this."
      }
    ]
  },
  {
    id: "ch2",
    title: "How the Market Really Works",
    color: "#818CF8",
    icon: "🏦",
    description: "Understand who really moves the market, what liquidity is, and why most retail traders lose money.",
    lessons: [
      {
        id: "ch2-1",
        title: "Who Moves the Market?",
        chartImage: "lesson-who-moves-market.png",
        paragraphs: [
          "Here's a secret most beginners don't know: the market is NOT moved by regular people like you and me. It's moved by huge banks, hedge funds, and institutions — we call them 'Smart Money.' These players control billions of dollars and can push prices wherever they want.",
          "Regular traders (called 'retail traders') only make up about 10-15% of the market. We're the small fish. The banks are the whales. When a whale wants to buy, they need to find enough sellers. When they want to sell, they need buyers. The problem? There aren't always enough people on the other side of the trade.",
          "So what do the big players do? They TRICK retail traders into taking the wrong side. They push price up to make people buy (thinking it's going higher), then slam it back down. Or they push price down to scare people into selling, then rocket it back up. This is why 90% of retail traders lose money — they fall for the traps.",
          "ICT (Inner Circle Trader) concepts teach you to think LIKE the big players instead of getting tricked by them. Instead of falling for fake moves, you learn to spot them and trade in the same direction as the banks. That's the whole foundation of what we're learning here."
        ],
        takeaway: "Banks and institutions (Smart Money) move the market. They trick retail traders into taking the wrong side. ICT teaches you to follow the Smart Money instead of getting fooled."
      },
      {
        id: "ch2-2",
        title: "What is Liquidity?",
        chartImage: "lesson-liquidity.png",
        paragraphs: [
          "Liquidity is one of the MOST important concepts in ICT trading. In simple terms, liquidity is where people's stop-loss orders are sitting. A stop-loss is an automatic order that closes your trade to limit your losses — like an emergency exit.",
          "Here's where it gets interesting: the big players NEED these stop-loss orders to fill their own trades. When a bank wants to buy a massive amount of NQ, they need a lot of sellers. Where are the sellers? Right where everyone's stop-losses are! When those stops get hit, they create a flood of sell orders — exactly what the bank needed.",
          "Think of it like a piggy bank. Retail traders place their stop-losses just below recent lows (for buy trades) or just above recent highs (for sell trades). These stop-losses are like piles of money sitting at predictable spots. The big players know exactly where they are, and they go 'sweep' them — grab that money — before making their real move.",
          "This is why you see price spike below a low and then shoot back up, or spike above a high and then drop. That spike is the Smart Money sweeping the liquidity (grabbing everyone's stop-losses) before reversing in their intended direction."
        ],
        takeaway: "Liquidity = stop-loss orders sitting at predictable levels. The big players sweep these stops to fill their orders, then reverse. Understanding this is the key to ICT trading."
      },
      {
        id: "ch2-3",
        title: "Buy-Side vs Sell-Side Liquidity",
        chartImage: "lesson-buyside-sellside.png",
        paragraphs: [
          "Now that you know what liquidity is, let's learn where it sits. There are two types: Buy-Side Liquidity (BSL) and Sell-Side Liquidity (SSL).",
          "Buy-Side Liquidity sits ABOVE recent highs. When price makes a high, traders who are short (betting price will drop) place their stop-losses just above that high. There are also traders waiting to buy a breakout above the high. All those orders sitting above = Buy-Side Liquidity.",
          "Sell-Side Liquidity sits BELOW recent lows. When price makes a low, traders who are long (betting price will go up) place their stop-losses just below that low. Those orders = Sell-Side Liquidity.",
          "The Smart Money 'sweeps' one side to fuel a move in the opposite direction. For example: price drops below a recent low (sweeping Sell-Side Liquidity / grabbing all those stop-losses), then rockets back up. The sweep provided the fuel for the move higher. When you see a sweep happen, that's your signal to look for a trade in the opposite direction."
        ],
        takeaway: "BSL (Buy-Side Liquidity) = stop-losses above highs. SSL (Sell-Side Liquidity) = stop-losses below lows. Smart Money sweeps one side, then moves the other way."
      },
      {
        id: "ch2-4",
        title: "What is Smart Money?",
        chartImage: "lesson-smart-money.png",
        paragraphs: [
          "Smart Money refers to the big institutional players — JP Morgan, Goldman Sachs, Citadel, and other major banks and hedge funds. They have access to more information, faster technology, and way more money than retail traders. They're called 'smart' because they consistently make money while most retail traders lose.",
          "The ICT method is all about learning to read what Smart Money is doing by looking at the clues they leave on the chart. These clues include: liquidity sweeps (fake-out moves), displacement candles (big, fast candles that show real intent), and fair value gaps (price gaps they create).",
          "Think of Smart Money like a poker player who can see everyone else's cards. They know where retail traders have their stop-losses, and they use that information to their advantage. ICT concepts teach YOU to see the same things Smart Money sees.",
          "The goal isn't to outsmart them — that's impossible. The goal is to trade WITH them. When you see them sweep liquidity and shift market structure, you're seeing their hand. Follow their lead, and you'll be on the winning side."
        ],
        takeaway: "Smart Money = big banks and institutions that move the market. ICT teaches you to follow their moves instead of fighting them. Trade WITH them, not against them."
      },
      {
        id: "ch2-5",
        title: "Internal vs External Liquidity",
        chartImage: "lesson-internal-external.png",
        paragraphs: [
          "Once you understand liquidity, you need to know about two types of targets: Internal Liquidity and External Liquidity. These are used to set your profit targets (where to exit your trade).",
          "External Liquidity is the BIG target — it's an old high or low that hasn't been taken out yet. If price is going up, your external target might be a previous swing high or the high of the previous day. These are the 'end of the move' targets.",
          "Internal Liquidity is the NEARBY target — it refers to Fair Value Gaps (FVGs) that price tends to fill. Think of internal liquidity as the pitstops along the way, and external liquidity as the final destination.",
          "In our trading plan, TP1 (first target) is usually an internal liquidity target — a nearby high or low. TP2 (main target) is external liquidity — the big target. You take some profit at TP1 and let the rest ride to TP2."
        ],
        takeaway: "External Liquidity = old highs/lows (the big target, TP2). Internal Liquidity = nearby gaps and levels (the first target, TP1). Use both to plan your exits."
      }
    ]
  },
  {
    id: "ch3",
    title: "The ICT Toolbox",
    color: "#F59E0B",
    icon: "🧰",
    description: "Learn every ICT tool you'll use to find and take trades — Market Structure, MSS, FVG, Liquidity Sweeps, OTE, Premium/Discount, and Displacement.",
    lessons: [
      {
        id: "ch3-1",
        title: "Market Structure — Highs, Lows, Trends",
        paragraphs: [
          "Market structure is the foundation of everything. It simply means: is price making higher highs and higher lows (uptrend), or lower highs and lower lows (downtrend)?",
          "In an uptrend, price goes up, pulls back a little, then goes up even higher. Each pullback low is higher than the last, and each push up is higher than the last. Think of it like climbing stairs — each step is higher than the one before.",
          "In a downtrend, it's the opposite — price goes down, bounces up a little, then goes down even lower. Like going downstairs. Each bounce is lower than the last, and each drop is lower than the last.",
          "Why does this matter? Because you should only buy in an uptrend and only sell in a downtrend. This sounds obvious, but most beginners try to catch reversals (buying when price is falling, hoping it'll turn around). That's like standing in front of a train. Follow the trend, not your feelings."
        ],
        takeaway: "Uptrend = higher highs + higher lows (buy only). Downtrend = lower highs + lower lows (sell only). Always trade in the direction of the trend."
      },
      {
        id: "ch3-2",
        title: "Market Structure Shift (MSS)",
        chartImage: "chart-mss.png",
        paragraphs: [
          "A Market Structure Shift (MSS) is the moment the trend changes direction. It's like a U-turn sign on the highway — the market was going one way, and now it's going the other.",
          "For a BULLISH MSS (shift from down to up): price breaks above a recent swing high and closes above it. This means the downtrend is over and price is now moving up. It's your signal to start looking for buy setups.",
          "For a BEARISH MSS (shift from up to down): price breaks below a recent swing low and closes below it. The uptrend is over, time to look for sell setups.",
          "The key word is 'closes.' The candle must CLOSE beyond the high or low — not just poke through it. A lot of beginners jump in too early when price just touches the level. Wait for the full candle close. If the candle closes back on the wrong side, it's not a real MSS — it's a trap."
        ],
        takeaway: "MSS = the trend just changed direction. Bullish MSS = breaks above a high (look to buy). Bearish MSS = breaks below a low (look to sell). Wait for the candle to CLOSE."
      },
      {
        id: "ch3-3",
        title: "Fair Value Gap (FVG)",
        chartImage: "chart-fvg.png",
        videoFile: "video-fvg.mp4",
        paragraphs: [
          "A Fair Value Gap (FVG) is a gap left on the chart when price moves too fast. It's where you actually enter your trades. Think of it as a 'price hole' that the market usually comes back to fill.",
          "To spot an FVG, look at three consecutive candles. The gap between the wick of candle 1 and the wick of candle 3 (the part that doesn't overlap) is the FVG. It means price moved so aggressively that it left an 'unfair' gap — and the market likes to come back and 'fill' it.",
          "A BULLISH FVG appears when price shoots up fast — the gap is below the big candle. You'd place a buy order at the top of this gap, expecting price to pull back to it. A BEARISH FVG appears when price drops fast — the gap is above the big candle. You'd sell when price comes back up to fill it.",
          "Not all FVGs are created equal. The best ones appear right after a liquidity sweep and MSS, on the 15-minute or 5-minute chart. An FVG that lines up with the OTE zone (62-79% Fibonacci level) is the highest-probability entry you can get."
        ],
        takeaway: "FVG = a price gap from a fast move. Price usually comes back to fill it. This is where you place your entry order. Best FVGs appear after a sweep + MSS."
      },
      {
        id: "ch3-4",
        title: "Liquidity Sweep — The Fake-Out",
        chartImage: "chart-liquidity-sweep.png",
        videoFile: "video-liquidity-sweep.mp4",
        paragraphs: [
          "A liquidity sweep is when price quickly pokes above a high or below a low to grab everyone's stop-loss orders, then snaps back the other way. It's the fake-out before the real move. Think of it like a broom sweeping up money.",
          "When price sweeps BELOW a low, it triggers all the stop-losses sitting there. This creates a flood of sell orders that the Smart Money uses to fill their buy orders. Then price shoots back up. The sweep was the trick — the real move was UP.",
          "When price sweeps ABOVE a high, the opposite happens — it grabs the stop-losses above, then drops. The real move was DOWN.",
          "This is why the sweep is step 2 in our Conservative Entry checklist. You wait for the fake-out to happen FIRST, then look for the MSS and FVG that follow. The sweep is the bait — the MSS and FVG are your signal that the real move has started."
        ],
        takeaway: "A sweep is a fake move that grabs stop-losses, then price reverses. It's the bait before the real move. Always wait for the sweep BEFORE entering."
      },
      {
        id: "ch3-4b",
        title: "Inducement (IDM) — The Trap Before the Trap",
        chartImage: "chart-idm-inducement.png",
        paragraphs: [
          "Inducement (IDM) is a smaller-scale liquidity grab that happens BEFORE the main sweep. Think of it as a 'mini fake-out' designed to lure early traders into bad positions before the real move begins.",
          "After price creates a Market Structure Shift (MSS), it often doesn't immediately go to the FVG for your entry. Instead, it creates a small counter-move first — this is the Inducement. It tricks traders into thinking the MSS was fake, shaking them out before the real move continues.",
          "IDM typically appears as a small high or low that forms during a pullback. Smart Money uses these small levels to grab liquidity from impatient traders. Once the IDM level is swept, the REAL entry (your FVG/OTE) becomes active.",
          "In your checklist, IDM confirmation means: after the sweep and MSS, wait for any small counter-swing (the inducement) to get taken out. Once that mini-level is swept, price is cleared to move to your FVG entry. This extra patience filter dramatically reduces false entries."
        ],
        takeaway: "IDM = a mini fake-out within the pullback. Wait for it to get swept before entering at your FVG. It's an extra confirmation that Smart Money is clearing all the liquidity before the real move."
      },
      {
        id: "ch3-5",
        title: "Optimal Trade Entry (OTE)",
        chartImage: "chart-ote.png",
        paragraphs: [
          "The Optimal Trade Entry (OTE) is the sweet spot to enter a trade. It uses the Fibonacci retracement tool, specifically the zone between 62% and 79%. This zone gives you the best risk-to-reward ratio.",
          "After a sweep and MSS, price usually pulls back before continuing in the new direction. The OTE zone tells you HOW FAR price is likely to pull back. If your FVG lines up with this zone, you have a very high-probability entry.",
          "Think of it like a rubber band. You stretch it (the MSS move), and it snaps back a bit (the pullback to OTE), before continuing in the stretched direction. The 62-79% zone is where the rubber band has snapped back 'just enough' — not too much, not too little.",
          "To use this: after the MSS, draw a Fibonacci retracement from the swing low to the swing high (for bullish setups) or high to low (for bearish). The zone between 0.62 and 0.79 is your OTE. If there's an FVG sitting in that zone, that's a textbook entry."
        ],
        takeaway: "OTE = the 62-79% Fibonacci zone. After a sweep + MSS, price pulls back to this zone before continuing. An FVG in the OTE zone is the best possible entry."
      },
      {
        id: "ch3-6",
        title: "Premium vs Discount",
        chartImage: "lesson-premium-discount.png",
        paragraphs: [
          "Premium and Discount tell you whether price is 'expensive' or 'cheap' relative to a range. It's like shopping — you want to buy when things are on sale (Discount) and sell when they're overpriced (Premium).",
          "To find Premium and Discount, take any price range (like the current day's range) and find the 50% level (the midpoint). Everything ABOVE the 50% level is Premium (expensive). Everything BELOW is Discount (cheap).",
          "The rule is simple: In Premium, look to SELL. In Discount, look to BUY. If you're trying to buy but price is in Premium, wait for it to come down to Discount first. This ensures you're getting a good deal on your entry.",
          "This concept works with OTE. The Discount zone (below 50%) includes the OTE zone (62-79% retracement). For buy trades, you want your entry in Discount / OTE. For sell trades, you want your entry in Premium / OTE. This alignment dramatically increases your odds."
        ],
        takeaway: "Premium = above 50% (expensive, sell zone). Discount = below 50% (cheap, buy zone). Always buy in Discount and sell in Premium."
      },
      {
        id: "ch3-7",
        title: "Displacement — The Power Candle",
        chartImage: "lesson-displacement.png",
        paragraphs: [
          "Displacement is a big, aggressive candle (or group of candles) that shows real intent from Smart Money. It's a fast, powerful move that creates Fair Value Gaps and tells you the big players are involved.",
          "You can recognize displacement by its characteristics: large candle bodies with very small wicks (or no wicks at all), multiple candles in the same direction closing near their highs or lows, and volume behind the move. It looks 'violent' compared to the choppy candles before it.",
          "Displacement is important because it confirms the MSS is real. Anyone can break a high or low temporarily (that's a sweep). But when the break happens with displacement — big, strong candles — it means Smart Money is behind it and the move is likely to continue.",
          "In our entry checklist, step 3 says 'The Shift: 5-min MSS with Displacement.' This means you need BOTH: the structure break (MSS) AND the power behind it (displacement). An MSS without displacement is weak and more likely to fail."
        ],
        takeaway: "Displacement = big, aggressive candles showing Smart Money involvement. An MSS with displacement is a strong signal. Without it, the MSS might be a fake-out."
      }
    ]
  },
  {
    id: "ch4",
    title: "When to Trade",
    color: "#06B6D4",
    icon: "⏰",
    description: "Timing is everything. Learn the best times to trade NQ and when to stay away from the market.",
    lessons: [
      {
        id: "ch4-1",
        title: "Why Time Matters in Trading",
        chartImage: "lesson-time-matters.png",
        paragraphs: [
          "Not all hours of the day are equal for trading. The market has rhythms — certain times when setups work reliably, and other times when the market is choppy and unpredictable. Trading at the wrong time is like fishing in an empty pond.",
          "Big institutions (the Smart Money) are most active during specific sessions. When they're trading, the market moves with purpose and creates the patterns we're looking for (sweeps, MSS, FVGs). When they're not active, price chops around randomly.",
          "NQ Futures trade from Sunday evening to Friday afternoon (with a 1-hour break each day at 5-6 PM EST). But just because the market is open doesn't mean you should be trading. Most of your profits will come from just 2-3 hours of focused trading per day.",
          "The best times to trade are called 'Kill Zones' — specific windows where the highest-probability setups occur. Trading only during these windows (and avoiding everything else) is one of the biggest edges you can have."
        ],
        takeaway: "The market has specific times when setups work best. Trading only during Kill Zones is one of the biggest advantages you can give yourself."
      },
      {
        id: "ch4-2",
        title: "London Kill Zone (2-5 AM EST)",
        chartImage: "chart-killzone.png",
        videoFile: "video-killzone.mp4",
        paragraphs: [
          "The London Kill Zone runs from 2:00 AM to 5:00 AM Eastern Time. This is when European banks and institutions start their trading day. The London session is the first major session to open and often sets the tone for the rest of the day.",
          "During London, you'll often see the first liquidity sweep of the day. Price might sweep the Asian session high or low, then reverse. This sweep + reversal pattern is the classic London Kill Zone setup.",
          "The London session is best for Conservative entries — the full 6-step checklist. The moves tend to be cleaner and more structured, with clear sweeps, MSS, and FVGs on the 15-minute and 5-minute charts.",
          "If you're in the U.S., trading London means waking up very early (2-5 AM). Many traders skip this session and focus on the New York sessions instead. But if you're a night owl or an early bird, London Kill Zone setups can be very profitable."
        ],
        takeaway: "London Kill Zone: 2-5 AM EST. European banks set the day's direction. Look for sweeps of the Asian session high/low followed by MSS. Best for Conservative entries."
      },
      {
        id: "ch4-3",
        title: "NY Open Kill Zone (9:30-10 AM EST)",
        chartImage: "lesson-ny-open.png",
        paragraphs: [
          "The New York Open Kill Zone runs from about 9:30 AM to 10:00 AM Eastern Time. This is when the U.S. stock market opens and American institutions enter the scene. Volume spikes dramatically.",
          "The NY Open is known for volatile, fast moves. Price often makes a fake move in one direction right at 9:30 AM, then reverses sharply. This is because institutions are completing their orders from the London session.",
          "For NQ specifically, the 9:30 AM opening candle is very important. Many traders watch whether price sweeps above or below this candle as a signal for the rest of the morning. A sweep of the 9:30 AM candle high or low, followed by an MSS, is a classic NY Open setup.",
          "Be careful during this window — the moves are fast. If you're not quick, you can miss entries or get caught in the volatility. This is why many ICT traders prefer the Silver Bullet window (10-11 AM) for a calmer, more predictable setup."
        ],
        takeaway: "NY Open: 9:30-10 AM EST. Fast, volatile moves at the stock market open. Watch the 9:30 AM candle for sweep setups. Moves are quick — be ready or wait for Silver Bullet."
      },
      {
        id: "ch4-4",
        title: "Silver Bullet Window (10-11 AM EST)",
        chartImage: "lesson-silver-bullet-window.png",
        paragraphs: [
          "The Silver Bullet Window is 10:00 AM to 11:00 AM Eastern Time. This is the BEST and most reliable time to trade NQ Futures. If you only trade during one window all day, make it this one.",
          "By 10 AM, the chaos of the NY Open has settled. The Smart Money has shown their hand during London and the NY Open. Now they often make one more push — this is the Silver Bullet. It's cleaner, calmer, and more predictable than the earlier sessions.",
          "The Silver Bullet setup is our 'Aggressive Entry' — you look for price heading toward a clear high or low, wait for it to sweep that level, then enter on the first 1-minute FVG. It's a faster, simpler setup than the Conservative entry, with just 4 steps.",
          "Many successful NQ traders trade ONLY during the Silver Bullet window. They wake up, do their morning routine, check the bias, and wait until 10 AM. If they get a setup, they take it. If not, they close the charts and enjoy their day. That's the beauty of this approach."
        ],
        takeaway: "Silver Bullet: 10-11 AM EST. The most reliable NQ trading window. Calmer than NY Open, cleaner setups. If you only trade one hour a day, trade this one."
      },
      {
        id: "ch4-5",
        title: "When NOT to Trade",
        chartImage: "lesson-when-not-trade.png",
        paragraphs: [
          "Knowing when NOT to trade is just as important as knowing when to trade. Some days and times are simply too dangerous or unreliable. Staying out of the market during these times will save you a lot of money.",
          "Red Folder News: These are high-impact economic events listed on ForexFactory.com (marked with a red folder icon). Events like NFP (Non-Farm Payrolls), CPI (inflation data), and FOMC (Federal Reserve meetings) cause wild, unpredictable price swings. Don't trade within 5 minutes before or after these events.",
          "Fridays: Many experienced traders reduce their size or skip Fridays entirely. The market tends to be choppy as institutions close out positions for the weekend. Setups that work great on Tuesday-Thursday often fail on Fridays.",
          "Low-Volume Days: Major holidays (like Thanksgiving, Christmas Eve, 4th of July) have very low trading volume. With fewer participants, price moves randomly and erratically. There's no Smart Money pattern to follow on these days. Just stay out."
        ],
        takeaway: "Don't trade during Red Folder news (5 min before/after), be cautious on Fridays, and skip holiday/low-volume days. Preserving capital is more important than finding trades."
      }
    ]
  },
  {
    id: "ch5",
    title: "Your Trading Plan Step-by-Step",
    color: "#EC4899",
    icon: "📋",
    description: "The complete trading plan — Conservative Entry (6 steps), Aggressive Entry (Silver Bullet), stop losses, and targets.",
    lessons: [
      {
        id: "ch5-1",
        title: "The Top-Down Approach",
        chartImage: "lesson-top-down.png",
        paragraphs: [
          "The Top-Down Approach means you always start your analysis on the big charts and work your way down to the small charts. Never start on the 5-minute chart! Always start on the Daily, then 1-Hour, then 15-minute, then 5-minute.",
          "On the Daily chart, you're asking: 'What's the overall trend? Is the market bullish (going up) or bearish (going down)?' This gives you your BIAS — the direction you want to trade.",
          "On the 1-Hour chart, you're asking: 'Does the 1-Hour agree with the Daily? Where are the key highs and lows?' If the Daily is bullish but the 1-Hour is bearish, you might wait for them to agree before trading.",
          "On the 15-minute and 5-minute charts, you're asking: 'Where is my entry? Has there been a sweep? Is there an MSS? Where's the FVG?' You NEVER trade on the lower timeframes in a direction that disagrees with the higher timeframes. That's the golden rule."
        ],
        takeaway: "Always start big (Daily), then zoom in (1H → 15m → 5m). The big chart decides your direction. The small chart gives you the entry. Never trade against the big picture."
      },
      {
        id: "ch5-2",
        title: "Conservative Entry — All 6 Steps",
        chartImage: "chart-conservative-entry.png",
        paragraphs: [
          "The Conservative Entry is our main trading setup. It has 6 checkpoints that must ALL be met before you enter a trade. No exceptions. This is your bread and butter.",
          "Step 1 — Bias Check: Is the 1-Hour chart clearly going up (Bullish) or down (Bearish)? If it's sideways and choppy, there's no trade. You need a clear direction. Step 2 — The Sweep: Wait for price to take out a 15-minute high or low. This is the liquidity grab that fuels the real move.",
          "Step 3 — The Shift (MSS): After the sweep, wait for a 5-minute Market Structure Shift with displacement (big, aggressive candles). This confirms the move is real. Step 4 — The Gap (FVG): Identify the Fair Value Gap left behind by the displacement. This is where you'll enter.",
          "Step 5 — The Fib (OTE): Check that your entry is in the Optimal Trade Entry zone (62-79% Fibonacci). For buys, this should be in the Discount area. For sells, in Premium. Step 6 — The Trigger: Place a Limit Order at the beginning of the FVG. Don't use a market order — wait for price to come to you."
        ],
        takeaway: "All 6 steps must be checked: Bias → Sweep → MSS → FVG → OTE → Limit Order. If ANY step is missing, skip the trade. Discipline over excitement."
      },
      {
        id: "ch5-3",
        title: "Aggressive Entry (Silver Bullet)",
        chartImage: "chart-silver-bullet.png",
        paragraphs: [
          "The Aggressive Entry is a faster, simpler setup used specifically during the Silver Bullet window (10-11 AM EST). It has only 4 steps and uses the 1-minute chart for entries.",
          "Step 1 — Time Check: It MUST be between 10:00 AM and 11:00 AM EST. No exceptions. This setup relies on the specific market behavior during this window. Step 2 — Identify POI: Price must be heading toward a clear high or low (a Point of Interest) where stops are sitting.",
          "Step 3 — 1-Minute FVG Entry: After price sweeps the POI (grabs the stops), look for the first 1-minute FVG in the opposite direction. This is your entry. Step 4 — Risk: Maximum 1% risk on this trade. Aggressive entries are higher-risk, so you keep the position smaller.",
          "The Silver Bullet is called 'aggressive' because you're using a smaller timeframe (1-minute) and fewer confirmation steps. It's faster and you need to make decisions quickly. This is why you limit risk to 1% — the smaller confirmation means there's a higher chance of failure."
        ],
        takeaway: "Silver Bullet: 4 steps during 10-11 AM EST. Time → POI → 1min FVG → Max 1% risk. Faster but riskier than Conservative. Keep position size small."
      },
      {
        id: "ch5-4",
        title: "Where to Put Your Stop Loss",
        chartImage: "lesson-stop-loss.png",
        paragraphs: [
          "A stop loss is your emergency exit — it automatically closes your trade if price goes against you past a certain point. EVERY trade must have a stop loss. No exceptions. Trading without a stop loss is like driving without a seatbelt.",
          "For our setups, the stop loss goes at the high or low of the candle that created the MSS. This is the logical place because if price goes back beyond the MSS candle, the setup has failed — the shift wasn't real.",
          "For a LONG trade (buying), your stop loss goes just below the low of the MSS candle. For a SHORT trade (selling), it goes just above the high of the MSS candle. Add a small buffer (1-2 points on NQ) so you don't get stopped out by the exact tick.",
          "Once your stop loss is placed, NEVER move it further from your entry (making it wider). You can only move it closer to your entry (tighter) or to breakeven. Moving your stop further away is called 'widening your stop' — it's one of the worst habits a trader can develop because it turns small losses into big ones."
        ],
        takeaway: "Stop loss goes at the MSS candle high/low. Never move it further away — only tighter or to breakeven. Every trade MUST have a stop loss."
      },
      {
        id: "ch5-5",
        title: "Setting Targets — TP1 and TP2",
        chartImage: "lesson-targets.png",
        paragraphs: [
          "TP stands for 'Take Profit' — the price level where you exit the trade with a profit. We use two targets: TP1 (first target) and TP2 (main target).",
          "TP1 is your first target. It's usually the nearest high or low — what we call 'Internal Liquidity.' For a buy trade, TP1 might be the nearest swing high above your entry. The goal is a 1:1 or 1:2 reward-to-risk ratio. Meaning if you're risking 10 points, your TP1 is 10-20 points of profit.",
          "TP2 is your main target — the big one. It's 'External Liquidity' — an old high or low from a bigger timeframe. For a buy trade, this could be yesterday's high or a weekly high. This is where you expect the entire move to end.",
          "Most traders take partial profit at TP1 (close half the position) and let the rest ride to TP2. After TP1 is hit, you move your stop loss to breakeven (your entry price) so the remaining position is a 'free trade' — you can't lose money on it."
        ],
        takeaway: "TP1 = nearby target (1:1 or 1:2 ratio). TP2 = big target (external liquidity). Take partial profit at TP1, move stop to breakeven, let the rest ride to TP2."
      },
      {
        id: "ch5-6",
        title: "Moving Stop to Breakeven",
        chartImage: "lesson-breakeven.png",
        paragraphs: [
          "Moving your stop to breakeven (BE) is one of the most important risk management techniques. It means moving your stop loss to your entry price after TP1 is hit. If price comes back to your entry, you get stopped out at zero loss instead of a full loss.",
          "Here's the process: You enter a buy trade at 18,500 with a stop loss at 18,480 (20 points of risk). TP1 is 18,520 (20 points of profit). When price hits 18,520, you move your stop from 18,480 to 18,500 (your entry price). Now you can't lose money on this trade.",
          "The tradeoff: sometimes price hits TP1 and your stop is at breakeven, then price pulls back and stops you out before going to TP2. You took zero loss but missed the bigger profit. This happens, and it's okay — it's the cost of eliminating risk.",
          "The rule is simple: ALWAYS move to breakeven after TP1. Don't get greedy and keep your stop wide hoping for a bigger move. The times it works out don't make up for the times it doesn't. Consistency and capital preservation are more important than any single trade."
        ],
        takeaway: "After TP1 is hit, move your stop loss to your entry price (breakeven). This makes the remaining position risk-free. Always do this — no exceptions."
      }
    ]
  },
  {
    id: "ch6",
    title: "Risk Management & Prop Firm Rules",
    color: "#EF4444",
    icon: "🛡️",
    description: "The rules that keep you alive. Risk management, position sizing, and the limits that protect your account.",
    lessons: [
      {
        id: "ch6-1",
        title: "Why Risk Management is More Important Than Entries",
        chartImage: "lesson-risk-importance.png",
        paragraphs: [
          "Here's a truth that shocks most beginners: your ENTRIES are not what make you profitable. Your RISK MANAGEMENT is. You could have a strategy that's right only 40% of the time and still make money — if your winners are bigger than your losers.",
          "Think of it like baseball. A great hitter gets a hit 3 out of 10 times (a .300 batting average) and is considered elite. Trading is similar. You don't need to be right all the time. You need to win BIG when you're right and lose SMALL when you're wrong.",
          "The biggest reason traders fail isn't bad strategy — it's bad risk management. They risk too much on one trade, get emotional, move their stop loss, add to losing positions, or revenge trade after a loss. These behaviors can blow up an account faster than any bad entry.",
          "Our plan's risk rules exist to protect you from yourself. They're not suggestions — they're non-negotiable. The 2% daily loss limit, the position sizing rules, the stop-loss discipline — these are what separate funded traders from blown-up accounts."
        ],
        takeaway: "Risk management matters more than finding the perfect entry. You can be wrong 60% of the time and still be profitable if your risk management is solid."
      },
      {
        id: "ch6-2",
        title: "The Risk-Per-Trade Rule",
        chartImage: "lesson-risk-per-trade.png",
        paragraphs: [
          "The core rule: never risk more than 0.5-1% of your account on a single trade. For a $100,000 prop firm account, that means risking a maximum of $500-$1,000 per trade.",
          "Why so small? Because losing streaks happen to EVERYONE. Even the best traders have 3, 4, or 5 losses in a row. If you risk 5% per trade and lose 4 times in a row, you've lost 20% of your account. But if you risk 0.5%, four losses is only 2%. You're still in the game.",
          "For the Silver Bullet (Aggressive Entry), risk is capped at 1% per trade because the setup has fewer confirmations. For Conservative entries, you can go up to 1% because the setup has more confirmation (all 6 steps). But 0.5% is the safest starting point for beginners.",
          "To calculate your risk: Risk Amount = Account Size × Risk Percentage. A $100,000 account at 0.5% risk = $500 max risk per trade. Divide this by your stop loss distance (in dollars) to get your position size. The Risk Shield calculator in this app does this math for you."
        ],
        takeaway: "Risk 0.5-1% per trade max. This keeps you alive during losing streaks. The smaller the risk, the longer you survive — and surviving is winning."
      },
      {
        id: "ch6-3",
        title: "Position Sizing — How Many Contracts",
        chartImage: "lesson-position-sizing.png",
        paragraphs: [
          "Position sizing means figuring out how many contracts to trade based on your risk rule. It's simple math, but it's the most important calculation you'll make before every trade.",
          "The formula: Contracts = Risk Amount ÷ (Stop Loss Points × Point Value). For NQ: each point = $20. For MNQ: each point = $2. If your account is $100,000, your max risk is $500 (at 0.5%), and your stop is 25 points: $500 ÷ (25 × $20) = 1 NQ contract, or $500 ÷ (25 × $2) = 10 MNQ contracts.",
          "ALWAYS do this calculation BEFORE placing the trade. Never just 'guess' how many contracts to trade. And never increase your position size because you 'feel confident' about a setup. The math doesn't care about feelings.",
          "The Risk Shield page in this app has a built-in position size calculator. Just enter your account size, risk percentage, and stop-loss distance in points — it tells you exactly how many NQ or MNQ contracts to trade."
        ],
        takeaway: "Contracts = Risk Amount ÷ (Stop Points × Point Value). Always calculate BEFORE trading. NQ = $20/point, MNQ = $2/point. Use the Risk Shield calculator."
      },
      {
        id: "ch6-4",
        title: "Daily and Weekly Loss Limits",
        chartImage: "lesson-loss-limits.png",
        paragraphs: [
          "Beyond individual trade risk, you need hard daily and weekly loss limits. These are the circuit breakers that prevent a bad day from becoming a catastrophe.",
          "Max Daily Loss: 2%. If you lose 2% of your account in a single day, you're DONE for the day. Close your platform, walk away, and come back tomorrow. Our app enforces this automatically — it locks you out for 24 hours. This prevents 'revenge trading' (trying to win back losses by taking bad trades).",
          "Max Weekly Loss: 4%. If you lose 4% across the entire week, you're done until Monday. This prevents a string of bad days from spiraling out of control.",
          "These limits match what most prop firms require. FTMO, Topstep, and Apex all have daily drawdown limits around 2-3% and total drawdown limits around 5-10%. By practicing with our limits, you're training yourself to pass any prop firm evaluation."
        ],
        takeaway: "Max Daily Loss: 2% (app locks you out). Max Weekly Loss: 4%. These limits protect your account and train you for prop firm rules."
      },
      {
        id: "ch6-5",
        title: "What Happens When You Break the Rules",
        chartImage: "lesson-breaking-rules.png",
        paragraphs: [
          "Breaking the risk rules has consequences — both in the app and in real trading. Understanding these consequences will motivate you to stay disciplined.",
          "If you hit the 2% daily loss limit, the app stops you from logging new trades for 24 hours. This forced break gives you time to cool down, review what went wrong, and come back with a clear head. On a prop firm, hitting the daily loss limit could mean failing the evaluation — months of effort gone in one bad day.",
          "If you hit the 4% weekly loss limit, you're done until the next week. On a prop firm, this could mean account termination — you'd lose the funded account and have to start over (and pay the evaluation fee again).",
          "The harshest consequence is 'blowing up' — losing so much that your account is terminated or you can't trade anymore. This almost always happens from breaking risk rules: not using stop losses, trading too big, revenge trading, or trading during news events. Every blown account is a story of broken rules."
        ],
        takeaway: "Breaking the rules leads to account lockout (in our app) or account termination (in prop firms). Every blown account is caused by broken rules. Discipline = survival."
      }
    ]
  },
  {
    id: "ch7",
    title: "Trading Psychology & Discipline",
    color: "#A855F7",
    icon: "🧠",
    description: "Your biggest enemy isn't the market — it's your own emotions. Learn to master your mind.",
    lessons: [
      {
        id: "ch7-1",
        title: "Why Most Traders Lose",
        chartImage: "lesson-why-lose.png",
        paragraphs: [
          "About 90% of retail traders lose money. That sounds scary, but here's the thing — they don't lose because trading is impossible. They lose because they can't control their emotions. Strategy is only 20% of the game. Psychology is the other 80%.",
          "The market is designed to trigger your emotions. When price goes up fast, you feel FOMO (fear of missing out) and jump in without a setup. When you lose, you feel angry and take revenge trades. When you're winning, you feel invincible and take too much risk.",
          "Professional traders have the same emotions — they just don't ACT on them. They follow their plan no matter how they feel. They take a loss and shrug it off. They see a move they missed and wait for the next one. They treat trading like a boring office job, not a casino.",
          "This is exactly what our app is designed to help with. The morning routine calms your mind before trading. The entry checklist keeps you mechanical. The risk rules prevent emotional decisions. The journal helps you track your behavior. Every feature is a guardrail against your own psychology."
        ],
        takeaway: "90% of traders lose because of emotions, not strategy. Professional traders follow their plan regardless of feelings. Our app's rules and routines are your guardrails."
      },
      {
        id: "ch7-2",
        title: "FOMO — Fear of Missing Out",
        chartImage: "lesson-fomo.png",
        paragraphs: [
          "FOMO is the feeling of 'I NEED to get in NOW or I'll miss the move!' It happens when you see price moving fast without you and you jump in without your setup being complete. It's one of the most common and destructive emotions in trading.",
          "Here's the truth about FOMO: the market gives you opportunities EVERY DAY. If you miss one move, there will be another one tomorrow. And the next day. And the next. There is no 'last train.' The trades that feel most urgent (like you HAVE to take them) are usually the worst trades.",
          "FOMO leads to chasing entries (buying after price has already moved up significantly), skipping your checklist, entering during the wrong time of day, and using too much risk because you feel 'sure' about the trade. All of these behaviors lead to losses.",
          "The cure for FOMO: Follow your checklist mechanically. If all 6 steps aren't met, there is no trade. Period. Write 'If it's not a setup, it's not a trade' on a sticky note and put it on your monitor. After you miss a move, write in your journal: 'I followed my rules and protected my capital.' That's a WIN, not a loss."
        ],
        takeaway: "FOMO makes you chase bad entries. The cure: follow your checklist. If the setup isn't there, there's no trade. Missing a move is not a loss — it's discipline."
      },
      {
        id: "ch7-3",
        title: "Revenge Trading — The #1 Account Killer",
        chartImage: "lesson-revenge-trading.png",
        paragraphs: [
          "Revenge trading is when you take another trade immediately after a loss, trying to 'win back' the money. It's driven by anger and frustration, not strategy. It is the single fastest way to destroy a trading account.",
          "Here's what typically happens: You take a trade, it hits your stop loss, you lose $200. Instead of walking away and reviewing what happened, you feel angry and jump right back in. 'I'll get it back.' You take a worse setup because you're emotional. You lose again. Now you're down $400 and even more emotional. The spiral continues until you've blown your daily limit or worse.",
          "Revenge trading is why we have the 2% daily loss limit and the 24-hour lockout. It breaks the cycle. When you lose your max for the day, the app forces you to stop. You can't revenge trade if you can't trade at all.",
          "After any losing trade, the best thing you can do is WALK AWAY. Close your charts for at least 15-30 minutes. Do something else — go for a walk, drink water, take some deep breaths. When you come back, you'll see the market differently. The anger will be gone, and you can trade with a clear head."
        ],
        takeaway: "Revenge trading = trying to win back losses immediately. It's driven by anger and always makes things worse. After a loss, walk away for at least 15 minutes."
      },
      {
        id: "ch7-4",
        title: "The Morning Routine — Preparation Beats Prediction",
        chartImage: "lesson-morning-routine.png",
        paragraphs: [
          "Our app requires you to complete a morning routine before you can log any trades. This isn't just a gimmick — it's one of the most powerful tools for consistent trading. Preparation beats prediction every single time.",
          "The routine is simple: Drink water (hydration helps your brain think clearly), do a 2-minute breathing exercise (calms your nervous system), check the news calendar (so you know when to avoid trading), and set your daily bias (so you know which direction to trade).",
          "The bias check is especially important. By looking at the Daily and 1-Hour charts BEFORE the trading session, you decide in advance whether you're looking for buys or sells. This prevents you from flipping your bias mid-session because of a scary candle.",
          "Professional traders treat their morning routine like an athlete treats warm-ups. You wouldn't play a football game without stretching. You shouldn't trade without preparing. The routine puts you in the right headspace — calm, focused, and ready to follow your plan."
        ],
        takeaway: "Complete the morning routine before trading: hydrate, breathe, check news, set bias. This puts you in a calm, focused state. Preparation is the foundation of consistency."
      },
      {
        id: "ch7-5",
        title: "Building a Trading Journal Habit",
        chartImage: "lesson-journal-habit.png",
        paragraphs: [
          "A trading journal is your most powerful learning tool. After every trade — win or loss — you write down what happened, why you took the trade, and how you felt. Over time, patterns emerge that you can't see in the moment.",
          "Our Smart Journal makes this easy. For every trade, you record: the entry criteria (was your checklist fully checked?), the instrument and direction, what happened (did it hit TP1, TP2, or stop loss?), and your emotional state (were you calm, scared, excited?).",
          "The Behavior Tags are especially powerful. Tags like 'FOMO,' 'Chased,' 'Disciplined,' and 'Greedy' help you track your emotional patterns over time. After a month, you might discover that every Friday you tag trades as 'FOMO' — that tells you to stop trading on Fridays.",
          "Review your journal every weekend. Look for patterns: What times do you trade best? What setups have the highest win rate? When do you break rules? Your journal turns your experience into data, and data helps you improve faster than any course or mentor."
        ],
        takeaway: "Journal every trade — the setup, the result, and how you felt. Review weekly to find patterns. Your journal is how you learn from experience and improve over time."
      }
    ]
  },
  {
    id: "ch8",
    title: "Your Trading Toolkit",
    color: "#0EA5E9",
    icon: "🛠️",
    description: "A tour of every tool built into this app — what it does, why it exists, and exactly how to use it in your daily trading workflow.",
    lessons: [
      {
        id: "ch8-1",
        title: "Mission Control — Your Daily Command Center",
        chartImage: "lesson-morning-routine.png",
        paragraphs: [
          "Mission Control is the first screen you should open every morning before touching a chart. Think of it as your pre-flight checklist — pilots don't take off without it, and you shouldn't trade without it. It combines your morning routine, daily bias, and account health into one dashboard.",
          "The morning routine portion guides you through four steps: hydrate (drink water before trading — dehydration impairs judgment), breathe (a 2-minute calming exercise), check the news calendar (so you know which red-folder events to avoid today), and set your directional bias (decide whether you're looking for buys or sells before the session opens).",
          "The bias setting is powerful because it prevents mid-session confusion. You look at the Daily and 1-Hour charts BEFORE the market opens, decide 'today looks bullish' or 'today looks bearish,' and lock that in. If price does something unexpected during the session, you don't flip your bias on emotion — you go back to your analysis.",
          "Once your routine is complete, Mission Control shows your daily P&L, how close you are to your daily loss limit, and whether you have any trade slots remaining. If you're at the 2% daily loss limit, Mission Control will show the lockout timer — this is the app protecting you from revenge trading. Every day starts here."
        ],
        takeaway: "Open Mission Control before every session. Complete the 4-step routine, set your bias, check your daily limits. This puts you in a calm, prepared state before a single chart is opened."
      },
      {
        id: "ch8-2",
        title: "Smart Journal — Your Trading Memory",
        chartImage: "lesson-journal-habit.png",
        paragraphs: [
          "The Smart Journal is where every trade lives after you take it. Unlike a manual spreadsheet, the journal is structured to capture the things that actually matter: not just profit and loss, but WHY you took the trade, HOW you felt, and WHAT you could have done better. Over time, your journal becomes a mirror that shows you your patterns — both good and bad.",
          "When you log a trade, you fill in: the instrument (NQ, MNQ, etc.), direction (long or short), your entry checklist status (were all 6 criteria checked?), entry and exit prices, and the result (TP1, TP2, or stop loss). You also select behavior tags — labels like 'Disciplined,' 'FOMO,' 'Chased,' 'Greedy,' or 'Revenge' that describe your mental state.",
          "The behavior tags are the secret weapon. At the end of a month, you might see 'FOMO' tagged on every Friday trade — that's a signal to stop trading Fridays. Or you might see 'Disciplined' on all your winning trades and 'Chased' on all your losers — that's a signal to slow down and wait for your setup every time.",
          "Use the journal analytics to review your stats: win rate by setup type, average winner vs. average loser, profit factor, and behavior frequency. When you see your profit factor is 2.1 on 'Disciplined' trades but 0.4 on 'FOMO' trades, you don't need a coach — the data tells you exactly what to change."
        ],
        takeaway: "Log every trade in the Smart Journal — entry, result, and behavior tags. Review weekly to find patterns. Your journal is how you turn experience into improvement."
      },
      {
        id: "ch8-3",
        title: "Risk Shield — Your Financial Safety Net",
        chartImage: "lesson-risk-importance.png",
        paragraphs: [
          "Risk Shield is the enforcer. While the other tools guide and track, Risk Shield actually prevents you from doing damage. It's built around the same rules that prop firms like Topstep, Apex, and FTMO use in their evaluations — because if you can follow Risk Shield consistently, you can pass any funded account challenge.",
          "The core rules are: 0.5% risk per trade (never bet more than 0.5% of your account on a single trade), 2% max daily loss (hit this and you're locked out for 24 hours), and 4% max weekly loss (hit this and you're done until Monday). These aren't suggestions — the app enforces them.",
          "The position size calculator is Risk Shield's most practical tool. You enter your account balance, your risk percentage, and your stop-loss distance in points — and it calculates exactly how many NQ or MNQ contracts you can trade. Never guess your position size. Always run the calculator. The math takes 10 seconds and could save your account.",
          "Risk Shield also tracks your real-time drawdown with color-coded warnings. Green means you're safe. Yellow means you're approaching the limit — trade more carefully. Red means you're at or near the limit — consider stopping. Learning to respect these colors is what separates traders who last from traders who blow up."
        ],
        takeaway: "Risk Shield enforces your limits: 0.5% per trade, 2% daily max, 4% weekly max. Use the position size calculator before every trade. Respect the color warnings. This is how you pass prop firm evaluations."
      },
      {
        id: "ch8-4",
        title: "Analytics — Seeing Your Progress Clearly",
        chartImage: "lesson-discipline-toolkit.png",
        paragraphs: [
          "The Analytics tab transforms your journal entries into visual data that's easy to understand at a glance. Instead of scrolling through individual trades, you see the big picture: your equity curve, win rate trend, average risk:reward, best and worst performing setups, and your discipline score.",
          "The equity curve is the most honest feedback you can get. A smooth, gradually rising curve means you're trading consistently and managing risk. A jagged, volatile curve means you're either sizing too large or letting emotional trades sneak in. You want your equity curve to look boring — steady and upward.",
          "Pay special attention to the setup breakdown. Analytics will show you which of the 6 entry criteria setups perform best for you. Maybe your Conservative Entry win rate is 68%, but trades where you skipped step 2 (The Sweep) only win 41%. That data is telling you to never skip the sweep.",
          "The time-of-day analysis shows when you trade best and worst. Most traders find they perform significantly better during the Silver Bullet window (10-11 AM) versus trying to trade outside their optimal window. Use Analytics to discover YOUR best window and protect it fiercely."
        ],
        takeaway: "Check Analytics weekly to see your equity curve, win rate, and setup performance. Use the data to find your strengths and fix your weaknesses. Data doesn't lie — your feelings do."
      },
      {
        id: "ch8-5",
        title: "AI Mentor — Your Always-On Trading Coach",
        chartImage: "lesson-patience.png",
        paragraphs: [
          "The AI Mentor is your personal trading coach available 24/7. Unlike a YouTube video or a forum post, the AI Mentor can answer YOUR specific question right now, in plain English, without judgment. You can ask it anything — from 'What is an FVG?' to 'I just lost 3 trades in a row, what should I do?'",
          "The AI Mentor is trained on ICT concepts and knows this app inside-out. Ask it to explain any lesson you found confusing. Show it a chart description and ask if it's a valid setup. Ask it to quiz you on a concept. Ask it to help you review your journal entry and find what you did wrong.",
          "One of the most powerful ways to use the AI Mentor is during your weekly journal review. Walk through your losing trades with the AI: 'I entered this trade but it stopped me out. Here's what I saw: [description]. What did I miss?' The AI will point out common mistakes and help you see the trade differently.",
          "The AI Mentor also provides real-time support during your morning routine. If you're unsure about your bias, describe the chart and ask. If you see conflicting signals across timeframes, ask the AI to help you resolve them. Think of it as having an experienced ICT trader sitting next to you, always available, never impatient."
        ],
        takeaway: "Use the AI Mentor to explain concepts, review trades, quiz yourself, and resolve chart confusion. It's your always-available coach — the more you use it, the faster you improve."
      },
      {
        id: "ch8-6",
        title: "Prop Tracker — Passing Your Funded Account Challenge",
        chartImage: "lesson-prop-firm.png",
        paragraphs: [
          "Prop Tracker is specifically built for traders who are working toward a funded account — the ultimate goal for many ICT traders. It lets you set up a virtual prop firm evaluation with all the same rules as Topstep, Apex, FTMO, or any other firm, and tracks your progress in real time.",
          "To set up Prop Tracker, enter your evaluation account size (e.g., $100,000), the profit target required (e.g., 8%), the maximum daily loss (e.g., 2%), and the maximum total drawdown (e.g., 10%). The tracker then shows you a dashboard with: current P&L, days remaining, how far you are from the profit target, and how close you are to the danger zones.",
          "The key feature is the evaluation simulation mode. When you log trades through Risk Shield during an evaluation period, Prop Tracker automatically updates your challenge stats. You can see at a glance: 'I need $4,200 more to pass, I have 18 days left, and I'm at 1.3% drawdown out of my 10% max.' This real-time visibility keeps you focused and disciplined.",
          "Most traders fail prop firm evaluations not because they lack skill, but because they get impatient near the end and take oversized risk to hit the profit target faster. Prop Tracker prevents this by showing you the math: consistent 0.5% daily gains get you to an 8% profit target in 16 trading days without breaking a single rule. Slow and steady is the fastest path to funded."
        ],
        takeaway: "Use Prop Tracker to simulate and track real prop firm evaluations. Set your targets and limits, then let the app track your progress. Consistency beats gambling — the math always wins."
      }
    ]
  },
  {
    id: "ch9",
    title: "A Day in the Life of an ICT Trader",
    color: "#F97316",
    icon: "📅",
    description: "Follow one trader through a complete trading day — from morning prep to end-of-day review — using a real NQ Silver Bullet trade as the example.",
    lessons: [
      {
        id: "ch9-1",
        title: "A Full Trading Day — The Story of One Perfect Setup",
        chartImage: "lesson-time-matters.png",
        paragraphs: [
          "Meet Marcus. He's been trading NQ Futures for eight months and is currently on his second Topstep evaluation — a $100,000 account with an 8% profit target and a 2% daily loss limit. Today is a Wednesday in March. Let's follow him through the entire day and see exactly which app tool he uses at each step.",
          "8:00 AM — Mission Control. Marcus opens the app before even looking at a chart. He clicks through the morning routine: drinks his water (check), does the breathing exercise (check), opens ForexFactory and sees a Medium-impact ADP Employment number at 8:15 AM — he notes he'll wait until 9:15 AM before analyzing. He sets his bias: the Daily chart is in a clear bullish trend after sweeping the weekly low on Monday, and the 1-Hour has been making higher highs since Tuesday. Bias = Bullish. Mission Control confirms he has no open P&L and is 0% into his daily loss limit. He's ready.",
          "9:15 AM — Top-Down Analysis. The ADP number is out and NQ reacted with a quick 40-point drop, then stabilized. Marcus opens TradingView. Daily: bullish, price above Tuesday's midpoint. 1-Hour: after the ADP dip, price swept the 9:00 AM session low (sell-side liquidity) and is now showing a potential bullish shift. 15-minute: he can see the sweep clearly — a sharp wick below the 9:00 low, then a big bullish displacement candle. He draws the Fibonacci from the 9:00 low to the recent 9:10 high. The OTE zone (62-79%) sits between 18,240 and 18,254. He spots a bullish FVG inside that zone — from 18,244 to 18,249. His entry criteria checklist starts forming: Step 1 (Bias) — bullish. Step 2 (Sweep) — SSL swept at 9:10 AM. Step 3 (MSS) — 5-minute bullish break above 9:05 high. He waits.",
          "9:58 AM — The Setup Matures. Price is pulling back toward his FVG zone. Marcus opens the Smart Journal and starts a new trade draft. He records: Instrument = MNQ (he's trading micro contracts on this evaluation to stay conservative), Direction = Long, Notes = 'Silver Bullet window opens in 2 minutes. FVG at 18,244–18,249, OTE zone aligns. Waiting for price to enter the gap.' He uses Risk Shield to calculate position size: $100,000 account, 0.5% risk = $500 max risk. Stop loss = below the MSS candle low at 18,227 = 22 points of risk. MNQ = $2/point. $500 ÷ (22 × $2) = 11.36, rounded down to 11 MNQ contracts. He sets his limit order at 18,247 — the top of the FVG. Stop at 18,225. TP1 at 18,278 (the nearby high / internal liquidity). TP2 at 18,310 (the previous day's high / buy-side liquidity).",
          "10:07 AM — Silver Bullet Window, Trade Fills. NQ dips into the FVG at 10:07 AM and Marcus's limit order fills at 18,247. He checks his entry criteria one final time: Step 1 (Bias) ✓, Step 2 (Sweep) ✓, Step 3 (MSS) ✓, Step 4 (FVG) ✓, Step 5 (OTE Fib) ✓, Step 6 (Trigger — limit placed at FVG) ✓. All 6 checked. He logs the trade in Smart Journal, marks the entry criteria as fully verified, tags his emotional state as 'Calm and Disciplined.' He sets alerts at TP1 and TP2 and walks away from the screen. No chart-watching. No second-guessing.",
          "10:34 AM — TP1 Hit. His alert fires. NQ has rallied to 18,278 — TP1 is filled. Marcus closes 6 of his 11 MNQ contracts (roughly half his position), locking in approximately $186 profit on those 6 contracts (31 points × $2 × 6 contracts). He immediately moves the stop loss on his remaining 5 contracts to breakeven (18,247). He's now in a risk-free trade with 5 contracts riding toward TP2. He updates his Smart Journal: 'TP1 hit at 10:34 AM. Moved SL to breakeven. Feeling great — staying disciplined.'",
          "11:52 AM — TP2 Hit. His second alert fires. NQ has reached 18,310 — TP2 is filled. His remaining 5 contracts close for 63 points of profit (18,310 − 18,247 = 63 points × $2 × 5 contracts = $630). Total trade P&L: $186 (TP1) + $630 (TP2) = $816 profit. Risk:Reward on the full trade: risked $484 ($22 stop × $2 × 11 contracts), made $816. That's approximately 1:1.7 overall, or better than 1:3 on the TP2 portion.",
          "12:15 PM — Trade Complete, Morning Session Closed. Marcus is done trading for the day — one trade, one clean win. He opens Analytics to see his updated equity curve: it's ticked up smoothly, with no wild swings. His Prop Tracker now shows 0.82% profit progress toward the 8% target. Because he had no losing trades today, his drawdown allowance is completely intact — he hasn't touched a single cent of his 10% max drawdown. He completes his midday journal entry: reads through his trade notes, confirms the behavior tag 'Calm and Disciplined,' and writes a post-trade note: 'Perfect execution of Silver Bullet. Waited for all 6 criteria. Did not watch the screen. Trusted the plan.'",
          "1:00 PM — Afternoon Watch. Some traders take a second session in the afternoon Silver Bullet window (2:00–3:00 PM EST). Marcus checks the 1-Hour chart briefly: NQ has been grinding sideways since his TP2 hit, and the afternoon has a Medium-impact Fed speaker at 2:30 PM. He consults the AI Mentor: 'Should I trade the afternoon Silver Bullet today with a Fed speaker at 2:30 PM?' The AI responds that scheduled speakers within the Silver Bullet window can cause unpredictable volatility — the safer choice is to skip the afternoon session and protect the morning's gain. Marcus agrees and closes his charting platform.",
          "2:30 PM — Fed Speaker, No Trade. The Fed speaker comes and goes. NQ spikes 25 points, then drops 40 points in 8 minutes — exactly the kind of whipsaw that would have stopped out almost any position. Marcus is glad he sat out. He makes a note in the Smart Journal: 'Correctly skipped afternoon session due to Fed speaker volatility. Risk Shield discipline preserved today's gain.' This is an important lesson: sometimes the best trade is no trade.",
          "3:30 PM — End-of-Day Prep. With 30 minutes left in the regular session, Marcus does his end-of-day review routine. He opens Mission Control one more time to log his final account state. He checks the Prop Tracker: 0.82% profit for the day, drawdown at 0% (no losing trades today — all drawdown allowance is still intact), 22 days remaining in the evaluation, and 7.18% still needed to reach the profit target. He does the math: at this pace — roughly 0.5–1% per day — he can comfortably reach the 8% target in the time remaining without ever having to take an oversized risk.",
          "4:00 PM — Close and Reflect. Marcus closes TradingView at 4:00 PM Eastern — the regular session close. His final journal entry for the day: 'Entry criteria: 6/6. Behavior: Calm and Disciplined. Trade result: TP1 + TP2. No afternoon trade (correct decision due to news). Total daily gain: 0.82%. Key lesson: One clean trade beats three mediocre ones. Came in prepared, executed the plan, respected risk rules, protected the gain.' He saves the entry, closes the app, and goes for a walk. Tomorrow he'll do it all again — same routine, same discipline, different setup."
        ],
        takeaway: "One trade. One clean execution. Eight tools working together: Mission Control for prep, top-down analysis for bias, Risk Shield for position sizing, Smart Journal for logging, AI Mentor on standby, Prop Tracker for progress. This is what disciplined ICT trading looks like every day — from 8 AM to 4 PM."
      }
    ]
  }
];

export const GLOSSARY: GlossaryItem[] = [
  {
    term: "Candlestick",
    full: "Price Bar",
    color: "#00C896",
    definition: "A visual representation of price movement over a time period. Each candle shows 4 things: where price started (Open), the highest point (High), the lowest point (Low), and where price ended (Close). Green = price went up, Red = price went down. The thick part is the 'body' and the thin lines are 'wicks.'",
    tip: "Focus on the CLOSE of each candle — that's the most important part. The close tells you who won the battle between buyers and sellers."
  },
  {
    term: "Timeframe",
    full: "Chart Period",
    color: "#818CF8",
    definition: "How much time each candle on your chart represents. A 5-minute chart means each candle shows 5 minutes of price action. Higher timeframes (Daily, 1H) show the big picture. Lower timeframes (15m, 5m, 1m) show the close-up details. We use higher timeframes for direction and lower timeframes for entries.",
    tip: "Start your analysis on the Daily chart, then work down to 1H, 15m, and 5m. Never skip the big picture."
  },
  {
    term: "Bullish / Bearish",
    full: "Market Direction",
    color: "#00C896",
    definition: "Bullish means price is going UP or you expect it to go up. Bearish means price is going DOWN or you expect it to go down. A 'bull' charges upward with its horns. A 'bear' swipes downward with its claws. When you're 'bullish,' you want to buy. When you're 'bearish,' you want to sell.",
    tip: "Always check if the big chart (Daily/1H) is bullish or bearish before looking for trades. Trade WITH the trend, not against it."
  },
  {
    term: "FVG",
    full: "Fair Value Gap",
    color: "#00C896",
    image: "chart-fvg.png",
    diagram: "fvg",
    definition: "A gap left on the chart when price moves really fast. Picture three candles in a row — if there's a space between candle 1 and candle 3 that doesn't overlap, that's the gap. Price usually comes back to fill it, and that's where you enter your trade.",
    tip: "On NQ, a 15-minute FVG (Fair Value Gap) after a liquidity sweep is your best entry."
  },
  {
    term: "MSS",
    full: "Market Structure Shift",
    color: "#818CF8",
    image: "chart-mss.png",
    definition: "When price breaks past a recent high or low and closes beyond it, telling you the trend just flipped direction. Think of it like a U-turn sign — the market was going one way and now it's going the other.",
    tip: "Wait for the MSS (Market Structure Shift) candle to fully close — don't jump in early."
  },
  {
    term: "Liquidity Sweep",
    full: "Stop Hunt / Liquidity Grab",
    color: "#F59E0B",
    image: "chart-liquidity-sweep.png",
    definition: "When price quickly pokes above a high or below a low to grab everyone's stop-loss orders, then snaps back the other way. It's like a broom sweeping up money before the real move starts.",
    tip: "A sweep of the London session low followed by a bullish MSS (Market Structure Shift) on NQ is a great long setup."
  },
  {
    term: "IDM",
    full: "Inducement",
    color: "#A78BFA",
    definition: "A smaller-scale liquidity grab that happens during a pullback, designed to lure early traders into bad positions before the real move continues. After a Market Structure Shift, price often creates a small counter-swing (IDM) before reaching your entry. Once the IDM level is swept, the real entry becomes active.",
    tip: "When you see the MSS, don't jump in immediately. Wait for a small counter-move (the inducement) to get swept first. This extra patience filter keeps you out of false entries."
  },
  {
    term: "OTE",
    full: "Optimal Trade Entry",
    color: "#EC4899",
    image: "chart-ote.png",
    definition: "The sweet spot to enter a trade — between 62% and 79% of a price swing. After a sweep and MSS (Market Structure Shift), you want to enter in this zone for the best risk-to-reward. For buys, this lines up with the 'discount' (cheap) area.",
    tip: "Combine OTE (Optimal Trade Entry) with a FVG (Fair Value Gap) in the same zone for an even stronger entry."
  },
  {
    term: "Kill Zone",
    full: "High-Probability Trading Session",
    color: "#06B6D4",
    image: "chart-killzone.png",
    definition: "The best times of day to trade, when setups work most often: London Open (2-5 AM EST) and the Silver Bullet window (10-11 AM EST). These are when the big players are most active and the market moves the cleanest.",
    tip: "The Silver Bullet window (10-11 AM) is the most reliable time for NQ Futures."
  },
  {
    term: "Stop Loss",
    full: "Emergency Exit Order",
    color: "#EF4444",
    definition: "An automatic order that closes your trade if price goes against you by a certain amount. It limits your loss on any single trade. Think of it like a seatbelt — you hope you don't need it, but it saves you when things go wrong. EVERY trade must have a stop loss.",
    tip: "Place your stop loss at the high/low of the MSS candle. Never move it further from your entry — only tighter or to breakeven."
  },
  {
    term: "Take Profit",
    full: "Profit Target Order",
    color: "#00C896",
    definition: "An order that automatically closes your trade when price reaches your profit target. We use two targets: TP1 (nearby target, 1:1 or 1:2 reward) and TP2 (the big target, External Liquidity). Take partial profit at TP1 and let the rest ride to TP2.",
    tip: "After TP1 is hit, always move your stop loss to breakeven. This makes the remaining position a 'free trade.'"
  },
  {
    term: "Breakeven",
    full: "Zero-Loss Exit Point",
    color: "#F59E0B",
    definition: "Moving your stop loss to your entry price after TP1 is hit. If price comes back to your entry, you exit with zero loss instead of a full loss. It turns a risky position into a risk-free one.",
    tip: "Always move to breakeven after TP1. Sometimes you'll get stopped out and miss TP2, but that's the cost of protecting your capital."
  },
  {
    term: "Displacement",
    full: "Power Move / Strong Candle",
    color: "#A855F7",
    definition: "A big, aggressive candle (or series of candles) that shows Smart Money is behind the move. Displacement candles have large bodies, small wicks, and create Fair Value Gaps. They confirm that an MSS is real and not a fake-out.",
    tip: "No displacement after MSS? The shift might be fake. Wait for those big, confident candles before entering."
  },
  {
    term: "Order Block",
    full: "Institutional Order Zone",
    color: "#F59E0B",
    diagram: "order-block",
    definition: "The last bearish candle before a bullish move (or last bullish candle before a bearish move). This is where Smart Money placed large orders. When price returns to this zone, institutions defend their positions — creating a high-probability entry. On NQ, a bullish OB is the last red candle before a strong upward displacement.",
    tip: "Look for Order Blocks that align with an FVG and OTE zone. When all three overlap, you have a premium entry setup."
  },
  {
    term: "Breaker Block",
    full: "Failed Order Block Turned Resistance/Support",
    color: "#A855F7",
    diagram: "breaker-block",
    definition: "An Order Block that failed — price broke through it instead of holding. This failure causes it to 'flip' and now act as resistance (if it was a bullish OB) or support (if it was a bearish OB). Breaker Blocks are powerful re-test zones because trapped traders who entered at the OB are now underwater.",
    tip: "When price returns to a Breaker Block from below (for resistance), look for a bearish 5-minute MSS to confirm the rejection before shorting."
  },
  {
    term: "Silver Bullet",
    full: "10–11 AM EST High-Precision Entry Window",
    color: "#06B6D4",
    diagram: "silver-bullet",
    definition: "A specific ICT strategy that operates in the 10:00–11:00 AM EST window. Price typically sweeps a liquidity pool (old high or low), creates a Market Structure Shift, and leaves a 1-minute FVG for entry. This is considered one of the highest-probability windows of the day for NQ Futures.",
    tip: "Only use the 1-minute FVG for the Silver Bullet entry. Do NOT enter at market — wait for price to come back to the FVG."
  },
  {
    term: "Judas Swing",
    full: "False Morning Move to Trap Traders",
    color: "#EF4444",
    diagram: "judas-swing",
    definition: "A deceptive price move that happens early in the NY session (typically 8:30–9:30 AM EST) designed to trap retail traders in the wrong direction. Price first moves strongly one way (sweeping Buy-Side or Sell-Side Liquidity), then sharply reverses to make the real move. 'Judas' betrayed — and so does this swing.",
    tip: "When you see NQ spike strongly up or down at the NY open, wait before acting. If a reversal happens with displacement, THAT is your trade — not the initial spike."
  },
  {
    term: "Premium / Discount",
    full: "Expensive vs Cheap Zone",
    color: "#EC4899",
    diagram: "premium-discount",
    definition: "When you divide a price range at the 50% level: Premium is above 50% (expensive — sell here) and Discount is below 50% (cheap — buy here). Like shopping — buy on sale, sell when overpriced.",
    tip: "For buys, make sure your entry is in Discount (below 50%). For sells, make sure it's in Premium (above 50%)."
  },
  {
    term: "Prop Firm",
    full: "Proprietary Trading Firm",
    color: "#06B6D4",
    definition: "A company that gives you their money to trade with. You pass an evaluation (following strict rules like max 2% daily loss), and they fund your account with $50K-$200K. You keep 80-90% of profits. Our app's risk rules are designed to help you pass these evaluations.",
    tip: "Focus on following the rules, not making money. Consistency and discipline get you funded. One good month beats gambling for a big day."
  },
  {
    term: "Position Size",
    full: "How Many Contracts to Trade",
    color: "#F59E0B",
    definition: "The number of contracts you trade, calculated from your risk: Contracts = Risk Amount ÷ (Stop Loss Points × Point Value). NQ = $20/point, MNQ = $2/point. Always calculate this BEFORE placing a trade.",
    tip: "Use the Risk Shield calculator to figure out position size. Never guess — always do the math."
  },
  {
    term: "Drawdown",
    full: "How Much You've Lost",
    color: "#EF4444",
    definition: "The amount your account has dropped from its peak. If your account went from $100,000 to $97,000, your drawdown is $3,000 (3%). Prop firms have strict drawdown limits — exceeding them means losing your funded account.",
    tip: "Track your daily and weekly drawdown carefully. Our Risk Shield page shows this in real-time with warning colors."
  }
];

export const QUIZ_BANK: QuizQuestion[] = [
  { difficulty: "easy", scenario: "What does FVG stand for in ICT trading?", options: ["Fast Volume Gain", "Fair Value Gap", "Forward Volatility Gauge", "Fibonacci Value Grid"], answer: 1, explanation: "FVG = Fair Value Gap. It's a gap left on the chart when price moves too fast. Price usually comes back to fill that gap — and that's where you enter your trade!" },
  { difficulty: "easy", scenario: "What is the Silver Bullet time window in EST?", options: ["8:00-9:00 AM", "10:00-11:00 AM", "2:00-3:00 PM", "12:00-1:00 PM"], answer: 1, explanation: "The Silver Bullet window is 10:00-11:00 AM EST. This is the prime ICT trading window for NQ — most consistent setups happen here!" },
  { difficulty: "easy", scenario: "What does MSS mean?", options: ["Moving Stop Strategy", "Market Structure Shift", "Margin Safety System", "Multiple Swing Setup"], answer: 1, explanation: "MSS = Market Structure Shift. It's when price breaks past a recent high or low, telling you the trend just changed direction — like a U-turn." },
  { difficulty: "easy", scenario: "In ICT, what is 'Premium' vs 'Discount'?", options: ["Price above/below the 50% level of a range", "High/low volume zones", "Pre-market/post-market sessions", "Bid/ask spread zones"], answer: 0, explanation: "Premium = above the 50% level (expensive zone — look to sell). Discount = below 50% (cheap zone — look to buy). Think of it like shopping — you buy on sale and sell when it's overpriced!" },
  { difficulty: "easy", scenario: "What is the max daily loss rule for prop firms in this plan?", options: ["1%", "2%", "5%", "10%"], answer: 1, explanation: "Max daily loss is 2%. If you hit it, the app locks you out for 24 hours. This is how you survive prop firm evaluations — protect your capital!" },
  { difficulty: "easy", scenario: "What does a GREEN candlestick mean?", options: ["Price went down", "Price stayed the same", "Price went up", "The market is closed"], answer: 2, explanation: "A green candle means price went UP — it closed higher than it opened. Red means price went down. Think of green as happy (price went up) and red as sad (price went down)." },
  { difficulty: "easy", scenario: "What is a stop loss?", options: ["A type of candlestick pattern", "An automatic order that closes your trade to limit losses", "A strategy for entering trades", "A type of chart"], answer: 1, explanation: "A stop loss is your emergency exit. It automatically closes your trade if price goes against you past a certain point. EVERY trade must have one — it's like a seatbelt." },
  { difficulty: "easy", scenario: "What is a prop firm?", options: ["A company that sells trading software", "A type of chart pattern", "A company that gives you their money to trade with", "A government trading agency"], answer: 2, explanation: "A prop firm gives you their capital to trade with. You pass an evaluation by following strict rules, then trade with $50K-$200K of their money and keep 80-90% of profits!" },
  { difficulty: "easy", scenario: "What is the 'top-down approach' in ICT?", options: ["Trading from the bottom of the chart up", "Starting analysis on big timeframes and working down to small ones", "Only looking at the 1-minute chart", "Trading during the first hour of the day"], answer: 1, explanation: "Top-down means you start with the big picture (Daily chart), then zoom into 1H, 15m, and 5m. The big chart tells you the direction, the small chart gives you the entry." },
  { difficulty: "easy", scenario: "How much is one point of NQ (Nasdaq-100 E-mini Futures) worth?", options: ["$2", "$5", "$10", "$20"], answer: 3, explanation: "One point of NQ = $20. The mini version (MNQ) = $2 per point. Beginners should start with MNQ to risk less while learning." },

  { difficulty: "medium", scenario: "NQ sweeps the 9:00 AM candle low, then immediately breaks back above the 9:00 AM high with a full candle close. What should you do next?", options: ["Enter long immediately at market price", "Wait for a 15-minute FVG to form, then buy into the gap", "Short because the low was already swept", "Skip — no valid setup here"], answer: 1, explanation: "The market faked everyone out by going down first (sweep), then slammed back up (MSS). Now you wait for it to come back down a little to a 'price gap' (FVG) and that's your entry! Entering at market after MSS gives bad risk:reward." },
  { difficulty: "medium", scenario: "NQ is clearly above the daily 50% level — it's in Premium. Price creates a bearish FVG on the 15-minute chart. What do you do?", options: ["Buy — the FVG is bullish", "Wait for price to fill the FVG from below, then look for a short", "Ignore FVGs in premium — they don't matter", "Only trade if it's a Monday"], answer: 1, explanation: "When prices are expensive (Premium), you want to SELL, not buy. The FVG is like a ceiling — when price comes back up to touch it, that's your chance to short." },
  { difficulty: "medium", scenario: "ForexFactory shows NFP (Non-Farm Payrolls) news at 8:30 AM with a red folder icon. When should you trade NQ today?", options: ["Right at 8:30 AM — biggest moves happen then", "At 9:00 AM before the NY open", "Wait until 10:00 AM after volatility settles", "Don't trade at all — red folder = no trading ever"], answer: 2, explanation: "Red folder news is like a tornado warning — you don't go outside! Wait until the storm passes. By 10 AM, the dust has settled and you can see the real direction." },
  { difficulty: "medium", scenario: "NQ is in a clear downtrend. Price sweeps above yesterday's high, then breaks a recent swing low. Where's your entry?", options: ["Short as soon as the high is swept", "Short after the swing low break, ideally inside the bearish FVG", "Long because price went up first", "Wait for 3 more confirmations"], answer: 1, explanation: "The market tricked the buyers (swept their stops above the high), then showed it really wants to go DOWN (MSS). Short inside the FVG it left behind." },
  { difficulty: "medium", scenario: "You enter a long trade on NQ and TP1 is hit. What should you do with your stop loss?", options: ["Keep it where it is", "Move it to breakeven", "Remove it entirely", "Widen it by 50%"], answer: 1, explanation: "Once TP1 is hit, you move your stop loss to breakeven. This way you're in a risk-free trade while letting the remaining position run to TP2 (external liquidity)." },
  { difficulty: "medium", scenario: "You're about to enter a trade. Your Entry Criteria checklist shows 4/6 items checked. Can you log this trade?", options: ["Yes — 4 out of 6 is good enough", "No — all 6 criteria must be checked", "Only if it's during the Silver Bullet window", "Yes, but only as a draft"], answer: 1, explanation: "ALL entry criteria must be checked before logging a trade. The app enforces this to keep your trading mechanical and disciplined. No shortcuts!" },
  { difficulty: "medium", scenario: "Your account is $100,000. You want to risk 0.5% with a 20-point stop loss on NQ ($20/point). How many contracts can you trade?", options: ["1 contract", "2 contracts", "5 contracts", "10 contracts"], answer: 0, explanation: "Risk = $100,000 × 0.5% = $500. Stop loss cost = 20 points × $20/point = $400 per contract. $500 ÷ $400 = 1.25, so you round down to 1 NQ contract. Never round up!" },
  { difficulty: "medium", scenario: "You've had 2 losing trades today totaling 1.8% loss. You see a perfect setup. What do you do?", options: ["Take it — you need to win back your losses", "Take it but with half size since you're close to the 2% limit", "Skip it — one more loss could put you over the 2% daily limit", "Take it with double size to recover faster"], answer: 2, explanation: "At 1.8% daily loss, one more losing trade could push you past the 2% limit. The smart move is to stop trading for the day. The setup will be there tomorrow. Protecting your capital is more important than any single trade." },
  { difficulty: "medium", scenario: "The Daily chart shows a clear uptrend, but the 5-minute chart shows a bearish MSS. Should you short?", options: ["Yes — the 5-minute MSS is a clear signal", "No — never trade against the Daily timeframe direction", "Yes — but only with half position size", "Only if it's during the Kill Zone"], answer: 1, explanation: "The top-down rule says you NEVER trade against the higher timeframe. If the Daily is bullish, you only look for buys on the lower timeframes. A bearish 5-minute MSS in a Daily uptrend is likely just a pullback, not a reversal." },
  { difficulty: "medium", scenario: "What is displacement in ICT trading?", options: ["A slow, gradual price movement", "Big, aggressive candles showing Smart Money involvement", "When price moves sideways for a long time", "The distance between two moving averages"], answer: 1, explanation: "Displacement = big, fast, aggressive candles with large bodies and small wicks. It shows Smart Money is behind the move. An MSS with displacement is much more reliable than one without it." },

  { difficulty: "hard", scenario: "It's 10:22 AM EST. NQ sweeps above the 9:30 AM opening high, then drops back through it and forms a bearish FVG on the 1-minute chart. What setup is this?", options: ["A failed breakout — avoid trading", "A perfect Silver Bullet short setup", "A buy signal because price went up first", "Too late in the day to trade"], answer: 1, explanation: "It's the Silver Bullet window (10-11 AM)! NQ went up to steal the stops above the opening high (sweep), then came back down (MSS) and left a 1-minute FVG. This is the aggressive Silver Bullet short entry!" },
  { difficulty: "hard", scenario: "NQ shows a bullish MSS on the 5-minute chart, but the 1-Hour is in a bearish trend. The Fibonacci shows the entry is at the 55% retracement level. Should you take this trade?", options: ["Yes — the 5-minute MSS is enough confirmation", "No — the entry is NOT in the OTE zone (62%-79%)", "Yes — but only with half size", "No — because 5-minute and 1-hour disagree, AND it's not at OTE"], answer: 3, explanation: "Two problems here: 1) The 5-minute is bullish but 1-Hour is bearish — timeframes disagree (Top-Down rule violated). 2) The 55% level is NOT in the OTE zone (62%-79%). Both conditions fail." },
  { difficulty: "hard", scenario: "NQ sweeps sell-side liquidity at 10:05 AM, creates a bullish MSS on the 5-minute with displacement, and leaves a FVG. The FVG is at the 71% Fibonacci retracement. The 1-Hour shows a bullish bias. How many Conservative Entry criteria does this meet?", options: ["3 out of 6", "4 out of 6", "5 out of 6", "All 6 — it's a textbook setup"], answer: 2, explanation: "Let's check: 1) Bias Check (1H bullish). 2) The Sweep (sell-side liquidity swept). 3) The Shift (5-min MSS with displacement). 4) The Gap (FVG identified). 5) The Fib (71% is in the OTE zone). That's 5/6 — you still need to place the limit order at the FVG (The Trigger)." },
  { difficulty: "hard", scenario: "You're in a long trade on NQ. Price hits TP1 (internal liquidity) at a 1:2 ratio. You move SL to breakeven. Price then pulls back, touches your breakeven SL, and reverses to hit TP2. What happened?", options: ["You were stopped out at breakeven — no loss but missed TP2", "You still got TP2 because the SL is only mental", "You lost money because the pullback went below entry", "The trailing stop automatically moved to TP1"], answer: 0, explanation: "Once the SL is at breakeven and price touches it, you're out — zero loss, but you missed the run to TP2. This is why trailing stops are a double-edged sword. The plan says to move to BE after TP1, and sometimes the market shakes you out." },
  { difficulty: "hard", scenario: "NQ is in a clear downtrend on the Daily. Price retraces to the 75% Fibonacci level and creates a bearish FVG on the 15-minute chart during the London Kill Zone (3:00 AM EST). The 5-minute shows a bearish MSS. Is this a valid Conservative short entry?", options: ["No — London Kill Zone doesn't count for NQ", "No — Conservative entries require the Silver Bullet window", "Yes — all 6 Conservative Entry criteria are met", "Yes — but with only half position size"], answer: 2, explanation: "Let's verify: 1) Bias (Daily bearish). 2) Sweep — implied by the retrace to 75% (premium). 3) Shift (5-min bearish MSS). 4) Gap (15-min bearish FVG). 5) Fib (75% is in OTE zone, Premium for sells). 6) Trigger = place limit at FVG. London Kill Zone is valid for Conservative entries — the Silver Bullet window is only required for Aggressive entries." },
  { difficulty: "hard", scenario: "A trader risks 3% per trade and has 3 consecutive losses. What percentage of their account have they lost, and what's wrong with their approach?", options: ["9% lost — risk is too high per trade", "3% lost — consecutive losses are normal", "6% lost — they should revenge trade to recover", "9% lost — but they should double their next trade to recover"], answer: 0, explanation: "3% × 3 trades = roughly 9% drawdown (actually 8.73% due to compounding). The problem: they're risking way too much per trade. At 0.5% risk, 3 losses = only 1.5%. Prop firms typically terminate at 5-10% drawdown. Risking 3% per trade means a short losing streak can end your career." },
  { difficulty: "hard", scenario: "It's 10:15 AM. NQ sweeps above a clear 15-minute high, shows a bearish MSS on the 5-minute with displacement, and creates an FVG at the 68% Fibonacci level. The 1-Hour is bearish. But you just had a losing trade and feel frustrated. What should you do?", options: ["Take it — all criteria are met, emotions don't matter", "Skip it — never trade when emotional, even with a perfect setup", "Take it with half size as a compromise", "Take it and use a wider stop to feel safer"], answer: 1, explanation: "Even though all 6 Conservative criteria are met AND it's in the Silver Bullet window, trading while emotional is one of the biggest mistakes you can make. Frustration leads to poor execution — moving stops, exiting early, or sizing up. Walk away, cool down, and trade the next setup with a clear head." },
  { difficulty: "hard", scenario: "You've been trading for a month. Your journal shows: 60% win rate, average winner $300, average loser $250. Profit Factor = 1.8. You notice most losses are tagged 'FOMO.' What should you focus on improving?", options: ["Finding better entries to increase win rate to 80%", "Increasing position size to make more per win", "Eliminating FOMO trades — they're dragging down your stats", "Nothing — 60% win rate and 1.8 PF is already great"], answer: 2, explanation: "Your stats are good (60% win rate, 1.8 profit factor). But the FOMO tag pattern reveals the weak link. If you eliminate the FOMO trades (which are likely lower quality), your win rate and profit factor will improve even more. The journal's behavior tags are showing you exactly what to fix." },
  { difficulty: "hard", scenario: "NQ creates a bullish FVG on the 15-minute chart during the London Kill Zone. The Daily is bullish, 1H is bullish. But there was NO liquidity sweep before the MSS. Should you take the Conservative entry?", options: ["Yes — the bias and FVG are enough", "No — Step 2 (The Sweep) is missing. Skip the trade.", "Yes — but use the Aggressive entry instead", "Take it on the 1-minute chart to reduce risk"], answer: 1, explanation: "The Conservative entry requires ALL 6 steps. Step 2 (The Sweep) is missing — price didn't take out a 15-minute high or low before the MSS. Without the sweep, there's no liquidity fuel for the move. This setup has a higher chance of failing. Skip it and wait for a complete setup." },
  { difficulty: "hard", scenario: "You're managing two MNQ contracts. TP1 (internal liquidity) is hit at 1:2 reward-to-risk. What's the best way to manage the position from here?", options: ["Close both contracts at TP1", "Close 1 contract at TP1, move SL to breakeven on the remaining contract, target TP2", "Keep both contracts open and move SL to breakeven", "Close 1 contract and widen the stop on the remaining contract"], answer: 1, explanation: "The textbook approach: take partial profit (1 contract) at TP1 to lock in gains, move the stop to breakeven on the remaining contract (risk-free), and let it ride to TP2 (external liquidity). This balances taking profit with letting winners run." },

  { difficulty: "easy", scenario: "What is Mission Control used for in The Trading Mentor app?", options: ["Placing trades directly in the market", "Completing your morning routine, setting daily bias, and checking risk limits before trading", "Analyzing chart patterns automatically", "Connecting to your broker account"], answer: 1, explanation: "Mission Control is your pre-trading command center. You use it to complete the 4-step morning routine (hydrate, breathe, news check, bias), confirm you're within daily loss limits, and get mentally prepared before touching a chart." },
  { difficulty: "easy", scenario: "What does the Risk Shield's position size calculator help you determine?", options: ["Which direction to trade", "How many NQ or MNQ contracts to trade based on your account size and stop-loss distance", "When the best time to trade is", "What the daily news events are"], answer: 1, explanation: "Risk Shield calculates your position size using the formula: Contracts = Risk Amount ÷ (Stop Loss Points × Point Value). NQ = $20/point, MNQ = $2/point. Always run this before placing a trade — never guess." },
  { difficulty: "medium", scenario: "In the 'Day in the Life' story, Marcus uses Risk Shield before entering his Silver Bullet trade. His account is $100,000, risk is 0.5%, stop loss is 22 points on MNQ ($2/point). How many MNQ contracts can he trade?", options: ["5 contracts", "8 contracts", "11 contracts", "25 contracts"], answer: 2, explanation: "Risk = $100,000 × 0.5% = $500. Stop cost per contract = 22 points × $2 = $44. Contracts = $500 ÷ $44 = 11.36, rounded down to 11. Always round DOWN, never up." },
  { difficulty: "medium", scenario: "You've been using the Smart Journal for 6 weeks. You notice your 'FOMO' tag appears on 9 trades, all on Fridays, and all of them were losers. What is the correct action?", options: ["Ignore it — sample size is too small", "Stop trading on Fridays and review what makes Fridays different for your psychology", "Switch to a different strategy on Fridays", "Trade more on Fridays to average out the losses"], answer: 1, explanation: "Your journal data is telling you something important: Fridays trigger FOMO behavior that leads to losses. The correct response is to stop trading Fridays until you understand the pattern. The journal's behavior tags exist exactly for this purpose — to surface blind spots you can't see in the moment." },

  { difficulty: "easy", scenario: "What is a 'displacement candle' in ICT terminology?", options: ["A slow, sideways candle", "A large, fast candle with a big body and small wicks showing strong momentum", "A candle that gaps between sessions", "A candle that reverses direction suddenly"], answer: 1, explanation: "Displacement candles are large, aggressive candles with big bodies and small wicks — they show Smart Money is behind the move. No displacement after an MSS? The shift is likely fake." },
  { difficulty: "easy", scenario: "What is an 'Order Block' in ICT?", options: ["A large position held by a retail trader", "The last bullish or bearish candle before a major move, where institutions placed orders", "A support/resistance zone on a 1-minute chart", "A type of pending order at the broker"], answer: 1, explanation: "An Order Block is the last bullish or bearish candle (or series of candles) before a strong price move. This is where Smart Money placed large orders. Price often returns to this zone." },
  { difficulty: "easy", scenario: "What is 'Turtle Soup' in ICT?", options: ["A stop-loss triggered by emotional trading", "A strategy of taking the opposite side when obvious breakout traders are trapped", "A type of order that fills at market open", "A news-based trading pattern"], answer: 1, explanation: "Turtle Soup is when price sweeps an obvious high/low to trap breakout traders (the 'turtles'), then reverses sharply. ICT traders LOVE this pattern — buy the dip after the sweep, not the breakout." },
  { difficulty: "easy", scenario: "When does the 'Judas Swing' typically happen?", options: ["During the Silver Bullet window (10-11 AM)", "At the very start of the NY session (8:30-9:30 AM) as a false move before the real direction", "During the London close", "Overnight when volume is low"], answer: 1, explanation: "The Judas Swing is a false move at the start of the NY session designed to trap traders in the wrong direction. Price spikes one way, sweeps liquidity, then makes the REAL move the opposite way." },
  { difficulty: "easy", scenario: "What is a 'Liquidity Void' in ICT?", options: ["A period of no trading volume", "A price gap with minimal trading where price will likely return to fill", "A zone where the broker cannot fill orders", "A gap between the daily high and low"], answer: 1, explanation: "A Liquidity Void is an area on the chart where price moved too fast and left little trading activity behind. Like a FVG, price tends to return to fill these voids because there's unfinished business there." },
  { difficulty: "easy", scenario: "What does the term 'PDA Array' stand for?", options: ["Price Delivery Algorithm Array — the set of ICT price delivery tools", "Personal Daily Average — your average trade P&L", "Pre-Dawn Analysis — chart review before market open", "Position Directional Assessment — bias confirmation tool"], answer: 0, explanation: "PDA = Price Delivery Algorithm Array. It's the collection of ICT tools price uses to move: FVGs, Order Blocks, Breaker Blocks, Mitigation Blocks, and more. These are the 'magnets' that pull price." },
  { difficulty: "easy", scenario: "What is a 'Breaker Block'?", options: ["A failed Order Block that now acts as support/resistance from the opposite side", "A breakout candle that sets the trend for the week", "A block trade executed by an institution", "The candle that breaks a major trendline"], answer: 0, explanation: "A Breaker Block is an Order Block that was 'broken' — price swept through it, invalidating it as support. It then flips to act as resistance (for a bullish OB that failed) or support (for a bearish OB that failed)." },

  { difficulty: "medium", scenario: "It's the London session (3 AM EST). NQ sweeps the previous day's low, then creates a bullish MSS on the 15-minute chart with a clear displacement candle. What is the ideal entry strategy?", options: ["Enter immediately at market price after the MSS candle", "Wait for a 15-minute or 5-minute FVG from the displacement move, then place a limit order there", "Wait for the New York session to confirm the move", "Short because London sessions are typically bearish"], answer: 1, explanation: "Classic London Kill Zone setup! After the sweep and MSS with displacement, wait for the FVG left by the displacement candle. Place a limit order at the top of the FVG for a precise, low-risk entry." },
  { difficulty: "medium", scenario: "NQ is in Q4 (October–December). What directional bias does ICT's Quarterly Theory suggest for this period?", options: ["Bearish — Q4 is always a decline", "Bullish — Q4 is typically a markup/accumulation into year-end", "Neutral — quarterly theory doesn't apply to NQ", "It depends only on the weekly candle"], answer: 1, explanation: "Quarterly Theory: Q1 = Accumulation, Q2 = Markup (big run up), Q3 = Distribution/pullback, Q4 = Re-distribution or final markup into year-end. Q4 is often bullish as institutions position for the next year." },
  { difficulty: "medium", scenario: "You see a bearish Order Block on the 1-Hour chart at a price that aligns perfectly with the 70% OTE Fibonacci retracement. What should you do?", options: ["Buy aggressively — OTE is always a buy signal", "Look for a short entry from the OB if the Daily/1H bias is bearish and price reaches this zone", "Ignore both — OB and OTE together are too complex", "Trade the opposite direction since two signals conflict"], answer: 1, explanation: "When an Order Block and OTE align, it's a confluence zone — higher probability setup. If the HTF bias is bearish and price reaches this area, look for bearish confirmation (like a 5-minute MSS) to short from the OB/OTE confluence." },
  { difficulty: "medium", scenario: "A trader is analyzing a 'Market Maker Model.' Price has swept sell-side liquidity, made a bullish MSS, and is now pulling back. Which liquidity target is NEXT for price to reach?", options: ["Old lows — price will continue down", "Buy-side liquidity (old highs) — that's the next target after a bullish shift", "A random support level", "The entry point — price will retrace fully"], answer: 1, explanation: "In the bullish Market Maker Model: Smart Money sweeps sell-side, shifts structure bullish, then delivers price to buy-side liquidity (old highs). That's the next target after the bullish MSS. Trade in the direction of the model." },
  { difficulty: "medium", scenario: "NQ leaves a Liquidity Void (large gap) on the 15-minute chart after a fast upward move. Price is now pulling back. What do you expect?", options: ["Price will skip over the void and continue higher", "Price will retrace into the void to 'fill' the imbalance, then likely continue higher", "The void has no significance for future price action", "Price will always reverse at a liquidity void"], answer: 1, explanation: "Liquidity Voids are like magnets — price almost always returns to fill them. If the HTF bias is bullish, expect price to pull back into the void (your entry zone), then continue the bullish move." },
  { difficulty: "medium", scenario: "You identify a bearish Breaker Block on the 1-Hour chart. Price has just touched it from below. What is the expected behavior if your HTF analysis is correct?", options: ["Price will blast through and continue up", "Price will reject from the Breaker Block and sell off — it now acts as resistance", "The Breaker Block is neutral — no action expected", "You should buy because price touched the level"], answer: 1, explanation: "A bearish Breaker Block (a failed bullish OB) now acts as resistance. When price returns to test it from below, expect a rejection and sell-off. This is one of the cleanest ICT shorting setups." },
  { difficulty: "medium", scenario: "During the Silver Bullet window, NQ makes a fast move up, sweeps a clear high (BSL), then drops back with a bearish displacement candle on the 1-minute chart. Where do you enter short?", options: ["At the high of the sweep — as soon as price reverses", "At the first 1-minute FVG created by the displacement candle, after confirming bearish MSS", "Wait for the 15-minute chart to confirm", "Don't trade it — Silver Bullet is only for buys"], answer: 1, explanation: "Silver Bullet aggressive entry: after the BSL sweep and 1-minute bearish MSS with displacement, place a limit order at the 1-minute FVG. This gives a precise entry with tight risk. Silver Bullet works for both buys AND sells." },

  { difficulty: "hard", scenario: "NQ has been in a weekly downtrend. Q1 is ending. On the daily chart, price sweeps a major sell-side liquidity pool and creates a bullish displacement candle — the largest candle in 6 weeks. What ICT concepts are at play and what is the directional bias shift signal?", options: ["Random volatility — no signal", "A potential quarterly model shift — Q2 markup beginning; daily displacement after SSL sweep signals possible HTF reversal", "This is a bearish continuation — keep shorting", "The displacement means the downtrend is accelerating"], answer: 1, explanation: "Quarterly theory (Q1 end), major SSL sweep, AND the biggest bullish displacement in weeks = potential Quarterly shift to markup. Smart Money may have accumulated at the SSL zone and is now beginning Q2 distribution of that position upward. This doesn't confirm the reversal alone, but it's a high-alert signal to watch for bullish structure on the daily." },
  { difficulty: "hard", scenario: "You spot a bullish Order Block at 18,000 NQ. Above it sits a Liquidity Void (imbalance) from 18,050 to 18,100. Above the void sits Buy-Side Liquidity at 18,150 (old highs). The OTE zone is 17,990–18,020. Price is currently at 18,000. Build the full trade plan.", options: ["Buy at 18,000, target 18,050, stop at 17,950 — simple trade", "Limit buy inside OB at the OTE zone (17,990–18,020), target Liquidity Void midpoint (18,075) for TP1, BSL at 18,150 for TP2, stop below the OB low", "Sell short because the OB failed", "Wait for all levels to be swept before trading"], answer: 1, explanation: "Full PDA trade plan: Entry = limit at OTE/OB confluence (17,990–18,020). TP1 = Liquidity Void fill at ~18,075 (internal liquidity). TP2 = BSL at 18,150 (external liquidity). SL = below the Order Block low. This is the complete ICT framework in one trade." },
  { difficulty: "hard", scenario: "A Judas Swing occurs at 9:35 AM EST — NQ spikes up 80 points in 3 minutes, sweeping Buy-Side Liquidity at the pre-market high, then sharply reverses with 3 consecutive bearish displacement candles. The 5-minute chart shows a bearish MSS. The 1-Hour is bearish. What is the CORRECT trade execution?", options: ["Buy the Judas Swing pullback — the initial direction was up", "Short at the 5-minute or 1-minute FVG from the displacement, with stop above the BSL sweep high, targeting the pre-market low (SSL)", "Wait for the Silver Bullet window to validate", "Skip — the 3-candle reversal is too aggressive to trust"], answer: 1, explanation: "This is a textbook bearish Judas Swing entry. The setup: BSL swept (9:35 AM spike), bearish MSS on 5-minute with 3 displacement candles, 1H bearish. Short at the FVG created by displacement, stop above the sweep high, target the pre-market SSL. Risk:reward should be at minimum 1:3 here." },
  { difficulty: "hard", scenario: "NQ's PDA Array from highest to lowest priority on the 15-minute chart is: Bearish OB (18,200), Bearish FVG (18,150–18,170), OTE zone (18,130–18,160), and Premium zone starts at 18,100. Price is at 18,080 and the 1H is bearish. What is the highest-confluence short entry and why?", options: ["Short at the OB alone (18,200) — it's the strongest level", "Short at the FVG/OTE confluence (18,150–18,160) — overlapping levels in Premium create highest probability", "Short immediately at 18,080 — don't wait for a pullback", "Wait for price to reach 18,200 OB before entering"], answer: 1, explanation: "FVG (18,150–18,170) overlapping with OTE (18,130–18,160) creates a confluence zone within Premium — this is the highest-probability short zone. The OB at 18,200 is valid too but requires price to travel further into premium, reducing probability. Confluent levels = more institutional orders stacked = stronger reaction." },
  { difficulty: "hard", scenario: "It's a Q3 market (historically Distribution). NQ has been making lower highs and lower lows on the Weekly. Price sweeps an old Monthly high (BSL), then the Daily closes bearish below it. You're in the Silver Bullet window the next day. What's the full-context trade bias?", options: ["Bullish — the monthly BSL sweep created a buy signal", "Strong bearish — Q3 distribution, weekly downtrend, daily bearish close after BSL sweep all align for shorts during Silver Bullet", "Neutral — conflicting signals between monthly and weekly", "The Silver Bullet window invalidates the higher timeframe bias"], answer: 1, explanation: "Every timeframe screams bearish: Q3 (distribution quarter), weekly downtrend, daily bearish close after sweeping BSL. The BSL sweep confirms Smart Money sold into the buyers who chased the breakout. During the Silver Bullet window, look for NQ to sweep another BSL or create a FVG to short. The macro alignment is powerful here." },
  { difficulty: "hard", scenario: "You see a Turtle Soup setup: NQ breaks below last week's low by 15 points, immediately reverses and closes back above it with a strong bullish candle. The FVG from the reversal candle aligns with the 65% OTE retracement. Your 1H bias is bullish. But your daily loss is at 1.6% for today. Should you take this trade?", options: ["Yes — the setup is too perfect to miss", "No — at 1.6% daily loss, one more losing trade risks breaching the 2% daily limit. Protect your capital.", "Yes — but only with half the normal position size", "Yes — Turtle Soup setups have over 70% win rate, so it's worth the risk"], answer: 1, explanation: "Risk management wins over any setup quality. At 1.6% daily loss, you have only 0.4% of risk budget remaining. A normal 0.5% risk trade would put you at 2.1% — over the daily limit if it loses. Even with the most perfect setup, breaking the 2% rule can cost you your prop firm account. Pass on this trade." },
  { difficulty: "hard", scenario: "A Market Maker Bearish Model unfolds: price runs BSL, creates a bearish Breaker Block at 18,300, drops to an OTE at 18,200, then creates a Liquidity Void between 18,200–18,240 on the way down. SSL sits at 18,050. At what price do you expect price to stall and potentially reverse?", options: ["18,300 — at the Breaker Block where it all began", "18,050 — at the SSL (external liquidity target); that's where Smart Money is aiming", "18,200 — at the OTE, where the model started", "The model doesn't predict a reversal point"], answer: 1, explanation: "In the bearish Market Maker Model, price is being delivered to the SSL (sell-side liquidity) at 18,050. That's the EXTERNAL LIQUIDITY target — the ultimate destination. After sweeping the SSL, price may reverse as Smart Money covers shorts and starts the next accumulation phase. The Liquidity Void at 18,200–18,240 may offer a re-entry short if you missed the Breaker Block entry." },
];

export const PLAN_SECTIONS: {
  title: string;
  color: string;
  image?: string;
  items: { label: string; desc: string }[];
}[] = [
  {
    title: "The Tools",
    color: "#00C896",
    items: [
      { label: "MSS (Market Structure Shift)", desc: "Our signal that the trend has changed direction." },
      { label: "FVG (Fair Value Gap)", desc: "A price gap on the chart — this is where we enter trades." },
      { label: "Liquidity", desc: "Old highs and lows where stop losses are sitting — our targets." },
      { label: "Premium vs. Discount", desc: "Is price expensive (Premium = sell) or cheap (Discount = buy)?" },
      { label: "Kill Zones", desc: "The best times to trade: London (2-5 AM EST) and Silver Bullet (10-11 AM EST)." },
    ],
  },
  {
    title: "Timeframe Alignment (Matching Big and Small Charts)",
    color: "#818CF8",
    items: [
      { label: "HTF (Big Picture): Daily & 1-Hour", desc: "Find where price is heading — which direction is the market going?" },
      { label: "LTF (Close-Up): 15-Min & 5-Min", desc: "Find the MSS (Market Structure Shift) and the FVG (Fair Value Gap) entry." },
    ],
  },
  {
    title: "Conservative Entry",
    color: "#00C896",
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
    items: [
      { label: "Max Daily Loss", desc: "2% — if you lose this much, the app stops you for 24 hours." },
      { label: "Max Weekly Loss", desc: "4% — your weekly safety limit." },
      { label: "News Rule", desc: "Don't trade within 5 minutes before or after Red Folder news events." },
    ],
  },
  {
    title: "Key Takeaways",
    color: "#EC4899",
    items: [
      { label: "Top-Down", desc: "Always start with the big chart (Daily). If it's going down, don't try to buy on the small chart." },
      { label: "Patience", desc: "If price doesn't come to your FVG (Fair Value Gap), there is no trade. Wait." },
      { label: "Discipline", desc: "Following this plan is how you get funded. Breaking it keeps you stuck." },
    ],
  },
];

export const DIFFICULTY_COLORS: Record<Difficulty, string> = { easy: "#00C896", medium: "#F59E0B", hard: "#EF4444" };
export const DIFFICULTY_LABELS: Record<Difficulty, string> = { easy: "Beginner", medium: "Intermediate", hard: "Advanced" };
export const DIFFICULTY_ICONS: Record<Difficulty, string> = { easy: "\u{1F331}", medium: "\u26A1", hard: "\u{1F480}" };
export const TOTAL_QUIZ_QUESTIONS = 15;
export const TIER_ORDER: Difficulty[] = ["easy", "medium", "hard"];

export function pickQuestion(diff: Difficulty, used: Set<number>): { q: QuizQuestion; idx: number } | null {
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

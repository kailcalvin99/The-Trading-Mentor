import { TrendingUp, TrendingDown, Trophy, Target, BarChart3, Calendar, Clock, Zap, Shield, Webhook, RefreshCw, Crown, Star, Medal, Flame } from "lucide-react";

function DemoStatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${color || "text-foreground"}`}>{value}</p>
    </div>
  );
}

export function AnalyticsDemoSnapshot() {
  const pnlPoints = [0, 1.2, 0.8, 2.1, 1.6, 3.4, 2.9, 4.7, 4.2, 6.1, 5.8, 7.3, 6.9, 8.5];
  const maxPnl = Math.max(...pnlPoints);
  const minPnl = Math.min(...pnlPoints);
  const range = maxPnl - minPnl || 1;
  const chartW = 400;
  const chartH = 100;
  const pad = 8;
  const xStep = (chartW - pad * 2) / (pnlPoints.length - 1);
  const toX = (i: number) => pad + i * xStep;
  const toY = (v: number) => pad + chartH - ((v - minPnl) / range) * chartH;
  const polyline = pnlPoints.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">See how you're doing across 47 completed trades</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <DemoStatCard label="Win Rate" value="68.3%" color="text-green-600" />
        <DemoStatCard label="Total Trades" value="47" />
        <DemoStatCard label="Profit Factor" value="2.14×" color="text-green-600" />
        <DemoStatCard label="Avg Risk" value="0.72%" />
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Cumulative P&L</p>
            <p className="text-2xl font-bold text-green-500">+8.50%</p>
          </div>
          <TrendingUp className="h-5 w-5 text-green-500" />
        </div>
        <svg viewBox={`0 0 ${chartW} ${chartH + pad * 2}`} className="w-full h-32">
          <defs>
            <linearGradient id="demoGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline
            points={polyline}
            fill="none"
            stroke="#22c55e"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle cx={toX(pnlPoints.length - 1)} cy={toY(pnlPoints[pnlPoints.length - 1])} r="4" fill="#22c55e" />
        </svg>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold">Win Rate by Hour</h3>
          </div>
          <div className="space-y-2">
            {[
              { hour: "9 AM", rate: 45, trades: 8 },
              { hour: "10 AM", rate: 72, trades: 14 },
              { hour: "11 AM", rate: 68, trades: 11 },
              { hour: "2 PM", rate: 55, trades: 9 },
              { hour: "3 PM", rate: 40, trades: 5 },
            ].map((row) => (
              <div key={row.hour} className="flex items-center gap-2 text-xs">
                <span className="w-10 text-muted-foreground">{row.hour}</span>
                <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${row.rate}%` }}
                  />
                </div>
                <span className="w-10 text-right font-medium">{row.rate}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold">Win Rate by Day</h3>
          </div>
          <div className="space-y-2">
            {[
              { day: "Mon", rate: 71 },
              { day: "Tue", rate: 64 },
              { day: "Wed", rate: 58 },
              { day: "Thu", rate: 76 },
              { day: "Fri", rate: 42 },
            ].map((row) => (
              <div key={row.day} className="flex items-center gap-2 text-xs">
                <span className="w-10 text-muted-foreground">{row.day}</span>
                <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${row.rate}%` }}
                  />
                </div>
                <span className="w-10 text-right font-medium">{row.rate}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-bold">AI Insights</h3>
        </div>
        <div className="space-y-2">
          {[
            { icon: <Shield className="h-3.5 w-3.5 text-green-500" />, text: "You win 74% of trades during the Silver Bullet window (10–11 AM).", color: "bg-green-500/10 border-green-500/20" },
            { icon: <TrendingUp className="h-3.5 w-3.5 text-primary" />, text: "NQ1! is your best pair — 71% win rate across 22 trades.", color: "bg-primary/10 border-primary/20" },
            { icon: <TrendingDown className="h-3.5 w-3.5 text-red-500" />, text: "FOMO trades have a 28% win rate — costing you 3.2% P&L.", color: "bg-red-500/10 border-red-500/20" },
          ].map((ins, i) => (
            <div key={i} className={`flex items-start gap-2 border rounded-lg p-2.5 ${ins.color}`}>
              <div className="mt-0.5 shrink-0">{ins.icon}</div>
              <p className="text-xs text-foreground/80">{ins.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DailyPlannerDemoSnapshot() {
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Daily Planner</h1>
        <p className="text-sm text-muted-foreground mt-1">Your morning routine for March 20, 2026</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">Morning Routine</h2>
          <span className="text-xs text-primary font-bold">4/6 complete</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: "67%" }} />
        </div>
        <div className="space-y-2">
          {[
            { task: "Review economic calendar", done: true },
            { task: "Check overnight bias (Asia session)", done: true },
            { task: "Identify key order blocks on NQ", done: true },
            { task: "Mark daily highs and lows", done: true },
            { task: "Define kill zone entry windows", done: false },
            { task: "Set risk parameters for the session", done: false },
          ].map((t, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${t.done ? "bg-green-500 border-green-500" : "border-muted-foreground/30"}`}>
                {t.done && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="currentColor"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span className={`text-sm ${t.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.task}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-bold">Pre-Trade Checklist</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Bias", value: "Bullish", color: "text-green-500" },
            { label: "Best Pair", value: "NQ1!", color: "text-foreground" },
            { label: "Kill Zone", value: "10:00 – 11:00 AM", color: "text-primary" },
            { label: "Risk Budget", value: "1% max", color: "text-foreground" },
          ].map((item) => (
            <div key={item.label} className="bg-secondary/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
              <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">Session Notes</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Strong bullish displacement overnight. Watch for liquidity sweep below 17,850 before a long entry. FVG visible on the 15m chart. Target the weekly high at 18,120.
        </p>
      </div>
    </div>
  );
}

export function PropTrackerDemoSnapshot() {
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Prop Tracker</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your funded account progress</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <DemoStatCard label="Account Balance" value="$103,280" color="text-green-600" />
        <DemoStatCard label="Max Drawdown" value="$4,720 left" color="text-amber-500" />
        <DemoStatCard label="Daily Loss Limit" value="$1,890 left" />
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">Phase Progress</h2>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">Phase 1</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Profit Target</span>
            <span className="text-green-500 font-bold">$3,280 / $8,000</span>
          </div>
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: "41%" }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Days Traded</span>
            <span className="font-bold">12 / 30 minimum</span>
          </div>
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: "40%" }} />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-2">
        <h2 className="text-sm font-bold mb-3">Recent Trades</h2>
        <div className="space-y-2">
          {[
            { pair: "NQ1!", side: "BUY", outcome: "win", pnl: "+$640", time: "10:22 AM" },
            { pair: "MNQ1!", side: "SELL", outcome: "loss", pnl: "-$180", time: "9:54 AM" },
            { pair: "NQ1!", side: "BUY", outcome: "win", pnl: "+$920", time: "Yesterday" },
            { pair: "ES1!", side: "BUY", outcome: "win", pnl: "+$340", time: "Yesterday" },
          ].map((t, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">{t.pair}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${t.side === "BUY" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>{t.side}</span>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${t.outcome === "win" ? "text-green-500" : "text-red-500"}`}>{t.pnl}</p>
                <p className="text-xs text-muted-foreground">{t.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function VideoLibraryDemoSnapshot() {
  const videos = [
    { title: "ICT Institutional Order Flow — The Full Breakdown", duration: "47:22", chapter: "Market Structure", level: "Intermediate", watched: true },
    { title: "Smart Money Concepts: FVG Entry Model", duration: "31:08", chapter: "Entry Models", level: "Beginner", watched: true },
    { title: "Silver Bullet Strategy — 10 AM Kill Zone", duration: "24:55", chapter: "Time & Price", level: "Intermediate", watched: false },
    { title: "Reading Order Blocks Like a Pro", duration: "38:14", chapter: "Market Structure", level: "Advanced", watched: false },
    { title: "NY Open Setups: Liquidity Sweeps & MSS", duration: "29:40", chapter: "Sessions", level: "Intermediate", watched: false },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Video Library</h1>
          <p className="text-sm text-muted-foreground mt-1">ICT methodology deep-dives and coaching</p>
        </div>
        <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-bold">2 / 5 watched</span>
      </div>

      <div className="space-y-3">
        {videos.map((v, i) => (
          <div key={i} className="bg-card border border-border rounded-xl overflow-hidden flex gap-0">
            <div className="w-28 h-20 bg-muted shrink-0 flex items-center justify-center relative">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
              </div>
              {v.watched && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 6l3 3 5-5" /></svg>
                </div>
              )}
              <span className="absolute bottom-1 right-1.5 text-[10px] font-bold text-white bg-black/60 px-1 rounded">{v.duration}</span>
            </div>
            <div className="flex-1 p-3 min-w-0">
              <p className="text-xs text-primary font-bold mb-0.5">{v.chapter}</p>
              <p className="text-sm font-bold text-foreground leading-snug line-clamp-2">{v.title}</p>
              <span className={`mt-1 inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${
                v.level === "Beginner" ? "bg-green-500/10 text-green-500" :
                v.level === "Advanced" ? "bg-red-500/10 text-red-500" :
                "bg-amber-500/10 text-amber-500"
              }`}>{v.level}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LeaderboardDemoSnapshot() {
  const entries = [
    { rank: 1, name: "TradingElite_Mike", winRate: 78.4, trades: 94, disciplined: 91 },
    { rank: 2, name: "ICT_NQ_Hunter", winRate: 74.1, trades: 67, disciplined: 88 },
    { rank: 3, name: "SilverBulletSam", winRate: 71.9, trades: 112, disciplined: 82 },
    { rank: 4, name: "OrderBlockQueen", winRate: 68.7, trades: 55, disciplined: 86 },
    { rank: 5, name: "FVGMaster_Jay", winRate: 65.2, trades: 83, disciplined: 74 },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-amber-500" />
          <div>
            <h1 className="text-2xl font-bold">Leaderboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Team trading performance rankings</p>
          </div>
        </div>
        <button className="flex items-center gap-1.5 text-sm text-muted-foreground border border-border rounded-lg px-3 py-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-5 relative">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1">
          <Star className="h-3 w-3" /> TOP TRADER
        </div>
        <div className="flex items-center gap-4 pt-2">
          <div className="text-4xl">🏆</div>
          <div className="flex-1">
            <span className="font-bold text-foreground">{entries[0].name}</span>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-sm font-bold text-amber-500">{entries[0].winRate}% win rate</span>
              <span className="text-xs text-muted-foreground">{entries[0].trades} trades</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {entries.map((e) => (
          <div key={e.rank} className="flex items-center gap-4 px-5 py-4 border-b last:border-b-0 hover:bg-secondary/20 transition-colors">
            <div className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full border text-xs font-bold ${
              e.rank === 1 ? "bg-amber-500/20 text-amber-500 border-amber-500/30" :
              e.rank === 2 ? "bg-slate-500/20 text-slate-400 border-slate-400/30" :
              e.rank === 3 ? "bg-amber-700/20 text-amber-700 border-amber-700/30" :
              "bg-secondary text-muted-foreground border-border"
            }`}>
              {e.rank <= 3 ? (e.rank === 1 ? <Trophy className="h-4 w-4" /> : <Medal className="h-4 w-4" />) : `#${e.rank}`}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-sm text-foreground truncate block">{e.name}</span>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-muted-foreground">{e.trades} trades</span>
                <span className="text-xs text-muted-foreground">{e.disciplined}% disciplined</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-sm font-bold ${e.winRate >= 70 ? "text-emerald-500" : e.winRate >= 60 ? "text-amber-500" : "text-red-500"}`}>{e.winRate}%</div>
              <div className="text-[10px] text-muted-foreground">win rate</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WebhooksDemoSnapshot() {
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Webhook className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">TradingView Webhooks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Auto-create draft trades from TradingView alerts</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">Your Webhook URL</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-3 font-mono text-xs text-foreground/50">
            https://ictmentor.com/api/webhook/tradingview/••••••••
          </div>
          <button className="shrink-0 flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold px-4 py-3 rounded-xl opacity-60">
            Copy
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold mb-1">Recent Webhook Events</h2>
        <div className="space-y-2">
          {[
            { ticker: "NQ1!", side: "BUY", price: "17,924.50", session: "NY Open", time: "10:02 AM", status: "Draft created" },
            { ticker: "MNQ1!", side: "SELL", price: "17,886.25", session: "Silver Bullet", time: "10:38 AM", status: "Draft created" },
            { ticker: "NQ1!", side: "BUY", price: "17,950.00", session: "London", time: "Yesterday", status: "Draft created" },
          ].map((ev, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 px-3 bg-secondary/30 rounded-lg text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">{ev.ticker}</span>
                <span className={`px-1.5 py-0.5 rounded font-bold ${ev.side === "BUY" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>{ev.side}</span>
                <span className="text-muted-foreground">@ {ev.price}</span>
                <span className="text-primary">{ev.session}</span>
              </div>
              <div className="text-right">
                <span className="text-green-500 font-medium">✓ {ev.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="text-sm font-bold mb-3">Setup Guide</h2>
        <div className="space-y-2 opacity-60">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center gap-3 py-2 border border-border rounded-xl px-4">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">{step}</div>
              <div className="h-3 bg-muted rounded flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function JournalDemoSnapshot() {
  const demoTrades = [
    { pair: "NQ1!", outcome: "win", tag: "Disciplined", time: "10:22 AM", risk: "0.5%", note: "Silver Bullet setup. Clean FVG after liquidity sweep. Entered at OTE, +2R." },
    { pair: "MNQ1!", outcome: "loss", tag: "FOMO", time: "9:47 AM", risk: "1.0%", note: "Jumped in before displacement confirmed. Stopped out at -1R." },
    { pair: "NQ1!", outcome: "win", tag: "Disciplined", time: "10:05 AM", risk: "0.5%", note: "Beautiful order block rejection. Waited for MSS. Hit TP at +1.8R." },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Smart Journal</h1>
        <p className="text-sm text-muted-foreground mt-1">Log and review your trades</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <DemoStatCard label="Total Trades" value="3" />
        <DemoStatCard label="Win Rate" value="67%" color="text-green-600" />
        <DemoStatCard label="Wins" value="2" color="text-green-600" />
        <DemoStatCard label="FOMO Trades" value="1" color="text-amber-500" />
      </div>

      <div className="space-y-3">
        {demoTrades.map((t, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{t.pair}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${t.outcome === "win" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                  {t.outcome.toUpperCase()}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${t.tag === "Disciplined" ? "bg-emerald-400/10 text-emerald-400" : "bg-amber-400/10 text-amber-400"}`}>
                  {t.tag}
                </span>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{t.time}</p>
                <p>Risk: {t.risk}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{t.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

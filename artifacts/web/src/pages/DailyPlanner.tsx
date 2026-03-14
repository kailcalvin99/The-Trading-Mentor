import { Calendar, Droplets, Wind, Newspaper, BarChart3, CheckCircle2 } from "lucide-react";
import { useHealthCheck } from "@workspace/api-client-react";
import { usePlanner } from "@/contexts/PlannerContext";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

const ROUTINE_ITEMS = [
  { key: "water" as const, label: "Drink Water", desc: "Hydrate before you start trading", icon: Droplets },
  { key: "breathing" as const, label: "Breathing Exercise", desc: "5 minutes of calm, focused breathing", icon: Wind },
  { key: "news" as const, label: "Check for Big News Events", desc: "Are there any big news events today that could move the market?", icon: Newspaper },
  { key: "bias" as const, label: "Check the Big Picture Chart", desc: "HTF (Higher Timeframe) — Is the market going up or down today?", icon: BarChart3 },
];

export default function DailyPlanner() {
  const { data, isLoading, isError } = useHealthCheck();
  const { routineItems, isRoutineComplete, toggleItem } = usePlanner();

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Daily Planner</h1>
      </div>
      <p className="text-muted-foreground mb-6">
        Get ready for your trading day. Complete each step before you start trading.
      </p>

      <Card className={`mb-6 ${isRoutineComplete ? "border-primary/30" : ""}`}>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle2 className={`h-4 w-4 ${isRoutineComplete ? "text-primary" : "text-muted-foreground"}`} />
              Morning Routine
            </h2>
            {isRoutineComplete && (
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-md">
                Complete
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Finish all steps to unlock trade logging in the Smart Journal.
          </p>
          <div className="space-y-3">
            {ROUTINE_ITEMS.map(({ key, label, desc, icon: Icon }) => (
              <label
                key={key}
                className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <Checkbox
                  checked={routineItems[key]}
                  onCheckedChange={() => toggleItem(key)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className={`text-sm font-medium ${routineItems[key] ? "text-primary" : ""}`}>{label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">API Status:</span>
        {isLoading && <span className="text-muted-foreground">Checking...</span>}
        {isError && <span className="text-destructive">Disconnected</span>}
        {data && (
          <span className="text-primary">
            Connected ({data.status})
          </span>
        )}
      </div>
    </div>
  );
}

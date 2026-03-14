import { Calendar } from "lucide-react";
import { useHealthCheck } from "@workspace/api-client-react";

export default function DailyPlanner() {
  const { data, isLoading, isError } = useHealthCheck();

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Daily Planner</h1>
      </div>
      <p className="text-muted-foreground">
        Plan your trading sessions, set daily goals, and track your progress.
      </p>

      <div className="mt-6 flex items-center gap-2 text-sm">
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

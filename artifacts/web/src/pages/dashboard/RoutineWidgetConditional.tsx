import { usePlanner } from "@/contexts/PlannerContext";
import { TodayScheduleWidget } from "./TodayScheduleWidget";

export function RoutineWidgetConditional() {
  const { showRoutineWidget } = usePlanner();
  if (!showRoutineWidget) return null;
  return <TodayScheduleWidget />;
}

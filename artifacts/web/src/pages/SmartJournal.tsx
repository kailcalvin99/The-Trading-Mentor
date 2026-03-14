import { BookOpen } from "lucide-react";

export default function SmartJournal() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Smart Journal</h1>
      </div>
      <p className="text-muted-foreground">
        Log your trades, review performance, and gain AI-powered insights.
      </p>
    </div>
  );
}

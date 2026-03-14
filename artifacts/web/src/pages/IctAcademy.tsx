import { GraduationCap } from "lucide-react";

export default function IctAcademy() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <GraduationCap className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">ICT Academy</h1>
      </div>
      <p className="text-muted-foreground">
        Learn ICT trading concepts, strategies, and market structure analysis.
      </p>
    </div>
  );
}

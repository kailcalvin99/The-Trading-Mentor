import { Shield } from "lucide-react";

export default function RiskShield() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Risk Shield</h1>
      </div>
      <p className="text-muted-foreground">
        Manage your risk parameters, prop account rules, and daily loss limits.
      </p>
    </div>
  );
}

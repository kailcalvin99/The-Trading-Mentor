import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export function SettingsSection({ title, icon: Icon, children, defaultOpen = false }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-card hover:bg-muted/30 transition-colors"
      >
        <Icon className="h-5 w-5 text-primary shrink-0" />
        <span className="text-sm font-bold text-foreground flex-1 text-left">{title}</span>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 py-4 bg-card/50 border-t border-border space-y-4">{children}</div>}
    </div>
  );
}

export function SettingInput({ label, desc, value, onChange, type = "text", placeholder }: {
  label: string;
  desc?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground mb-1 block">{label}</label>
      {desc && <p className="text-xs text-muted-foreground mb-1.5">{desc}</p>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
      />
    </div>
  );
}

export function SettingToggle({ label, desc, checked, onChange }: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        onClick={() => onChange(!checked)}
        className={`mt-0.5 w-10 h-6 rounded-full transition-colors shrink-0 ${checked ? "bg-primary" : "bg-muted"}`}
      >
        <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
      </button>
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
    </div>
  );
}

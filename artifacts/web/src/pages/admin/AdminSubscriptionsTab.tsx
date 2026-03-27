import { Edit2, X, Check } from "lucide-react";
import type { AdminTier } from "./adminUtils";

interface Props {
  tiers: AdminTier[];
  editingTier: number | null;
  setEditingTier: (id: number | null) => void;
  tierFeatureEdit: number | null;
  setTierFeatureEdit: (id: number | null) => void;
  newFeature: string;
  setNewFeature: (v: string) => void;
  editValues: Record<string, string>;
  setEditValues: (v: Record<string, string>) => void;
  saving: boolean;
  saveTier: (tierId: number) => void;
  saveTierFeatures: (tierId: number, features: string[]) => void;
}

export function AdminSubscriptionsTab({
  tiers, editingTier, setEditingTier, tierFeatureEdit, setTierFeatureEdit,
  newFeature, setNewFeature, editValues, setEditValues, saving,
  saveTier, saveTierFeatures,
}: Props) {
  return (
    <div className="grid gap-4">
      {tiers.map((tier) => (
        <div key={tier.id} className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-foreground">{tier.name}</h3>
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">Level {tier.level}</span>
            </div>
            {editingTier === tier.id ? (
              <div className="flex gap-1">
                <button onClick={() => saveTier(tier.id)} disabled={saving} className="p-1.5 bg-primary/10 text-primary rounded hover:bg-primary/20">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => setEditingTier(null)} className="p-1.5 bg-muted text-muted-foreground rounded hover:bg-muted/80">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditingTier(tier.id);
                  setEditValues({
                    monthlyPrice: tier.monthlyPrice ?? "",
                    annualPrice: tier.annualPrice ?? "",
                    annualDiscountPct: String(tier.annualDiscountPct ?? ""),
                    description: tier.description || "",
                  });
                }}
                className="p-1.5 text-muted-foreground hover:text-foreground"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            )}
          </div>

          {editingTier === tier.id ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Monthly Price ($)</label>
                <input value={editValues.monthlyPrice || ""} onChange={(e) => setEditValues({ ...editValues, monthlyPrice: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Annual Price ($)</label>
                <input value={editValues.annualPrice || ""} onChange={(e) => setEditValues({ ...editValues, annualPrice: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Annual Discount %</label>
                <input value={editValues.annualDiscountPct || ""} onChange={(e) => setEditValues({ ...editValues, annualDiscountPct: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                <input value={editValues.description || ""} onChange={(e) => setEditValues({ ...editValues, description: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Monthly</p>
                <p className="text-lg font-bold text-foreground">${tier.monthlyPrice}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Annual</p>
                <p className="text-lg font-bold text-foreground">${tier.annualPrice}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Annual Discount</p>
                <p className="text-lg font-bold text-foreground">{tier.annualDiscountPct}%</p>
              </div>
            </div>
          )}

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Features</p>
              <button
                onClick={() => setTierFeatureEdit(tierFeatureEdit === tier.id ? null : tier.id)}
                className="text-xs text-primary hover:underline"
              >
                {tierFeatureEdit === tier.id ? "Done Editing" : "Edit Features"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(tier.features as string[]).map((f, i) => (
                <span key={i} className="text-xs bg-muted px-2 py-1 rounded-lg text-foreground/70 flex items-center gap-1">
                  {f}
                  {tierFeatureEdit === tier.id && (
                    <button
                      onClick={() => {
                        const updated = tier.features.filter((_, fi) => fi !== i);
                        saveTierFeatures(tier.id, updated);
                      }}
                      className="text-destructive hover:text-destructive/80 ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
            {tierFeatureEdit === tier.id && (
              <div className="flex gap-2 mt-2">
                <input
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  placeholder="New feature text..."
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newFeature.trim()) {
                      saveTierFeatures(tier.id, [...tier.features, newFeature.trim()]);
                      setNewFeature("");
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (newFeature.trim()) {
                      saveTierFeatures(tier.id, [...tier.features, newFeature.trim()]);
                      setNewFeature("");
                    }
                  }}
                  className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm hover:bg-primary/20"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

import { PLAN_SECTIONS } from "../../data/academy-data";
import { getImageUrl, getImageDimensions } from "./academyUtils";

export function PlanView() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-1">NQ Futures: ICT Trading Plan</h2>
      <p className="text-sm text-muted-foreground mb-6">Your mechanical, top-down trading framework</p>
      <div className="grid gap-4 md:grid-cols-2">
        {PLAN_SECTIONS.map((section) => (
          <div
            key={section.title}
            className="bg-card rounded-xl border overflow-hidden"
            style={section.title === "Conservative Entry" || section.title === "Prop Firm Survival Rules" ? { gridColumn: "1 / -1" } : undefined}
          >
            <div
              className="flex items-center gap-2.5 px-4 py-3 border-b"
              style={{ backgroundColor: section.color + "15" }}
            >
              <span className="text-sm font-bold" style={{ color: section.color }}>{section.title}</span>
            </div>
            <div className="p-1">
              {section.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 px-4 py-2.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                    style={{ backgroundColor: section.color }}
                  />
                  <div>
                    <span className="text-sm font-semibold">{item.label}</span>
                    <span className="text-sm text-muted-foreground ml-1.5">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
            {section.image && (
              <img
                src={getImageUrl(section.image)}
                alt={`${section.title} chart`}
                className="w-full"
                style={{ maxHeight: "320px", objectFit: "contain" }}
                loading="lazy"
                width={getImageDimensions(section.image).width}
                height={getImageDimensions(section.image).height}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export const CATEGORY_META: Record<string, { label: string; description: string; color: string }> = {
  core: { label: "Core ICT Indicators", description: "Essential tools that directly map to ICT concepts. Start with these.", color: "#00C896" },
  supporting: { label: "Supporting Indicators", description: "Helpful additions that provide extra confluence and context.", color: "#3B82F6" },
  optional: { label: "Optional / Advanced", description: "Nice-to-have tools for specific ICT models and setups.", color: "#8B5CF6" },
};


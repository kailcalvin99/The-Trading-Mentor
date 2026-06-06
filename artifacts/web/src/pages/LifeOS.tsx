const missionItems = [
  {
    label: "Today's Mission",
    value: "Protect deep focus and move the highest-leverage work forward.",
  },
  {
    label: "Current Bottleneck",
    value: "Too many open loops competing for morning attention.",
  },
  {
    label: "Next Best Action",
    value: "Clarify the one outcome that makes today feel complete.",
  },
];

const priorities = [
  "Complete the core execution block before noon.",
  "Review commitments and renegotiate anything non-essential.",
  "End the day with a five-minute reflection and system update.",
];

const executionLoop = [
  "Capture",
  "Clarify",
  "Organize",
  "Prioritize",
  "Schedule",
  "Execute",
  "Reflect",
  "Improve",
];

const lifeAreas = [
  { name: "Health", status: "Steady", note: "Recovery and movement tracked" },
  { name: "Money", status: "Review", note: "Weekly allocation pending" },
  {
    name: "Relationships",
    status: "Nurture",
    note: "One intentional check-in",
  },
  { name: "Work", status: "Focus", note: "Main objective selected" },
  { name: "Learning", status: "Active", note: "Reading block reserved" },
  { name: "Goals", status: "Aligned", note: "Quarterly aim visible" },
  { name: "Projects", status: "Clarify", note: "Next milestones drafted" },
];

export default function LifeOS() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#030504] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(16,185,129,0.16),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.08),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_38%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:64px_64px]" />

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 py-6 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        <header className="flex flex-col gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-400/10 shadow-[0_0_40px_rgba(16,185,129,0.18)]">
              <span className="text-lg font-semibold tracking-[-0.04em] text-emerald-200">
                LO
              </span>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.36em] text-emerald-200/80">
                LifeOS
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                Become who you intend to be.
              </h1>
            </div>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/62 backdrop-blur-xl">
            Execution System Prototype
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
          <article className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#090d0b]/90 p-6 shadow-2xl shadow-black/40 sm:p-8 lg:p-10">
            <div className="absolute right-0 top-0 h-56 w-56 translate-x-16 -translate-y-24 rounded-full bg-emerald-400/15 blur-3xl" />
            <div className="relative flex flex-col gap-8">
              <div>
                <p className="text-sm uppercase tracking-[0.34em] text-emerald-200/75">
                  AI Chief of Staff
                </p>
                <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">
                  Calm direction for the day in front of you.
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {missionItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-sm"
                  >
                    <p className="text-xs uppercase tracking-[0.24em] text-white/42">
                      {item.label}
                    </p>
                    <p className="mt-4 text-base leading-7 text-white/84">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <aside className="rounded-[2rem] border border-emerald-200/15 bg-emerald-300/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.32em] text-emerald-200/75">
                  Top 3 Priorities
                </p>
                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
                  Today’s operating brief
                </h3>
              </div>
              <span className="h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_22px_rgba(110,231,183,0.9)]" />
            </div>

            <ol className="mt-8 space-y-4">
              {priorities.map((priority, index) => (
                <li
                  key={priority}
                  className="flex gap-4 rounded-3xl border border-white/10 bg-black/20 p-4"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-300 text-sm font-semibold text-black">
                    {index + 1}
                  </span>
                  <p className="pt-1 text-sm leading-6 text-white/78 sm:text-base">
                    {priority}
                  </p>
                </li>
              ))}
            </ol>
          </aside>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-5 sm:p-7 lg:p-8">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.34em] text-emerald-200/75">
                Execution Loop
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">
                Intention converted into motion.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-white/54">
              Eight connected steps form the LifeOS operating rhythm, from
              open-loop capture to continuous improvement.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {executionLoop.map((step, index) => (
              <div key={step} className="group relative">
                <div className="hidden lg:block absolute left-[calc(100%-0.75rem)] top-1/2 h-px w-6 bg-emerald-200/25 group-last:hidden" />
                <div className="h-full rounded-3xl border border-white/10 bg-[#080b0a] p-5 transition duration-300 hover:border-emerald-200/35 hover:bg-emerald-300/[0.055]">
                  <span className="text-xs font-semibold tracking-[0.28em] text-emerald-200/70">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-5 text-xl font-semibold tracking-[-0.035em] text-white">
                    {step}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.34em] text-emerald-200/75">
                Life Areas
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">
                A calm map of what matters.
              </h2>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {lifeAreas.map((area) => (
              <article
                key={area.name}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xl font-semibold tracking-[-0.04em] text-white">
                    {area.name}
                  </h3>
                  <span className="rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-100">
                    {area.status}
                  </span>
                </div>
                <p className="mt-7 text-sm leading-6 text-white/52">
                  {area.note}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.055),rgba(16,185,129,0.075))] p-7 text-center shadow-2xl shadow-black/30 sm:p-10">
          <p className="text-sm uppercase tracking-[0.34em] text-emerald-200/75">
            LifeOS Device
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
            DAP Integration Coming Soon
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/54 sm:text-base">
            Future hardware support will extend the execution system beyond the
            screen while keeping the interface focused, quiet, and intentional.
          </p>
        </section>
      </section>
    </main>
  );
}

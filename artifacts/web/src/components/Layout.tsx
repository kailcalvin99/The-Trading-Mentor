import { NavLink, Outlet } from "react-router-dom";
import { Calendar, GraduationCap, Shield, BookOpen } from "lucide-react";

const navItems = [
  { to: "/", label: "Daily Planner", icon: Calendar },
  { to: "/academy", label: "ICT Academy", icon: GraduationCap },
  { to: "/risk-shield", label: "Risk Shield", icon: Shield },
  { to: "/journal", label: "Smart Journal", icon: BookOpen },
];

function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        }`
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="hidden lg:inline">{label}</span>
    </NavLink>
  );
}

function MobileNavItem({ to, label, icon: Icon }: { to: string; label: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 px-2 py-2 text-xs font-medium transition-colors ${
          isActive
            ? "text-primary"
            : "text-muted-foreground"
        }`
      }
    >
      <Icon className="h-5 w-5" />
      <span className="truncate max-w-[72px]">{label}</span>
    </NavLink>
  );
}

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden md:flex flex-col w-16 lg:w-56 border-r border-sidebar-border bg-sidebar shrink-0">
        <div className="flex items-center gap-2 px-3 h-14 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-sm">ICT</span>
          </div>
          <span className="hidden lg:block text-sm font-semibold text-sidebar-foreground truncate">
            Trading Mentor
          </span>
        </div>

        <nav className="flex flex-col gap-1 p-2 flex-1">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>

        <nav className="md:hidden flex items-center justify-around border-t border-border bg-sidebar h-16 shrink-0">
          {navItems.map((item) => (
            <MobileNavItem key={item.to} {...item} />
          ))}
        </nav>
      </div>
    </div>
  );
}

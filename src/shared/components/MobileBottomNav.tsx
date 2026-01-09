import { NavLink } from "react-router-dom";
import { LayoutDashboard, ClipboardList, Target, Users, FileText, Zap, Navigation } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useAuth } from "@/features/auth/context/AuthContext";

export function MobileBottomNav() {
  const { rep } = useAuth();

  const allNavItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", roles: ['admin', 'rep'] },
    { to: "/routes", icon: Navigation, label: "Routen", roles: ['admin', 'rep'] },
    { to: "/task-distribution", icon: ClipboardList, label: "Verteilung", roles: ['admin'] },
    { to: "/campaigns", icon: Target, label: "Campaigns", roles: ['admin'] },
    { to: "/customers", icon: Users, label: "Kunden", roles: ['admin'] },
  ];

  const navItems = rep?.role === 'rep'
    ? [
      { to: "/", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/routes", icon: Navigation, label: "Routen" },
      { to: "/?tab=customers", icon: Users, label: "Kunden" },
    ]
    : allNavItems.filter(item => item.roles.includes(rep?.role || 'rep'));

  return (
    <nav className="flex md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 pb-safe">
      <div className="flex w-full justify-around items-center h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[64px] transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("h-6 w-6", isActive && "fill-primary/20")} />
                <span className="text-xs font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

import { NavLink, useSearchParams } from "react-router-dom";
import { LayoutDashboard, ClipboardList, Target, Users, FileText, Zap, Navigation, Gift, Megaphone } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useAuth } from "@/features/auth/context/AuthContext";

export function MobileBottomNav() {
  const { rep } = useAuth();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get("tab");

  const allNavItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", roles: ['admin', 'rep'] },
    { to: "/routes", icon: Navigation, label: "Routen", roles: ['admin', 'rep'] },
    { to: "/task-distribution", icon: ClipboardList, label: "Verteilung", roles: ['admin'] },
    { to: "/campaigns", icon: Target, label: "Campaigns", roles: ['admin'] },
    { to: "/customers", icon: Users, label: "Kunden", roles: ['admin'] },
  ];

  // Rep nav items - alle wichtigen Tabs direkt erreichbar
  const repNavItems = [
    { to: "/?tab=tasks", icon: ClipboardList, label: "Aufgaben", tab: "tasks" },
    { to: "/?tab=offers", icon: Gift, label: "Angebote", tab: "offers" },
    { to: "/?tab=actions", icon: Megaphone, label: "Aktionen", tab: "actions" },
    { to: "/?tab=campaigns", icon: Target, label: "Kampagnen", tab: "campaigns" },
    { to: "/?tab=customers", icon: Users, label: "Kunden", tab: "customers" },
  ];

  const navItems = rep?.role === 'rep'
    ? repNavItems
    : allNavItems.filter(item => item.roles.includes(rep?.role || 'rep'));

  const isRepNav = rep?.role === 'rep';

  return (
    <nav className="flex md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 pb-safe">
      <div className="flex w-full justify-around items-center h-16 overflow-x-auto no-scrollbar">
        {navItems.map((item) => {
          // For rep nav, check if current tab matches
          const isActive = isRepNav
            ? (item as any).tab === (currentTab || 'tasks')
            : false;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={!isRepNav && item.to === "/"}
              className={({ isActive: routeActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 px-2 py-1 min-w-[56px] transition-colors flex-shrink-0",
                  (isRepNav ? isActive : routeActive)
                    ? "text-primary"
                    : "text-muted-foreground"
                )
              }
            >
              {({ isActive: routeActive }) => (
                <>
                  <item.icon className={cn("h-5 w-5", (isRepNav ? isActive : routeActive) && "fill-primary/20")} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

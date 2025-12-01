import { NavLink } from "react-router-dom";
import { LayoutDashboard, Target, Users, LogOut, ClipboardList, Menu, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { signOut, rep } = useAuth();

  // Filter nav items based on role
  const allNavItems = [
    { to: "/", icon: LayoutDashboard, label: "Außendienst", roles: ['admin', 'rep'] },
    { to: "/task-distribution", icon: ClipboardList, label: "Aufgaben Verteilung", roles: ['admin'] },
    { to: "/campaigns", icon: Target, label: "Campaigns", roles: ['admin'] },
    { to: "/campaign-performance", icon: BarChart3, label: "Kampagnen Performance", roles: ['admin'] },
    { to: "/customers", icon: Users, label: "Customers", roles: ['admin'] },
  ];

  const navItems = allNavItems.filter(item =>
    item.roles.includes(rep?.role || 'rep')
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-muted/30">
      {/* Mobile Header - Sticky */}
      <header className="md:hidden sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Menu className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-bold text-foreground">Dashboard</h1>
        </div>
        {rep && (
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{getInitials(rep.name)}</AvatarFallback>
          </Avatar>
        )}
      </header>

      {/* Desktop Sidebar - Hidden on Mobile */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card relative flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
        </div>
        <nav className="space-y-1 px-3 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 space-y-3 border-t">
          {rep && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {rep.name}
            </div>
          )}
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={signOut}
          >
            <LogOut className="h-5 w-5" />
            Abmelden
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        <div className="container mx-auto p-4 md:p-8 w-full">{children}</div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}

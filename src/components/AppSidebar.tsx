import { useLocation, useNavigate } from "react-router-dom";
import { Home, Map, GitCompare, List, Star, BarChart3 } from "lucide-react";

const NAV_ITEMS = [
  { icon: Home, path: "/", label: "Главная" },
  { icon: Map, path: "/", label: "Карта" },
  { icon: GitCompare, path: "/compare", label: "Сравнение" },
  { icon: List, path: "/", label: "Список" },
  { icon: Star, path: "/", label: "Избранное" },
  { icon: BarChart3, path: "/", label: "Аналитика" },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="w-14 bg-sidebar flex flex-col items-center py-4 gap-1 border-r border-sidebar-border shrink-0">
      {/* Logo */}
      <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center mb-4 cursor-pointer" onClick={() => navigate("/")}>
        <span className="text-sidebar-primary-foreground font-bold text-sm">G</span>
      </div>

      {/* Nav icons */}
      {NAV_ITEMS.map((item, i) => {
        const isActive = location.pathname === item.path && (i === 0 || item.path !== "/");
        // Special case: compare is active on /compare
        const active = item.path === "/compare" ? location.pathname === "/compare" : (i === 0 && location.pathname === "/");

        return (
          <button
            key={i}
            onClick={() => navigate(item.path)}
            title={item.label}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
              active
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
          >
            <item.icon className="w-5 h-5" />
          </button>
        );
      })}
    </aside>
  );
};

export default AppSidebar;

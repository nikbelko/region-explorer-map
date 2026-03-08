import { useState } from "react";
import { Search, ChevronDown, CheckSquare, XSquare } from "lucide-react";
import { BRANDS, Brand, BRAND_COLOR_MAP } from "@/data/regions";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface BrandFiltersProps {
  selectedBrands: Brand[];
  onToggleBrand: (brand: Brand) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const BrandFilters = ({ selectedBrands, onToggleBrand, onSelectAll, onDeselectAll }: BrandFiltersProps) => {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  const filteredBrands = BRANDS.filter((brand) =>
    brand.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between w-full">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1 group"
        >
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
          />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Бренды
          </h3>
        </button>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onSelectAll}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                <CheckSquare className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top"><p className="text-xs">Выбрать все</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onDeselectAll}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                <XSquare className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top"><p className="text-xs">Сбросить все</p></TooltipContent>
          </Tooltip>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск бренда..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {filteredBrands.map((brand) => {
            const isSelected = selectedBrands.includes(brand);
            const color = BRAND_COLOR_MAP[brand];
            return (
              <div
                key={brand}
                onClick={() => onToggleBrand(brand)}
                className="flex items-center gap-3 cursor-pointer group px-2 py-1.5 rounded-md hover:bg-secondary/50 transition-colors"
              >
                <div
                  className="w-4 h-4 rounded border-2 flex items-center justify-center transition-all"
                  style={{
                    borderColor: isSelected ? color : "hsl(220, 16%, 30%)",
                    backgroundColor: isSelected ? color : "transparent",
                  }}
                >
                  {isSelected && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5L4 7L8 3" stroke="hsl(220, 25%, 10%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span
                  className="text-sm transition-colors"
                  style={{ color: isSelected ? color : "hsl(210, 20%, 70%)" }}
                >
                  {brand}
                </span>
              </div>
            );
          })}

          {filteredBrands.length === 0 && (
            <p className="text-xs text-muted-foreground italic px-2 py-2">Ничего не найдено</p>
          )}
        </>
      )}
    </div>
  );
};

export default BrandFilters;

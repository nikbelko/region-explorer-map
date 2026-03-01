import { useState } from "react";
import { ChevronDown, CheckSquare, XSquare } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { Brand } from "@/data/regions";

const CATEGORIES = ["Пицца", "Сендвичи", "Бургеры", "Гриль"] as const;
export type Category = typeof CATEGORIES[number];

export const CATEGORY_BRAND_MAP: Record<Category, Brand[]> = {
  "Пицца": ["Domino's", "Papa John's"],
  "Сендвичи": ["Subway"],
  "Бургеры": ["McDonald's", "KFC"],
  "Гриль": ["Nando's"],
};

interface CategoryFiltersProps {
  selectedCategories: Category[];
  onToggleCategory: (cat: Category) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

const CATEGORY_COLORS: Record<Category, string> = {
  "Пицца": "hsl(0, 72%, 55%)",
  "Сендвичи": "hsl(130, 50%, 50%)",
  "Бургеры": "hsl(45, 85%, 55%)",
  "Гриль": "hsl(20, 80%, 55%)",
};

const CategoryFilters = ({ selectedCategories, onToggleCategory, onSelectAll, onDeselectAll }: CategoryFiltersProps) => {
  const [collapsed, setCollapsed] = useState(false);

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
            Категория продукта
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
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategories.includes(cat);
            const color = CATEGORY_COLORS[cat];
            return (
              <div
                key={cat}
                onClick={() => onToggleCategory(cat)}
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
                  {cat}
                </span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

export { CATEGORIES };
export default CategoryFilters;

import { Brand } from "@/data/regions";

const CATEGORIES = ["Пицца", "Сендвичи", "Бургеры", "Гриль"] as const;
export type Category = typeof CATEGORIES[number];

export const CATEGORY_BRAND_MAP: Record<Category, Brand[]> = {
  "Пицца": ["Domino's", "Papa John's"],
  "Сендвичи": ["Subway"],
  "Бургеры": ["McDonald's", "KFC"],
  "Гриль": ["Nando's"],
};

const CATEGORY_COLORS: Record<Category, string> = {
  "Пицца": "#ef4444",
  "Сендвичи": "#10b981",
  "Бургеры": "#f59e0b",
  "Гриль": "#f97316",
};

const CATEGORY_ICONS: Record<Category, string> = {
  "Пицца": "🍕",
  "Сендвичи": "🥪",
  "Бургеры": "🍔",
  "Гриль": "🍗",
};

interface CategoryFiltersProps {
  selectedCategories: Category[];
  onToggleCategory: (cat: Category) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

const CategoryFilters = ({
  selectedCategories,
  onToggleCategory,
  onSelectAll,
  onDeselectAll,
}: CategoryFiltersProps) => {
  return (
    <div className="border-t border-gray-100">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Category
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onSelectAll}
            className="text-xs text-blue-600 hover:text-blue-700 hover:underline transition-colors"
          >
            All
          </button>
          <span className="text-gray-300 text-xs">·</span>
          <button
            onClick={onDeselectAll}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            None
          </button>
        </div>
      </div>

      {/* Category rows */}
      <div>
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategories.includes(cat);
          const color = CATEGORY_COLORS[cat];
          return (
            <div
              key={cat}
              onClick={() => onToggleCategory(cat)}
              className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${
                isSelected ? "bg-blue-50/40 hover:bg-blue-50/60" : "hover:bg-gray-50"
              }`}
            >
              {/* Color dot */}
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              {/* Icon + name */}
              <span className={`text-sm flex-1 transition-colors ${
                isSelected ? "text-gray-900 font-medium" : "text-gray-400"
              }`}>
                <span className="mr-1.5">{CATEGORY_ICONS[cat]}</span>
                {cat}
              </span>
              {/* Brands count badge */}
              <span className="text-[10px] text-gray-400">
                {CATEGORY_BRAND_MAP[cat].length} chain{CATEGORY_BRAND_MAP[cat].length > 1 ? "s" : ""}
              </span>
              {/* Checkmark */}
              {isSelected && (
                <svg className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { CATEGORIES };
export default CategoryFilters;

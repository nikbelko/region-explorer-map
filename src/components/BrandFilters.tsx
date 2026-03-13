import { BRANDS, Brand, BRAND_COLOR_MAP } from "@/data/regions";

interface BrandFiltersProps {
  selectedBrands: Brand[];
  onToggleBrand: (brand: Brand) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  searchQuery?: string;
}

const BrandFilters = ({
  selectedBrands,
  onToggleBrand,
  onSelectAll,
  onDeselectAll,
  searchQuery = "",
}: BrandFiltersProps) => {
  const filteredBrands = BRANDS.filter((brand) =>
    brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#d1d5db]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Chains</span>
        <div className="flex items-center gap-1.5">
          <button onClick={onSelectAll} className="text-xs text-blue-600 hover:text-blue-700 hover:underline transition-colors">All</button>
          <span className="text-gray-300 text-xs">·</span>
          <button onClick={onDeselectAll} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">None</button>
        </div>
      </div>

      <div>
        {filteredBrands.map((brand) => {
          const isSelected = selectedBrands.includes(brand);
          const color = BRAND_COLOR_MAP[brand];
          return (
            <div
              key={brand}
              onClick={() => onToggleBrand(brand)}
              className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors border-b border-[#e8eaed] last:border-0 ${
                isSelected ? "bg-blue-50/60 hover:bg-blue-50/80" : "hover:bg-white/60"
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className={`text-sm flex-1 transition-colors ${isSelected ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                {brand}
              </span>
              {isSelected && (
                <svg className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          );
        })}
        {filteredBrands.length === 0 && (
          <p className="text-xs text-gray-400 italic px-4 py-3">No results</p>
        )}
      </div>
    </div>
  );
};

export default BrandFilters;

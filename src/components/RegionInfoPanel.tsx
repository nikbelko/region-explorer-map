import { X } from "lucide-react";
import { RegionStats } from "@/data/regions";
import { getRegionPopulation } from "@/data/regionPopulation";

interface RegionInfoPanelProps {
  selectedRegion: string | null;
  regionStats: RegionStats | null;
  onClearRegion: () => void;
}

const RegionInfoPanel = ({ selectedRegion, regionStats, onClearRegion }: RegionInfoPanelProps) => {
  if (!selectedRegion) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Инфопанель региона
        </h3>
        <p className="text-sm text-muted-foreground italic">
          Выберите регион на карте
        </p>
      </div>
    );
  }

  const population = getRegionPopulation(selectedRegion);
  const totalPoints = regionStats?.totalPoints ?? 0;

  // Derived metrics
  const concentrationIndex = population && population > 0
    ? Math.round((totalPoints / (population * 1_000_000)) * 100_000 * 10) / 10
    : null;

  const top3Brands = regionStats?.brands.slice(0, 3) ?? [];
  const top3Share = totalPoints > 0
    ? Math.round(top3Brands.reduce((s, b) => s + b.count, 0) / totalPoints * 100)
    : 0;

  // Pseudo-random quarterly change based on region name
  let hash = 0;
  for (let i = 0; i < selectedRegion.length; i++) {
    hash = selectedRegion.charCodeAt(i) + ((hash << 5) - hash);
  }
  const quarterlyChange = (Math.abs(hash) % 31) - 8; // range roughly -8 to +22

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Инфопанель региона
        </h3>
        <button
          onClick={onClearRegion}
          className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Сбросить выбор региона"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-4">
        <h4 className="text-lg font-bold text-foreground">{selectedRegion}</h4>

        {population && (
          <p className="text-xs text-muted-foreground italic">
            Население региона: ~{population} млн
            <span className="ml-1 text-[10px] opacity-60">(эксп. данные)</span>
          </p>
        )}

        {/* Key metrics block */}
        <div className="grid grid-cols-1 gap-2">
          <div className="rounded-md bg-secondary p-3">
            <p className="text-xs text-muted-foreground">Всего точек</p>
            <p className="text-2xl font-bold text-primary">{totalPoints}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md bg-secondary p-2.5 group/density relative">
              <p className="text-[10px] text-muted-foreground leading-tight cursor-help">
                Плотность присутствия
                <span className="absolute left-1/2 -translate-x-1/2 -top-8 bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded border border-border whitespace-nowrap opacity-0 group-hover/density:opacity-100 transition-opacity pointer-events-none z-10">
                  Плотность точек на 100k населения
                </span>
              </p>
              <p className="text-base font-bold text-foreground mt-0.5">
                {concentrationIndex !== null ? concentrationIndex : "—"}
              </p>
            </div>
            <div className="rounded-md bg-secondary p-2.5">
              <p className="text-[10px] text-muted-foreground leading-tight">Топ-3 доля рынка</p>
              <p className="text-base font-bold text-foreground mt-0.5">
                {totalPoints > 0 ? `${top3Share}%` : "—"}
              </p>
            </div>
          </div>

          <div className="rounded-md bg-secondary p-2.5">
            <p className="text-[10px] text-muted-foreground">Динамика за квартал</p>
            <p className={`text-base font-bold mt-0.5 ${quarterlyChange >= 0 ? "text-green-400" : "text-red-400"}`}>
              {quarterlyChange >= 0 ? "+" : ""}{quarterlyChange} точек
              <span className="ml-1 text-[10px] text-muted-foreground font-normal">(эксп.)</span>
            </p>
          </div>
        </div>

        {/* Brand breakdown */}
        {regionStats && regionStats.totalPoints > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              По брендам
            </p>
            {regionStats.brands.map((b) => (
              <div key={b.brand} className="space-y-1">
                <div className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: b.color }} />
                    <span className="text-sm text-foreground">{b.brand}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">{b.count}</span>
                    <span className="text-xs text-muted-foreground w-10 text-right">{b.percent}%</span>
                  </div>
                </div>
                <div className="h-1 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${b.percent}%`, backgroundColor: b.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Нет точек, соответствующих критериям
          </p>
        )}
      </div>
    </div>
  );
};

export default RegionInfoPanel;

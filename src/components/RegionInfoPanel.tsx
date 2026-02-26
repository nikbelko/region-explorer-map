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

        {regionStats && regionStats.totalPoints > 0 ? (
          <>
            <div className="rounded-md bg-secondary p-3">
              <p className="text-xs text-muted-foreground">Всего точек</p>
              <p className="text-2xl font-bold text-primary">{regionStats.totalPoints}</p>
            </div>

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
          </>
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

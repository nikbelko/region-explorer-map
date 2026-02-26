import { RegionStats } from "@/data/regions";

interface RegionInfoPanelProps {
  selectedRegion: string | null;
  regionStats: RegionStats | null;
}

const RegionInfoPanel = ({ selectedRegion, regionStats }: RegionInfoPanelProps) => {
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

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Инфопанель региона
      </h3>
      <div className="space-y-4">
        <h4 className="text-lg font-bold text-foreground">{selectedRegion}</h4>

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
                <div key={b.brand} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: b.color }} />
                    <span className="text-sm text-foreground">{b.brand}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">{b.count}</span>
                    <span className="text-xs text-muted-foreground w-10 text-right">{b.percent}%</span>
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

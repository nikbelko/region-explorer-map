interface RegionInfoPanelProps {
  selectedRegion: string | null;
}

const RegionInfoPanel = ({ selectedRegion }: RegionInfoPanelProps) => {
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
      <div className="space-y-3">
        <h4 className="text-lg font-bold text-foreground">{selectedRegion}</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-secondary p-3">
            <p className="text-xs text-muted-foreground">Рестораны</p>
            <p className="text-xl font-bold text-primary">—</p>
          </div>
          <div className="rounded-md bg-secondary p-3">
            <p className="text-xs text-muted-foreground">Бренды</p>
            <p className="text-xl font-bold text-primary">—</p>
          </div>
          <div className="rounded-md bg-secondary p-3">
            <p className="text-xs text-muted-foreground">Плотность</p>
            <p className="text-xl font-bold text-primary">—</p>
          </div>
          <div className="rounded-md bg-secondary p-3">
            <p className="text-xs text-muted-foreground">Рейтинг</p>
            <p className="text-xl font-bold text-primary">—</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Данные будут заполнены на следующем этапе
        </p>
      </div>
    </div>
  );
};

export default RegionInfoPanel;

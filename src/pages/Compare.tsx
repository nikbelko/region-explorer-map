{/* Table with sticky header - ИСПРАВЛЕНО */}
<div className="flex-1 overflow-y-auto overflow-visible relative" style={{ zIndex: 1 }}>
  <table className="w-full text-sm border-collapse">
    <thead className="sticky top-0 z-30 bg-gray-50">
      <tr className="border-b border-gray-200">
        <th className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-left px-3 py-2 w-[110px]">Region</th>
        <th className="text-[10px] font-semibold text-center px-2 py-2 w-12" style={{ color: BRAND_A_COLOR }}>A</th>
        <th className="text-[10px] font-semibold text-center px-2 py-2 w-12" style={{ color: BRAND_B_COLOR }}>B</th>
        <th className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-center px-2 py-2 w-12">Δ</th>
        <th className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-left px-2 py-2">
          <UITooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 cursor-help">
                <span>Saturation gap</span>
                <Info className="w-2.5 h-2.5 text-gray-400" />
              </div>
            </TooltipTrigger>
            <TooltipContent 
              className="bg-[#1a1d24] text-white border-none rounded-lg shadow-lg px-3 py-1.5 text-xs z-[100]"
              side="bottom"
              align="start"
              sideOffset={5}
            >
              Saturation index difference
            </TooltipContent>
          </UITooltip>
        </th>
        <th className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-left px-2 py-2">
          <UITooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 cursor-help">
                <span>Battle</span>
                <Info className="w-2.5 h-2.5 text-gray-400" />
              </div>
            </TooltipTrigger>
            <TooltipContent 
              className="bg-[#1a1d24] text-white border-none rounded-lg shadow-lg px-3 py-1.5 text-xs z-[100]"
              side="bottom"
              align="start"
              sideOffset={5}
            >
              Percent of A near B locations in 500m
            </TooltipContent>
          </UITooltip>
        </th>
      </tr>
    </thead>
    <tbody>
      {regionMetrics.map((m) => {
        const isSelected = selectedRegion === m.region;
        const displayName = m.region.replace(" (England)", "");
        const delta = Math.abs(m.countA - m.countB);
        const leader = m.countA > m.countB ? brandA : brandB;
        
        return (
          <tr
            key={m.region}
            className={`border-b border-gray-50 cursor-pointer transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}
            onClick={() => setSelectedRegion(m.region)}
          >
            <td className="text-xs py-2 px-3 font-medium text-gray-700">{displayName}</td>
            <td className="text-xs py-2 px-2 text-center font-semibold text-gray-800">{m.countA}</td>
            <td className="text-xs py-2 px-2 text-center font-semibold text-gray-800">{m.countB}</td>
            <td className="text-xs py-2 px-2 text-center">
              <div className="flex flex-col items-center">
                <span className="text-xs font-medium text-gray-800">{delta}</span>
                <span className="text-[9px] text-gray-400">{leader}</span>
              </div>
            </td>
            <td className="text-xs py-2 px-2">
              <div className="flex flex-col gap-0.5">
                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full"
                    style={{ 
                      width: `${Math.min(100, m.saturationGap * 20)}%`,
                      backgroundColor: m.saturationA > m.saturationB ? BRAND_A_COLOR : BRAND_B_COLOR
                    }}
                  />
                </div>
                <span className="text-[9px] text-gray-400 tabular-nums">
                  {m.saturationGap.toFixed(2)}/100k
                </span>
              </div>
            </td>
            <td className="text-xs py-2 px-2">
              <div className="flex items-center gap-1">
                <Sword className={`w-3 h-3 ${m.battleIndex > 70 ? "text-red-500" : "text-gray-300"}`} />
                <span className={`text-xs font-medium ${m.battleIndex > 70 ? "text-red-600" : "text-gray-600"}`}>
                  {m.battleIndex}%
                </span>
              </div>
            </td>
          </tr>
        );
      })}
      {regionMetrics.length > 0 && (
        <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
          <td className="text-xs py-2 px-3 font-bold">Total</td>
          <td className="text-xs py-2 px-2 text-center font-bold text-gray-900">{totals.totalA}</td>
          <td className="text-xs py-2 px-2 text-center font-bold text-gray-900">{totals.totalB}</td>
          <td className="text-xs py-2 px-2 text-center font-bold text-gray-900">{totals.totalDelta}</td>
          <td className="text-xs py-2 px-2">
            <span className="text-[10px] text-gray-500">avg {totals.avgSaturationGap}</span>
          </td>
          <td className="text-xs py-2 px-2">
            <div className="flex items-center gap-1">
              <Sword className="w-3 h-3 text-gray-400" />
              <span className="text-xs font-medium text-gray-600">{totals.avgBattle}%</span>
            </div>
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>

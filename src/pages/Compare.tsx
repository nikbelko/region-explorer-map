import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lightbulb, Map, BarChart2, List, Star, Settings, LogOut, ChevronRight, Crosshair, Target, Sword, Radio, Plus, Minus } from "lucide-react";
import L from "leaflet";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import { Brand, BRANDS, BRAND_CONFIGS } from "@/data/regions";
import { useRestaurantData } from "@/hooks/useRestaurantData";
import { getRegionPopulation, getRegionArea } from "@/data/regionPopulation";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ResponsiveContainer, Tooltip } from 'recharts';

const BRAND_A_COLOR = "#3B82F6";
const BRAND_B_COLOR = "#F97316";
const CONFLICT_COLOR = "#DC2626";

type MapLayer = "both" | "conflict" | "a" | "b";

interface RegionMetrics {
  region: string;
  countA: number;
  countB: number;
  saturationA: number;
  saturationB: number;
  densityA: number;
  densityB: number;
  growthA: number;
  growthB: number;
  battleIndex: number;
  saturationGap: number;
  conflictIntensity: number;
  leader: "A" | "B" | "tie";
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return h;
}

function getBrandDynamics(region: string, brand: string): number {
  const base = (Math.abs(hashStr(`${region}:${brand}`)) % 21) - 6;
  return Math.round(base);
}

function calculateBattleIndex(
  pointsA: Array<{ lat: number; lng: number }>,
  pointsB: Array<{ lat: number; lng: number }>,
  radiusMeters: number = 500
): number {
  if (pointsA.length === 0) return 0;
  
  let hasNearby = 0;
  
  for (const pointA of pointsA) {
    let found = false;
    for (const pointB of pointsB) {
      const R = 6371e3;
      const φ1 = pointA.lat * Math.PI / 180;
      const φ2 = pointB.lat * Math.PI / 180;
      const Δφ = (pointB.lat - pointA.lat) * Math.PI / 180;
      const Δλ = (pointB.lng - pointA.lng) * Math.PI / 180;
      
      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      if (distance <= radiusMeters) {
        found = true;
        break;
      }
    }
    if (found) hasNearby++;
  }
  
  return Math.round((hasNearby / pointsA.length) * 100);
}

const Compare = () => {
  const navigate = useNavigate();
  const { restaurants, loading: dataLoading } = useRestaurantData();
  const [brandA, setBrandA] = useState<Brand>("McDonald's");
  const [brandB, setBrandB] = useState<Brand>("KFC");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [regionsData, setRegionsData] = useState<any>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [activeLayer, setActiveLayer] = useState<MapLayer>("both");
  const [showRadar, setShowRadar] = useState(false); // По умолчанию свернут

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layersRef = useRef<L.GeoJSON | null>(null);
  const markerLayerA = useRef<L.LayerGroup | null>(null);
  const markerLayerB = useRef<L.LayerGroup | null>(null);
  const conflictLayer = useRef<L.LayerGroup | null>(null);
  const hexagonLayer = useRef<L.LayerGroup | null>(null);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, { center: [52.5, -1.5], zoom: 6, zoomControl: true, attributionControl: true });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd", maxZoom: 19,
    }).addTo(map);
    mapInstance.current = map;
    markerLayerA.current = L.layerGroup().addTo(map);
    markerLayerB.current = L.layerGroup().addTo(map);
    conflictLayer.current = L.layerGroup().addTo(map);
    hexagonLayer.current = L.layerGroup().addTo(map);

    fetch("/data/uk-regions.geojson").then((res) => res.json()).then((data) => {
      setRegionsData(data);
      const geoLayer = L.geoJSON(data, {
        style: () => ({ color: "#ffffff", weight: 1.5, fillColor: "#e5e7eb", fillOpacity: 0.5 }),
        onEachFeature: (feature, layer) => {
          const name = feature?.properties?.ITL125NM || `Region ${feature?.id || "unknown"}`;
          (layer as any)._regionName = name;
          layer.on("click", () => setSelectedRegion(name));
        },
      }).addTo(map);
      layersRef.current = geoLayer;
      setMapLoading(false);
    }).catch(() => setMapLoading(false));

    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  // Update markers and layers
  useEffect(() => {
    if (!markerLayerA.current || !markerLayerB.current || !conflictLayer.current || !hexagonLayer.current) return;
    
    markerLayerA.current.clearLayers();
    markerLayerB.current.clearLayers();
    conflictLayer.current.clearLayers();
    hexagonLayer.current.clearLayers();

    const pointsA: Array<{ lat: number; lng: number }> = [];
    const pointsB: Array<{ lat: number; lng: number }> = [];

    restaurants.forEach((r) => {
      if (r.brand === brandA) {
        const m = L.circleMarker([r.lat, r.lng], { 
          radius: 5, 
          fillColor: BRAND_A_COLOR, 
          color: "#fff", 
          weight: 1, 
          fillOpacity: activeLayer === "a" || activeLayer === "both" ? 0.9 : 0.2 
        });
        m.bindTooltip(`<strong style="color:${BRAND_A_COLOR}">${r.brand}</strong><br/>${r.name}`, 
          { direction: "top", offset: [0, -6], className: "brand-tooltip" });
        markerLayerA.current!.addLayer(m);
        pointsA.push({ lat: r.lat, lng: r.lng });
      } else if (r.brand === brandB) {
        const m = L.circleMarker([r.lat, r.lng], { 
          radius: 5, 
          fillColor: BRAND_B_COLOR, 
          color: "#fff", 
          weight: 1, 
          fillOpacity: activeLayer === "b" || activeLayer === "both" ? 0.9 : 0.2 
        });
        m.bindTooltip(`<strong style="color:${BRAND_B_COLOR}">${r.brand}</strong><br/>${r.name}`, 
          { direction: "top", offset: [0, -6], className: "brand-tooltip" });
        markerLayerB.current!.addLayer(m);
        pointsB.push({ lat: r.lat, lng: r.lng });
      }
    });

    // Create conflict zones (hexagons)
    if (activeLayer === "conflict" && pointsA.length > 0 && pointsB.length > 0) {
      const bounds = L.latLngBounds(pointsA.concat(pointsB).map(p => [p.lat, p.lng]));
      const hexSize = 0.05;
      
      for (let lat = bounds.getSouth(); lat <= bounds.getNorth(); lat += hexSize * 1.5) {
        for (let lng = bounds.getWest(); lng <= bounds.getEast(); lng += hexSize * Math.sqrt(3)) {
          const nearbyA = pointsA.filter(p => 
            Math.abs(p.lat - lat) < hexSize && Math.abs(p.lng - lng) < hexSize
          ).length;
          const nearbyB = pointsB.filter(p => 
            Math.abs(p.lat - lat) < hexSize && Math.abs(p.lng - lng) < hexSize
          ).length;
          
          if (nearbyA > 0 && nearbyB > 0) {
            const intensity = Math.min(100, (nearbyA + nearbyB) * 20);
            const hexagon = L.circleMarker([lat, lng], {
              radius: 8,
              fillColor: CONFLICT_COLOR,
              color: "#fff",
              weight: 1,
              fillOpacity: intensity / 100,
              opacity: 0.5
            });
            hexagon.bindTooltip(
              `Конфликтная зона<br/>${brandA}: ${nearbyA}, ${brandB}: ${nearbyB}`,
              { direction: "top" }
            );
            hexagonLayer.current!.addLayer(hexagon);
          }
        }
      }
    }
  }, [brandA, brandB, restaurants, activeLayer]);

  // Calculate region metrics
  const regionMetrics = useMemo<RegionMetrics[]>(() => {
    if (!regionsData || restaurants.length === 0) return [];
    
    const features = regionsData.features || [];
    const metrics: RegionMetrics[] = [];
    
    for (const feature of features) {
      const name = feature?.properties?.ITL125NM || `Region ${feature?.id || "unknown"}`;
      const population = getRegionPopulation(name) || 5.0;
      const area = getRegionArea(name) || 10000;
      
      let countA = 0, countB = 0;
      const pointsA: Array<{ lat: number; lng: number }> = [];
      const pointsB: Array<{ lat: number; lng: number }> = [];
      
      for (const r of restaurants) {
        if (r.brand !== brandA && r.brand !== brandB) continue;
        try {
          if (booleanPointInPolygon(turfPoint([r.lng, r.lat]), feature)) {
            if (r.brand === brandA) {
              countA++;
              pointsA.push({ lat: r.lat, lng: r.lng });
            } else {
              countB++;
              pointsB.push({ lat: r.lat, lng: r.lng });
            }
          }
        } catch { /**/ }
      }
      
      const saturationA = Math.round((countA / population) * 100) / 100;
      const saturationB = Math.round((countB / population) * 100) / 100;
      const densityA = Math.round((countA / area) * 1000 * 100) / 100;
      const densityB = Math.round((countB / area) * 1000 * 100) / 100;
      const growthA = getBrandDynamics(name, brandA);
      const growthB = getBrandDynamics(name, brandB);
      const battleIndex = calculateBattleIndex(pointsA, pointsB);
      const saturationGap = Math.abs(saturationA - saturationB);
      const conflictIntensity = Math.min(100, (battleIndex + (pointsB.length > 0 ? 50 : 0)) / 2);
      
      metrics.push({
        region: name,
        countA,
        countB,
        saturationA,
        saturationB,
        densityA,
        densityB,
        growthA,
        growthB,
        battleIndex,
        saturationGap,
        conflictIntensity,
        leader: countA > countB ? "A" : countB > countA ? "B" : "tie"
      });
    }
    
    return metrics.sort((a, b) => (b.countA + b.countB) - (a.countA + a.countB));
  }, [regionsData, restaurants, brandA, brandB]);

  // Radar chart data
  const radarData = useMemo(() => {
    if (selectedRegion === null || regionMetrics.length === 0) return [];
    
    const selected = regionMetrics.find(m => m.region === selectedRegion);
    if (!selected) return [];
    
    const maxSaturation = Math.max(...regionMetrics.map(m => Math.max(m.saturationA, m.saturationB)));
    const maxDensity = Math.max(...regionMetrics.map(m => Math.max(m.densityA, m.densityB)));
    const maxGrowth = Math.max(...regionMetrics.map(m => Math.max(m.growthA, m.growthB)));
    
    return [
      {
        metric: "Saturation",
        [brandA]: Math.round((selected.saturationA / maxSaturation) * 100),
        [brandB]: Math.round((selected.saturationB / maxSaturation) * 100),
        fullMark: 100,
      },
      {
        metric: "Density",
        [brandA]: Math.round((selected.densityA / maxDensity) * 100),
        [brandB]: Math.round((selected.densityB / maxDensity) * 100),
        fullMark: 100,
      },
      {
        metric: "Growth",
        [brandA]: Math.round(((selected.growthA + 10) / 20) * 100),
        [brandB]: Math.round(((selected.growthB + 10) / 20) * 100),
        fullMark: 100,
      },
      {
        metric: "Battle",
        [brandA]: selected.battleIndex,
        [brandB]: selected.battleIndex,
        fullMark: 100,
      },
    ];
  }, [selectedRegion, regionMetrics, brandA, brandB]);

  // Color regions
  useEffect(() => {
    if (!layersRef.current) return;
    
    const leaderMap: Record<string, "A" | "B" | "tie"> = {};
    const intensityMap: Record<string, number> = {};
    for (const m of regionMetrics) {
      leaderMap[m.region] = m.leader;
      intensityMap[m.region] = m.conflictIntensity;
    }
    
    layersRef.current.eachLayer((layer: any) => {
      const name = layer._regionName;
      const isSelected = name === selectedRegion;
      const leader = leaderMap[name];
      const intensity = intensityMap[name] || 0;
      
      let fillColor = "#e5e7eb";
      if (activeLayer === "conflict") {
        const r = 229 + (parseInt(CONFLICT_COLOR.substring(1,3), 16) - 229) * intensity / 100;
        const g = 231 + (parseInt(CONFLICT_COLOR.substring(3,5), 16) - 231) * intensity / 100;
        const b = 235 + (parseInt(CONFLICT_COLOR.substring(5,7), 16) - 235) * intensity / 100;
        fillColor = `rgb(${r}, ${g}, ${b})`;
      } else {
        fillColor = leader === "A" ? BRAND_A_COLOR : leader === "B" ? BRAND_B_COLOR : "#e5e7eb";
      }
      
      layer.setStyle({ 
        fillColor, 
        fillOpacity: isSelected ? 0.7 : (activeLayer === "conflict" ? intensity / 100 : 0.4), 
        weight: isSelected ? 3 : 1.5, 
        color: isSelected ? "#1d4ed8" : "#ffffff" 
      });
      if (isSelected) layer.bringToFront();
    });
  }, [selectedRegion, regionMetrics, activeLayer]);

  // Totals
  const totals = useMemo(() => {
    const totalA = regionMetrics.reduce((s, m) => s + m.countA, 0);
    const totalB = regionMetrics.reduce((s, m) => s + m.countB, 0);
    const totalDelta = regionMetrics.reduce((s, m) => s + Math.abs(m.countA - m.countB), 0);
    const avgBattle = Math.round(regionMetrics.reduce((s, m) => s + m.battleIndex, 0) / regionMetrics.length);
    const avgSaturationGap = (regionMetrics.reduce((s, m) => s + m.saturationGap, 0) / regionMetrics.length).toFixed(2);
    
    return { totalA, totalB, totalDelta, avgBattle, avgSaturationGap };
  }, [regionMetrics]);

  // Insights
  const insights = useMemo(() => {
    if (regionMetrics.length === 0) return [];
    const result: { text: string; icon?: any }[] = [];

    const aWins = regionMetrics.filter((m) => m.leader === "A").length;
    result.push({ 
      text: `${brandA} leads in ${aWins} of ${regionMetrics.length} regions (${Math.round(aWins/regionMetrics.length*100)}%)` 
    });

    const maxGapRegion = regionMetrics.reduce((max, m) => m.saturationGap > max.saturationGap ? m : max);
    if (maxGapRegion.saturationGap > 0) {
      const leader = maxGapRegion.saturationA > maxGapRegion.saturationB ? brandA : brandB;
      result.push({ 
        text: `Biggest saturation gap: ${leader} ahead by ${maxGapRegion.saturationGap.toFixed(2)} points/100k in ${maxGapRegion.region.replace(" (England)", "")}`,
        icon: Target
      });
    }

    const highConflictRegions = regionMetrics.filter(m => m.battleIndex > 70);
    if (highConflictRegions.length > 0) {
      result.push({ 
        text: `High competition (Battle Index >70%): ${highConflictRegions.map(r => r.region.replace(" (England)", "")).join(", ")}`,
        icon: Sword
      });
    }

    const lowConflictRegions = regionMetrics.filter(m => m.battleIndex < 30 && m.countA > 0 && m.countB > 0);
    if (lowConflictRegions.length > 0) {
      result.push({ 
        text: `Brands diverge (Battle Index <30%): ${lowConflictRegions.map(r => r.region.replace(" (England)", "")).join(", ")}`,
        icon: Radio
      });
    }

    return result;
  }, [regionMetrics, brandA, brandB]);

  const isLoading = dataLoading || mapLoading;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">

      {/* Navbar */}
      <nav className="w-12 flex-shrink-0 bg-[#1e2128] flex flex-col items-center py-3 gap-1 z-20">
        <div className="w-8 h-8 mb-4 flex items-center justify-center">
          <svg viewBox="0 0 107.57 137.26" className="w-5 h-5" fill="#9a9d9e">
            <path d="M77,60.2c17.98,6.17,31.89-14.53,21.26-30.29C89.01,16.2,73.41,7.2,55.72,7.2C27.33,7.2,4.31,30.4,4.31,59.03c0,33.56,38.08,63.1,48.7,70.68c1.65,1.18,3.78,1.18,5.43,0c5.79-4.13,19.74-14.8,31.24-29.08c8.85-11,3.92-26.29-8.16-33.59c-7.96-4.81-19.96-4.13-23.53,4.45c-1.76,4.23-1.72,8.9,2.87,13.5C71.27,95.39,40.3,98.85,40.3,74.58c0-19.82,21.52-22.05,28.92-17.89C71.88,58.18,74.48,59.33,77,60.2z" />
          </svg>
        </div>
        <button onClick={() => navigate("/")} title="Map" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-white hover:bg-[#2d3139] transition-colors">
          <Map className="w-4 h-4" />
        </button>
        <button title="Analytics" className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#2d3139] text-white">
          <BarChart2 className="w-4 h-4" />
        </button>
        <button title="List" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-white hover:bg-[#2d3139] transition-colors">
          <List className="w-4 h-4" />
        </button>
        <button title="Saved" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-white hover:bg-[#2d3139] transition-colors">
          <Star className="w-4 h-4" />
        </button>
        <div className="flex-1" />
        <button title="Settings" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-white transition-colors">
          <Settings className="w-4 h-4" />
        </button>
        <button title="Logout" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-white transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </nav>

      {/* Map */}
      <main className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />

        {/* Layer Control */}
        <div className="absolute top-5 right-5 z-[1000] bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Layers</h4>
          <div className="space-y-1.5">
            <button
              onClick={() => setActiveLayer("a")}
              className={`w-full text-left px-2 py-1 rounded text-xs flex items-center gap-2 ${
                activeLayer === "a" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: BRAND_A_COLOR }} />
              Only {brandA}
            </button>
            <button
              onClick={() => setActiveLayer("b")}
              className={`w-full text-left px-2 py-1 rounded text-xs flex items-center gap-2 ${
                activeLayer === "b" ? "bg-orange-50 text-orange-600" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: BRAND_B_COLOR }} />
              Only {brandB}
            </button>
            <button
              onClick={() => setActiveLayer("both")}
              className={`w-full text-left px-2 py-1 rounded text-xs flex items-center gap-2 ${
                activeLayer === "both" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <div className="flex gap-0.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: BRAND_A_COLOR }} />
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: BRAND_B_COLOR }} />
              </div>
              Both brands
            </button>
            <button
              onClick={() => setActiveLayer("conflict")}
              className={`w-full text-left px-2 py-1 rounded text-xs flex items-center gap-2 ${
                activeLayer === "conflict" ? "bg-red-50 text-red-600" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Sword className="w-3 h-3" />
              Conflict zones
            </button>
          </div>
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div className="absolute bottom-4 left-4 z-[1000] bg-white border border-gray-200 rounded-lg shadow-sm p-3.5"
               style={{ right: 170 }}>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Insights</h4>
            </div>
            <div className="space-y-1">
              {insights.map((item, i) => {
                const Icon = item.icon;
                return (
                  <p key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                    {Icon && <Icon className="w-3 h-3 mt-0.5 flex-shrink-0 text-gray-400" />}
                    <span>· {item.text}</span>
                  </p>
                );
              })}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-[1000]">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-gray-600">Loading data...</span>
            </div>
          </div>
        )}
      </main>

      {/* Right panel */}
      <aside className="w-[440px] flex-shrink-0 border-l border-gray-200 bg-white flex flex-col">

        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-1 text-xs text-gray-400 mb-2.5">
            <button onClick={() => navigate("/")} className="font-medium text-gray-700 hover:text-blue-600 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              Country Explorer
            </button>
            <ChevronRight className="w-3 h-3" />
            <span className="font-medium text-gray-700">Compare</span>
          </div>
          <h1 className="text-sm font-semibold text-gray-900">Brand Comparison</h1>
          <p className="text-xs text-gray-400 mt-0.5">Great Britain · Head-to-head</p>
        </div>

        {/* Brand selectors */}
        <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: BRAND_A_COLOR }} />
                Brand A
              </label>
              <select
                value={brandA}
                onChange={(e) => setBrandA(e.target.value as Brand)}
                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-900 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                style={{ borderLeft: `3px solid ${BRAND_A_COLOR}` }}
              >
                {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: BRAND_B_COLOR }} />
                Brand B
              </label>
              <select
                value={brandB}
                onChange={(e) => setBrandB(e.target.value as Brand)}
                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-900 bg-white focus:ring-1 focus:ring-orange-400 focus:border-orange-400 outline-none"
                style={{ borderLeft: `3px solid ${BRAND_B_COLOR}` }}
              >
                {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Ranking section with collapsible Radar */}
        <div className="border-b border-gray-200">
          <div 
            className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50"
            onClick={() => setShowRadar(!showRadar)}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-700">Ranking</span>
              {selectedRegion && (
                <span className="text-[10px] text-gray-400">
                  {selectedRegion.replace(" (England)", "")}
                </span>
              )}
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              {showRadar ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          </div>
          
          {/* Radar Chart */}
          {showRadar && selectedRegion && radarData.length > 0 && (
            <div className="px-4 pb-3">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name={brandA}
                      dataKey={brandA}
                      stroke={BRAND_A_COLOR}
                      fill={BRAND_A_COLOR}
                      fillOpacity={0.3}
                    />
                    <Radar
                      name={brandB}
                      dataKey={brandB}
                      stroke={BRAND_B_COLOR}
                      fill={BRAND_B_COLOR}
                      fillOpacity={0.3}
                    />
                    <Tooltip 
                      contentStyle={{ fontSize: 11, padding: '4px 8px' }}
                      formatter={(value: any) => [`${value}%`, '']}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          
          {/* Empty state when no region selected */}
          {showRadar && !selectedRegion && (
            <div className="px-4 pb-3">
              <div className="h-48 flex items-center justify-center border border-dashed border-gray-200 rounded-lg">
                <p className="text-xs text-gray-400">Click on a region to see ranking</p>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-100 bg-gray-50">
                <TableHead className="text-[10px] h-8 px-2 font-semibold uppercase tracking-wider text-gray-400 w-[100px]">Region</TableHead>
                <TableHead className="text-[10px] h-8 px-1 text-right font-semibold" style={{ color: BRAND_A_COLOR }}>A</TableHead>
                <TableHead className="text-[10px] h-8 px-1 text-right font-semibold" style={{ color: BRAND_B_COLOR }}>B</TableHead>
                <TableHead className="text-[10px] h-8 px-1 text-right font-semibold uppercase tracking-wider text-gray-400">Δ</TableHead>
                <TableHead className="text-[10px] h-8 px-1 font-semibold uppercase tracking-wider text-gray-400">Saturation gap</TableHead>
                <TableHead className="text-[10px] h-8 px-1 font-semibold uppercase tracking-wider text-gray-400">Battle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regionMetrics.map((m) => {
                const isSelected = selectedRegion === m.region;
                const displayName = m.region.replace(" (England)", "");
                const delta = Math.abs(m.countA - m.countB);
                const leader = m.countA > m.countB ? brandA : brandB;
                
                return (
                  <TableRow
                    key={m.region}
                    className={`border-b border-gray-50 cursor-pointer transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                    onClick={() => setSelectedRegion(m.region)}
                  >
                    <TableCell className="text-xs py-2 px-2 font-medium">
                      <span className="text-gray-700 break-words">{displayName}</span>
                    </TableCell>
                    <TableCell className="text-xs py-2 px-1 text-right font-semibold text-gray-800">{m.countA}</TableCell>
                    <TableCell className="text-xs py-2 px-1 text-right font-semibold text-gray-800">{m.countB}</TableCell>
                    
                    {/* Delta */}
                    <TableCell className="text-xs py-2 px-1 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-medium text-gray-800">{delta}</span>
                        <span className="text-[9px] text-gray-400">{leader}</span>
                      </div>
                    </TableCell>
                    
                    {/* Saturation Gap */}
                    <TableCell className="text-xs py-2 px-1">
                      <div className="flex flex-col gap-0.5">
                        <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
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
                    </TableCell>
                    
                    {/* Battle Index */}
                    <TableCell className="text-xs py-2 px-1">
                      <div className="flex items-center gap-1">
                        <Sword className={`w-3 h-3 ${m.battleIndex > 70 ? "text-red-500" : "text-gray-300"}`} />
                        <span className={`text-xs font-medium ${m.battleIndex > 70 ? "text-red-600" : "text-gray-600"}`}>
                          {m.battleIndex}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {regionMetrics.length > 0 && (
                <TableRow className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                  <TableCell className="text-xs py-2 px-2 font-bold">Total</TableCell>
                  <TableCell className="text-xs py-2 px-1 text-right font-bold text-gray-900">{totals.totalA}</TableCell>
                  <TableCell className="text-xs py-2 px-1 text-right font-bold text-gray-900">{totals.totalB}</TableCell>
                  <TableCell className="text-xs py-2 px-1 text-right font-bold text-gray-900">{totals.totalDelta}</TableCell>
                  <TableCell className="text-xs py-2 px-1">
                    <span className="text-[10px] text-gray-500">avg {totals.avgSaturationGap}</span>
                  </TableCell>
                  <TableCell className="text-xs py-2 px-1">
                    <div className="flex items-center gap-1">
                      <Sword className="w-3 h-3 text-gray-400" />
                      <span className="text-xs font-medium text-gray-600">{totals.avgBattle}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </aside>
    </div>
  );
};

export default Compare;

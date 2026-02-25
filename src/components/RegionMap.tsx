import { useEffect, useRef, useState } from "react";
import L from "leaflet";

interface RegionMapProps {
  onRegionClick: (regionName: string) => void;
  selectedRegion: string | null;
}

const REGION_COLORS = [
  "hsl(185, 72%, 48%)",
  "hsl(340, 65%, 55%)",
  "hsl(45, 85%, 55%)",
  "hsl(130, 50%, 50%)",
  "hsl(270, 55%, 55%)",
  "hsl(20, 80%, 55%)",
  "hsl(200, 70%, 55%)",
  "hsl(160, 55%, 50%)",
  "hsl(300, 50%, 55%)",
  "hsl(60, 70%, 50%)",
  "hsl(0, 72%, 55%)",
  "hsl(210, 65%, 55%)",
];

const RegionMap = ({ onRegionClick, selectedRegion }: RegionMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layersRef = useRef<L.GeoJSON | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [52.5, -1.5],
      zoom: 6,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    mapInstance.current = map;

    // Fetch real GeoJSON
    fetch("/data/uk-regions.geojson")
      .then((res) => res.json())
      .then((data) => {

        let colorIndex = 0;
        const geoLayer = L.geoJSON(data, {
          style: (feature) => {
            const color = REGION_COLORS[colorIndex % REGION_COLORS.length];
            colorIndex++;
            return {
              color: "#fff",
              weight: 2,
              fillColor: color,
              fillOpacity: 0.45,
            };
          },
          onEachFeature: (feature, layer) => {
            const props = feature?.properties || {};
            const name = props.ITL125NM || `Region ${feature?.id || "unknown"}`;
            
            // Store color for later reference
            (layer as any)._regionName = name;
            
            layer.bindTooltip(name, {
              sticky: true,
              className: "region-tooltip",
            });
            layer.on("click", () => {
              console.log(name);
              onRegionClick(name);
            });
          },
        }).addTo(map);

        layersRef.current = geoLayer;
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load GeoJSON:", err);
        setLoading(false);
      });

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update styles on selection change
  useEffect(() => {
    if (!layersRef.current) return;
    layersRef.current.eachLayer((layer: any) => {
      const isSelected = layer._regionName === selectedRegion;
      layer.setStyle({
        fillOpacity: isSelected ? 0.65 : 0.45,
        weight: isSelected ? 3 : 2,
      });
    });
  }, [selectedRegion]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-[1000]">
          <div className="flex items-center gap-3 text-primary">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Загрузка регионов...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegionMap;

import { useEffect, useRef } from "react";
import L from "leaflet";
import { regionsData, RegionFeature } from "@/data/regions";

interface RegionMapProps {
  onRegionClick: (regionName: string) => void;
  selectedRegion: string | null;
}

const RegionMap = ({ onRegionClick, selectedRegion }: RegionMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layersRef = useRef<L.GeoJSON | null>(null);

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

    const geoLayer = L.geoJSON(regionsData as any, {
      style: (feature) => {
        const f = feature as RegionFeature;
        return {
          color: "#fff",
          weight: 2,
          fillColor: f.properties.color,
          fillOpacity: 0.55,
        };
      },
      onEachFeature: (feature, layer) => {
        const f = feature as RegionFeature;
        layer.bindTooltip(f.properties.name, {
          sticky: true,
          className: "region-tooltip",
        });
        layer.on("click", () => {
          console.log(f.properties.name);
          onRegionClick(f.properties.name);
        });
      },
    }).addTo(map);

    mapInstance.current = map;
    layersRef.current = geoLayer;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update styles on selection change
  useEffect(() => {
    if (!layersRef.current) return;
    layersRef.current.eachLayer((layer: any) => {
      const feature = layer.feature as RegionFeature;
      const isSelected = feature.properties.name === selectedRegion;
      layer.setStyle({
        fillOpacity: isSelected ? 0.6 : 0.35,
        weight: isSelected ? 3 : 2,
      });
    });
  }, [selectedRegion]);

  return <div ref={mapRef} className="w-full h-full" />;
};

export default RegionMap;

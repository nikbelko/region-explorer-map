import { useState, useEffect, useRef } from "react";
import { Brand, BRAND_CONFIGS } from "@/data/regions";

export interface RestaurantPoint {
  brand: Brand;
  lat: number;
  lng: number;
  name: string;
}

export function useRestaurantData() {
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<RestaurantPoint[]>([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    let loaded = 0;
    const allPoints: RestaurantPoint[] = [];

    BRAND_CONFIGS.forEach((brand) => {
      fetch(brand.file)
        .then((res) => res.json())
        .then((data) => {
          const features = data.features || [];
          features.forEach((f: any) => {
            const coords = f.geometry?.coordinates;
            if (!coords || coords.length < 2) return;
            const [lng, lat] = coords;
            if (typeof lat !== "number" || typeof lng !== "number") return;
            const name = f.properties?.name || "Unknown";
            allPoints.push({ brand: brand.name, lat, lng, name });
          });
          loaded++;
          if (loaded === BRAND_CONFIGS.length) {
            setRestaurants([...allPoints]);
            setLoading(false);
          }
        })
        .catch(() => {
          loaded++;
          if (loaded === BRAND_CONFIGS.length) {
            setRestaurants([...allPoints]);
            setLoading(false);
          }
        });
    });
  }, []);

  return { restaurants, loading };
}

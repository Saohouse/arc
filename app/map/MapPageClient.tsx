"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ProceduralMap } from "@/components/arc/ProceduralMap";
import { MapTileEditor, TerrainType } from "@/components/arc/MapTileEditor";

type MapResident = {
  id: string;
  name: string;
};

type MapNode = {
  id: string;
  name: string;
  x: number;
  y: number;
  residents: MapResident[];
  iconType: string;
  iconData: string | null;
  locationType: string | null;
  parentLocationId: string | null;
  summary: string | null;
  overview: string | null;
  tags: string;
};

type MapLink = {
  from: MapNode;
  to: MapNode;
};

type Location = {
  id: string;
  name: string;
  residents: { id: string; name: string }[];
};

type MapPageClientProps = {
  nodes: MapNode[];
  links: MapLink[];
  locations: Location[];
};

type MapMode = 'view' | 'edit';

const TILES_STORAGE_KEY = 'map-tiles-data';
const GRID_SIZE = 64;

export function MapPageClient({ nodes, links, locations }: MapPageClientProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [mode, setMode] = useState<MapMode>('view');
  const [tiles, setTiles] = useState<(TerrainType | null)[][] | null>(null);
  
  // Load tiles from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TILES_STORAGE_KEY);
      if (saved) {
        setTiles(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load saved tiles:', e);
    }
  }, []);
  
  // Save tiles when they change
  const handleTilesChange = (newTiles: (TerrainType | null)[][]) => {
    setTiles(newTiles);
    try {
      localStorage.setItem(TILES_STORAGE_KEY, JSON.stringify(newTiles));
    } catch (e) {
      console.warn('Failed to save tiles:', e);
    }
  };

  // Edit mode - full screen tile editor
  if (mode === 'edit') {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900">
        <MapTileEditor
          gridSize={GRID_SIZE}
          tileSize={16}
          initialTiles={tiles ?? undefined}
          onTilesChange={handleTilesChange}
          onClose={() => setMode('view')}
        />
      </div>
    );
  }

  // View mode - normal map view
  return (
    <div className="space-y-4">
      {/* Mode toggle header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('view')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-indigo-600 text-white"
          >
            🗺️ View Mode
          </button>
          <button
            onClick={() => setMode('edit')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            🎨 Edit Terrain
          </button>
        </div>
        
        {tiles && (
          <span className="text-xs text-muted-foreground">
            ✓ Custom terrain saved ({GRID_SIZE}×{GRID_SIZE})
          </span>
        )}
      </div>
      
      <div className={isMaximized ? "flex flex-col gap-6" : "grid gap-6 lg:grid-cols-[2fr_1fr]"}>
        <div className="rounded-lg bg-background p-4">
          <ProceduralMap 
            nodes={nodes} 
            links={links} 
            isMaximized={isMaximized}
            onToggleMaximize={() => setIsMaximized(!isMaximized)}
            customTiles={tiles ?? undefined}
            gridSize={GRID_SIZE}
          />
        </div>

        <div className={isMaximized ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "space-y-4"}>
          {locations.map((location) => (
            <div key={location.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <Link
                  href={`/archive/locations/${location.id}`}
                  className="text-sm font-semibold hover:text-foreground"
                >
                  {location.name}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {location.residents.length} resident
                  {location.residents.length === 1 ? "" : "s"}
                </span>
              </div>
              {location.residents.length ? (
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {location.residents.map((resident) => (
                    <Link
                      key={resident.id}
                      href={`/archive/characters/${resident.id}`}
                      className="block hover:text-foreground"
                    >
                      {resident.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  No residents yet. Assign a home location to connect a
                  character.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

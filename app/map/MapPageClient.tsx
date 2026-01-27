"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ProceduralMap } from "@/components/arc/ProceduralMap";

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

// Editor data type (must match ProceduralMapEditor)
type EditorData = {
  locationPositions: Record<string, { x: number; y: number }>;
  decorations: unknown[];
  customRoads: unknown[];
  mapSeed: number;
  disableProceduralTerrain?: boolean;
};

const EDITOR_DATA_KEY = 'procedural-map-editor-data';

export function MapPageClient({ nodes, links, locations }: MapPageClientProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editorData, setEditorData] = useState<EditorData | null>(null);
  const [dataVersion, setDataVersion] = useState(0); // Force re-render when data changes
  
  // Load saved edits on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(EDITOR_DATA_KEY);
      if (saved) {
        setEditorData(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load saved edits:', e);
    }
  }, [dataVersion]);

  // Handle save from editor - reload data
  const handleSave = useCallback(() => {
    // Bump version to trigger reload from localStorage
    setDataVersion(v => v + 1);
  }, []);
  
  // Handle close from editor - reload data in case it changed
  const handleCloseEditor = useCallback(() => {
    setIsEditing(false);
    setDataVersion(v => v + 1);
  }, []);

  // Render map (edit or view mode)
  return (
    <div className="space-y-4">
      {/* Mode toggle header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !isEditing ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🗺️ View Map
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isEditing ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            ✏️ Edit Map
          </button>
        </div>
        
        {editorData && (
          <span className="text-xs text-muted-foreground">
            ✓ Custom edits saved
          </span>
        )}
      </div>
      
      <div className={isMaximized || isEditing ? "flex flex-col gap-6" : "grid gap-6 lg:grid-cols-[2fr_1fr]"}>
        <div className="rounded-lg bg-background p-4">
          <ProceduralMap 
            nodes={nodes} 
            links={links} 
            isMaximized={isMaximized || isEditing}
            onToggleMaximize={isEditing ? undefined : () => setIsMaximized(!isMaximized)}
            customPositions={editorData?.locationPositions}
            customDecorations={editorData?.decorations}
            customRoads={editorData?.customRoads}
            mapSeedOverride={editorData?.mapSeed}
            disableProceduralTerrain={editorData?.disableProceduralTerrain}
            editMode={isEditing}
            onExitEditMode={() => {
              setIsEditing(false);
              setDataVersion(v => v + 1);
            }}
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

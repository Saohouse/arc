"use client";

import { useState } from "react";
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

export function MapPageClient({ nodes, links, locations }: MapPageClientProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  return (
    <div className={isMaximized ? "flex flex-col gap-6" : "grid gap-6 lg:grid-cols-[2fr_1fr]"}>
      <div className="rounded-lg bg-background p-4">
        <ProceduralMap 
          nodes={nodes} 
          links={links} 
          isMaximized={isMaximized}
          onToggleMaximize={() => setIsMaximized(!isMaximized)}
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
  );
}

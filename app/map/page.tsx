import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStory } from "@/lib/story";
import { InteractiveMap } from "@/components/arc/InteractiveMap";

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 600;

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
};

type MapLink = {
  from: MapNode;
  to: MapNode;
};

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function buildMapNodes(locations: Array<{ id: string; name: string; residents: MapResident[] }>) {
  const count = locations.length;
  const radius = Math.min(MAP_WIDTH, MAP_HEIGHT) * 0.33;
  const centerX = MAP_WIDTH / 2;
  const centerY = MAP_HEIGHT / 2;

  return locations.map((location, index) => {
    const seed = hashString(location.name);
    const angle =
      (index / Math.max(count, 1)) * Math.PI * 2 + ((seed % 360) / 360) * 0.35;
    const radialJitter = ((seed % 100) / 100 - 0.5) * 0.2;
    const r = radius * (1 + radialJitter);
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;

    return {
      id: location.id,
      name: location.name,
      x,
      y,
      residents: location.residents,
    };
  });
}

function buildMapLinks(nodes: MapNode[]) {
  if (nodes.length < 2) {
    return [];
  }

  const links: MapLink[] = [];
  for (let i = 0; i < nodes.length - 1; i += 1) {
    links.push({ from: nodes[i], to: nodes[i + 1] });
  }
  if (nodes.length > 2) {
    links.push({ from: nodes[nodes.length - 1], to: nodes[0] });
  }

  return links;
}

export default async function MapPage() {
  const currentStory = await requireStory();

  const locations = await prisma.location.findMany({
    where: { storyId: currentStory.id },
    orderBy: { name: "asc" },
    include: {
      residents: {
        orderBy: { name: "asc" },
      },
    },
  });

  const nodes = buildMapNodes(locations);
  const links = buildMapLinks(nodes);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Atlas / Map</div>
          <h1 className="text-3xl font-semibold">🗺️ World Map</h1>
          <p className="text-sm text-muted-foreground">
            {currentStory.name} - Auto-generated layout for locations and their resident characters.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/archive/locations/new"
            className="rounded-md border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            New location
          </Link>
          <Link
            href="/archive/characters/new"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
          >
            New character
          </Link>
        </div>
      </div>

      {locations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Add locations to generate the first map.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-lg border bg-background p-4">
            <InteractiveMap nodes={nodes} links={links} />
          </div>

          <div className="space-y-4">
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
      )}
    </div>
  );
}

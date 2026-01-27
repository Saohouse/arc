import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStory } from "@/lib/story";
import { ProceduralMap } from "@/components/arc/ProceduralMap";

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

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Check if a location should be positioned near water based on its description
 */
function isCoastalLocation(summary: string | null, overview: string | null, tags: string): boolean {
  const text = `${summary || ''} ${overview || ''} ${tags || ''}`.toLowerCase();
  if (!text.trim()) return false;
  
  const coastalKeywords = [
    'port', 'harbor', 'harbour', 'coastal', 'coast', 'seaside', 'waterfront',
    'bay', 'dock', 'wharf', 'marina', 'beach', 'shore', 'seafront',
    'nautical', 'maritime', 'naval', 'fishing village', 'fishing port',
    'ocean', 'sea ', ' sea', 'lake ', 'lakeside', 'riverside', 'river port',
    'estuary', 'peninsula', 'island', 'archipelago', 'reef'
  ];
  
  return coastalKeywords.some(keyword => text.includes(keyword));
}

function buildMapNodes(locations: Array<{ 
  id: string; 
  name: string; 
  residents: MapResident[];
  iconType: string;
  iconData: string | null;
  locationType: string | null;
  parentLocationId: string | null;
  summary: string | null;
  overview: string | null;
  tags: string;
}>) {
  const centerX = MAP_WIDTH / 2;
  const centerY = MAP_HEIGHT / 2;
  const positionedNodes = new Map<string, MapNode>();

  // Organize by type
  const countries = locations.filter((l) => l.locationType === "country");
  const provinces = locations.filter((l) => l.locationType === "province");
  const cities = locations.filter((l) => l.locationType === "city");
  const towns = locations.filter((l) => l.locationType === "town");
  const standalone = locations.filter((l) => !l.locationType);

  // Position countries in a circle
  const countryRadius = Math.min(MAP_WIDTH, MAP_HEIGHT) * 0.35;
  countries.forEach((country, index) => {
    const seed = hashString(country.name);
    const angle = (index / Math.max(countries.length, 1)) * Math.PI * 2;
    const jitter = ((seed % 100) / 100 - 0.5) * 0.2;
    
    // Push coastal countries MUCH further toward the edge (outer ring)
    const isCoastal = isCoastalLocation(country.summary, country.overview, country.tags);
    const radiusMultiplier = isCoastal ? 1.35 : 1; // 35% further out if coastal (was 15%)
    const r = countryRadius * (1 + jitter) * radiusMultiplier;
    
    positionedNodes.set(country.id, {
      id: country.id,
      name: country.name,
      x: centerX + Math.cos(angle) * r,
      y: centerY + Math.sin(angle) * r,
      residents: country.residents,
      iconType: country.iconType,
      iconData: country.iconData,
      locationType: country.locationType,
      parentLocationId: country.parentLocationId,
      summary: country.summary,
      overview: country.overview,
      tags: country.tags,
    });
  });

  // Position provinces within or near their parent countries
  provinces.forEach((province, index) => {
    let x, y;
    const seed = hashString(province.name);
    const isCoastal = isCoastalLocation(province.summary, province.overview, province.tags);
    
    if (province.parentLocationId && positionedNodes.has(province.parentLocationId)) {
      const parent = positionedNodes.get(province.parentLocationId)!;
      
      // Count how many siblings this province has
      const siblings = provinces.filter(p => p.parentLocationId === province.parentLocationId);
      const siblingIndex = siblings.findIndex(s => s.id === province.id);
      
      // Distribute siblings evenly around parent
      const angle = (siblingIndex / Math.max(siblings.length, 1)) * Math.PI * 2;
      
      // Coastal provinces pushed MUCH further out (toward water/edge)
      const baseDistance = 150;
      const distance = isCoastal ? baseDistance * 1.5 : baseDistance; // 50% further if coastal (was 20%)
      
      x = parent.x + Math.cos(angle) * distance;
      y = parent.y + Math.sin(angle) * distance;
    } else {
      // No parent, position in smaller circle
      const radius = Math.min(MAP_WIDTH, MAP_HEIGHT) * 0.25;
      const radiusMultiplier = isCoastal ? 1.4 : 1; // 40% further if coastal
      const angle = (index / Math.max(provinces.length, 1)) * Math.PI * 2;
      x = centerX + Math.cos(angle) * radius * radiusMultiplier;
      y = centerY + Math.sin(angle) * radius * radiusMultiplier;
    }
    
    positionedNodes.set(province.id, {
      id: province.id,
      name: province.name,
      x,
      y,
      residents: province.residents,
      iconType: province.iconType,
      iconData: province.iconData,
      locationType: province.locationType,
      parentLocationId: province.parentLocationId,
      summary: province.summary,
      overview: province.overview,
      tags: province.tags,
    });
  });

  // Position cities within provinces
  cities.forEach((city, index) => {
    let x, y;
    const seed = hashString(city.name);
    const isCoastal = isCoastalLocation(city.summary, city.overview, city.tags);
    
    if (city.parentLocationId && positionedNodes.has(city.parentLocationId)) {
      const parent = positionedNodes.get(city.parentLocationId)!;
      
      // Count siblings
      const siblings = cities.filter(c => c.parentLocationId === city.parentLocationId);
      const siblingIndex = siblings.findIndex(s => s.id === city.id);
      
      // Distribute evenly around parent province
      const angle = (siblingIndex / Math.max(siblings.length, 1)) * Math.PI * 2 + (seed % 100) / 100;
      
      if (isCoastal) {
        // COASTAL CITIES: Position near the COUNTRY edge, not relative to province!
        // Find the grandparent country
        const grandparentId = parent.parentLocationId;
        
        // DEBUG
        if (city.name.toLowerCase().includes('saltmere')) {
          console.log('🌊 SALTMERE COASTAL DEBUG:');
          console.log('  - Parent province:', parent.name, 'at', parent.x, parent.y);
          console.log('  - Parent parentLocationId:', parent.parentLocationId);
          console.log('  - grandparentId:', grandparentId);
          console.log('  - positionedNodes has grandparent:', grandparentId ? positionedNodes.has(grandparentId) : 'N/A');
        }
        
        if (grandparentId && positionedNodes.has(grandparentId)) {
          const country = positionedNodes.get(grandparentId)!;
          
          // Calculate direction from country center OUTWARD (toward coast)
          // Use province position to determine general direction
          const dirX = parent.x - country.x;
          const dirY = parent.y - country.y;
          const dirLength = Math.sqrt(dirX * dirX + dirY * dirY);
          const normalizedDirX = dirX / dirLength;
          const normalizedDirY = dirY / dirLength;
          
          // Position city at the country edge (country radius is ~350-400px)
          // Place coastal city at ~320px from country center (near edge!)
          const coastDistance = 310;
          x = country.x + normalizedDirX * coastDistance;
          y = country.y + normalizedDirY * coastDistance;
          
          // Add slight offset based on sibling index to avoid stacking
          const offsetAngle = angle * 0.3;
          x += Math.cos(offsetAngle) * 30;
          y += Math.sin(offsetAngle) * 30;
          
          // DEBUG
          if (city.name.toLowerCase().includes('saltmere')) {
            console.log('  - Country:', country.name, 'at', country.x, country.y);
            console.log('  - Direction:', normalizedDirX, normalizedDirY);
            console.log('  - Coast distance:', coastDistance);
            console.log('  - FINAL position:', x, y);
          }
        } else {
          // Fallback: position far from province
          const distance = 150;
          x = parent.x + Math.cos(angle) * distance;
          y = parent.y + Math.sin(angle) * distance;
          
          // DEBUG
          if (city.name.toLowerCase().includes('saltmere')) {
            console.log('  - FALLBACK! No grandparent found');
            console.log('  - Using distance:', distance);
            console.log('  - FINAL position:', x, y);
          }
        }
      } else {
        // INLAND CITIES: Position near province center
        const baseDistance = 50;
        x = parent.x + Math.cos(angle) * baseDistance;
        y = parent.y + Math.sin(angle) * baseDistance;
      }
    } else {
      const radius = Math.min(MAP_WIDTH, MAP_HEIGHT) * 0.2;
      const radiusMultiplier = isCoastal ? 1.5 : 1; // 50% further if coastal
      const angle = (index / Math.max(cities.length, 1)) * Math.PI * 2;
      x = centerX + Math.cos(angle) * radius * radiusMultiplier;
      y = centerY + Math.sin(angle) * radius * radiusMultiplier;
    }
    
    positionedNodes.set(city.id, {
      id: city.id,
      name: city.name,
      x,
      y,
      residents: city.residents,
      iconType: city.iconType,
      iconData: city.iconData,
      locationType: city.locationType,
      parentLocationId: city.parentLocationId,
      summary: city.summary,
      overview: city.overview,
      tags: city.tags,
    });
  });

  // Position towns within cities
  towns.forEach((town, index) => {
    let x, y;
    const seed = hashString(town.name);
    const isCoastal = isCoastalLocation(town.summary, town.overview, town.tags);
    
    if (town.parentLocationId && positionedNodes.has(town.parentLocationId)) {
      const parent = positionedNodes.get(town.parentLocationId)!;
      
      // Count siblings
      const siblings = towns.filter(t => t.parentLocationId === town.parentLocationId);
      const siblingIndex = siblings.findIndex(s => s.id === town.id);
      
      // Distribute evenly around parent city
      const angle = (siblingIndex / Math.max(siblings.length, 1)) * Math.PI * 2 + (seed % 100) / 100;
      
      // Coastal towns positioned further
      const baseDistance = 50;
      const distance = isCoastal ? baseDistance * 1.3 : baseDistance; // 30% further if coastal
      
      x = parent.x + Math.cos(angle) * distance;
      y = parent.y + Math.sin(angle) * distance;
    } else {
      const radius = Math.min(MAP_WIDTH, MAP_HEIGHT) * 0.15;
      const radiusMultiplier = isCoastal ? 1.3 : 1;
      const angle = (index / Math.max(towns.length, 1)) * Math.PI * 2;
      x = centerX + Math.cos(angle) * radius * radiusMultiplier;
      y = centerY + Math.sin(angle) * radius * radiusMultiplier;
    }
    
    positionedNodes.set(town.id, {
      id: town.id,
      name: town.name,
      x,
      y,
      residents: town.residents,
      iconType: town.iconType,
      iconData: town.iconData,
      locationType: town.locationType,
      parentLocationId: town.parentLocationId,
      summary: town.summary,
      overview: town.overview,
      tags: town.tags,
    });
  });

  // Position standalone locations
  standalone.forEach((location, index) => {
    const seed = hashString(location.name);
    const isCoastal = isCoastalLocation(location.summary, location.overview, location.tags);
    const radius = Math.min(MAP_WIDTH, MAP_HEIGHT) * 0.3;
    const radiusMultiplier = isCoastal ? 1.35 : 1; // 35% further if coastal
    const angle = (index / Math.max(standalone.length, 1)) * Math.PI * 2;
    const jitter = ((seed % 100) / 100 - 0.5) * 0.15;
    
    positionedNodes.set(location.id, {
      id: location.id,
      name: location.name,
      x: centerX + Math.cos(angle) * radius * (1 + jitter) * radiusMultiplier,
      y: centerY + Math.sin(angle) * radius * (1 + jitter) * radiusMultiplier,
      residents: location.residents,
      iconType: location.iconType,
      iconData: location.iconData,
      locationType: location.locationType,
      parentLocationId: location.parentLocationId,
      summary: location.summary,
      overview: location.overview,
      tags: location.tags,
    });
  });

  return Array.from(positionedNodes.values());
}

function buildMapLinks(nodes: MapNode[]) {
  const links: MapLink[] = [];
  
  // Create a map for quick lookup
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  
  // Only connect children to their parents (no circular connections)
  nodes.forEach((node) => {
    if (node.parentLocationId && nodeMap.has(node.parentLocationId)) {
      const parent = nodeMap.get(node.parentLocationId)!;
      links.push({ from: parent, to: node });
    }
  });

  return links;
}

export default async function MapPage() {
  const currentStory = await requireStory();

  const locations = await prisma.location.findMany({
    where: { storyId: currentStory.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      locationType: true,
      parentLocationId: true,
      iconType: true,
      iconData: true,
      summary: true,
      overview: true,
      tags: true, // Include tags for keyword detection
      residents: {
        select: {
          id: true,
          name: true,
        },
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
            {currentStory.name} - Procedural hierarchical map with regions and roads.
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
          <div className="rounded-lg bg-background p-4">
            <ProceduralMap nodes={nodes} links={links} />
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

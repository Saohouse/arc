import { prisma } from "@/lib/prisma";
import { requireStory } from "@/lib/story";
import { MapPageClient } from "./MapPageClient";

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
 * Returns false for explicitly inland locations, true for coastal locations
 */
function isCoastalLocation(summary: string | null, overview: string | null, tags: string): boolean {
  const text = `${summary || ''} ${overview || ''} ${tags || ''}`.toLowerCase();
  if (!text.trim()) return false;
  
  // INLAND keywords - if ANY of these are present, the location is NOT coastal
  const inlandKeywords = [
    'inland', 'interior', 'landlocked', 'mountain', 'mountainous', 'highland',
    'hilltop', 'hill town', 'valley', 'forest', 'woodland', 'woods',
    'plains', 'prairie', 'grassland', 'meadow', 'pasture',
    'desert', 'mesa', 'canyon', 'cave', 'underground', 'subterranean',
    'central', 'heartland', 'midland', 'upland', 'farmland', 'agricultural',
    'rural', 'countryside', 'village', 'hamlet', 'farming', 'ranching',
    'trade hub', 'trading post', 'crossroads', 'market town', 'merchant'
  ];
  
  // Check for inland keywords first - these override coastal
  if (inlandKeywords.some(keyword => text.includes(keyword))) {
    return false;
  }
  
  // COASTAL keywords - must be EXPLICITLY water-related
  // Removed generic terms that could apply to inland locations
  const coastalKeywords = [
    'port city', 'port town', 'seaport', 'harbor', 'harbour', 
    'coastal', 'coast', 'seaside', 'waterfront', 'seafront',
    'bay', 'dock', 'wharf', 'marina', 'beach', 'shoreline',
    'nautical', 'maritime', 'naval', 'naval base',
    'fishing village', 'fishing port', 'fishing harbor',
    'ocean', 'oceanside', 'lakeside', 'lakefront',
    'estuary', 'peninsula', 'island', 'archipelago', 'reef',
    'lighthouse', 'pier', 'boardwalk', 'cove', 'inlet'
  ];
  
  // Use word boundary matching for all keywords to be more precise
  return coastalKeywords.some(keyword => {
    // For multi-word keywords, just check includes
    if (keyword.includes(' ')) {
      return text.includes(keyword);
    }
    // For single words, use word boundary to avoid partial matches
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(text);
  });
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
        const grandparentId = parent.parentLocationId;
        
        if (grandparentId && positionedNodes.has(grandparentId)) {
          const country = positionedNodes.get(grandparentId)!;
          
          // Calculate direction from country center OUTWARD (toward coast)
          const dirX = parent.x - country.x;
          const dirY = parent.y - country.y;
          const dirLength = Math.sqrt(dirX * dirX + dirY * dirY);
          const normalizedDirX = dirX / dirLength;
          const normalizedDirY = dirY / dirLength;
          
          // Position city at the country edge
          const coastDistance = 310;
          x = country.x + normalizedDirX * coastDistance;
          y = country.y + normalizedDirY * coastDistance;
          
          // Add slight offset based on sibling index to avoid stacking
          const offsetAngle = angle * 0.3;
          x += Math.cos(offsetAngle) * 30;
          y += Math.sin(offsetAngle) * 30;
        } else {
          // Fallback: position far from province
          const distance = 150;
          x = parent.x + Math.cos(angle) * distance;
          y = parent.y + Math.sin(angle) * distance;
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
  
  // Connect children to their parents, but skip province->country connections
  nodes.forEach((node) => {
    if (node.parentLocationId && nodeMap.has(node.parentLocationId)) {
      const parent = nodeMap.get(node.parentLocationId)!;
      
      // Don't draw roads from provinces to countries
      // Roads should only connect: cities->provinces, towns->provinces/cities
      if (node.locationType === 'province' && parent.locationType === 'country') {
        return; // Skip this link
      }
      
      links.push({ from: parent, to: node });
    }
  });
  
  // Connect provinces within the same country to each other
  const provinces = nodes.filter(n => n.locationType === 'province');
  
  // Group provinces by their parent country
  const provincesByCountry = new Map<string, MapNode[]>();
  provinces.forEach(province => {
    if (province.parentLocationId) {
      const existing = provincesByCountry.get(province.parentLocationId) || [];
      existing.push(province);
      provincesByCountry.set(province.parentLocationId, existing);
    }
  });
  
  // For each country, connect its provinces to each other (hub pattern from first province)
  provincesByCountry.forEach((countryProvinces) => {
    if (countryProvinces.length < 2) return; // Need at least 2 provinces
    
    // Connect each province to the nearest 1-2 other provinces for a network
    countryProvinces.forEach((province, index) => {
      // Calculate distances to other provinces
      const distances = countryProvinces
        .filter((_, i) => i !== index)
        .map(otherProvince => ({
          province: otherProvince,
          distance: Math.sqrt(
            Math.pow(province.x - otherProvince.x, 2) + 
            Math.pow(province.y - otherProvince.y, 2)
          )
        }))
        .sort((a, b) => a.distance - b.distance);
      
      // Connect to 1-2 nearest provinces (creates a connected network without too many roads)
      const connectTo = countryProvinces.length > 3 ? 2 : 1;
      distances.slice(0, connectTo).forEach(({ province: otherProvince }) => {
        // Avoid duplicate links (check if reverse already exists)
        const alreadyExists = links.some(
          link => 
            (link.from.id === province.id && link.to.id === otherProvince.id) ||
            (link.from.id === otherProvince.id && link.to.id === province.id)
        );
        
        if (!alreadyExists) {
          links.push({ from: province, to: otherProvince });
        }
      });
    });
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
      <div>
        <div className="text-sm text-muted-foreground">Atlas / Map</div>
        <h1 className="text-3xl font-semibold">🗺️ World Map</h1>
        <p className="text-sm text-muted-foreground">
          {currentStory.name} - Procedural hierarchical map with regions and roads.
        </p>
      </div>

      {locations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Add locations to generate the first map.
        </div>
      ) : (
        <MapPageClient 
          nodes={nodes} 
          links={links} 
          locations={locations.map(l => ({
            id: l.id,
            name: l.name,
            residents: l.residents
          }))}
        />
      )}
    </div>
  );
}

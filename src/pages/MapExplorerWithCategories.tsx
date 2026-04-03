import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Search, X, Navigation, MapPin, Hospital, School, ShoppingBag, Building2, Train, Landmark } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const BUXAR_CENTER: [number, number] = [25.5648, 83.9767];
const BUXAR_BOUNDS: [[number, number], [number, number]] = [
  [25.400, 83.800],
  [25.750, 84.150],
];

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

interface MarkerData {
  position: [number, number];
  name: string;
  type: string;
}

interface Category {
  id: string;
  name: string;
  query: string;
  icon: React.ReactNode;
  color: string;
}

const CATEGORIES: Category[] = [
  { id: 'hospital', name: 'Hospitals', query: 'hospital', icon: <Hospital size={18} />, color: 'bg-red-500' },
  { id: 'school', name: 'Schools', query: 'school', icon: <School size={18} />, color: 'bg-blue-500' },
  { id: 'market', name: 'Markets', query: 'market', icon: <ShoppingBag size={18} />, color: 'bg-green-500' },
  { id: 'bank', name: 'Banks', query: 'bank', icon: <Building2 size={18} />, color: 'bg-purple-500' },
  { id: 'railway', name: 'Railway', query: 'railway station', icon: <Train size={18} />, color: 'bg-orange-500' },
  { id: 'temple', name: 'Temples', query: 'temple', icon: <Landmark size={18} />, color: 'bg-yellow-600' },
];

function FlyToLocation({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

export default function MapExplorerWithCategories() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>(BUXAR_CENTER);
  const [mapZoom, setMapZoom] = useState(13);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const searchPlaces = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `format=json&` +
        `q=${encodeURIComponent(query + ', Buxar, Bihar')}` +
        `&bounded=1` +
        `&viewbox=${BUXAR_BOUNDS[0][1]},${BUXAR_BOUNDS[0][0]},${BUXAR_BOUNDS[1][1]},${BUXAR_BOUNDS[1][0]}` +
        `&limit=10`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      searchPlaces(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleResultClick = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setMapCenter([lat, lon]);
    setMapZoom(16);
    
    const newMarker: MarkerData = {
      position: [lat, lon],
      name: result.display_name,
      type: result.type,
    };
    setMarkers([...markers, newMarker]);
    
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleCategoryClick = async (category: Category) => {
    setSelectedCategory(category.id);
    setSearchQuery(category.query);
    
    // Auto-search for category
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `format=json&` +
        `q=${encodeURIComponent(category.query + ', Buxar, Bihar')}` +
        `&bounded=1` +
        `&viewbox=${BUXAR_BOUNDS[0][1]},${BUXAR_BOUNDS[0][0]},${BUXAR_BOUNDS[1][1]},${BUXAR_BOUNDS[1][0]}` +
        `&limit=20`
      );
      const data = await response.json();
      
      // Add all results as markers
      const newMarkers: MarkerData[] = data.map((result: SearchResult) => ({
        position: [parseFloat(result.lat), parseFloat(result.lon)] as [number, number],
        name: result.display_name.split(',')[0],
        type: category.name,
      }));
      
      setMarkers(newMarkers);
      setMapCenter(BUXAR_CENTER);
      setMapZoom(13);
    } catch (error) {
      console.error('Category search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter([latitude, longitude]);
          setMapZoom(15);
          
          const newMarker: MarkerData = {
            position: [latitude, longitude],
            name: 'Your Location',
            type: 'current_location',
          };
          setMarkers([newMarker]);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your location.');
        }
      );
    }
  };

  const clearMarkers = () => {
    setMarkers([]);
    setSelectedCategory(null);
  };

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden">
      {/* Search Bar */}
      <div className="absolute top-4 left-4 right-4 z-[1000] max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg">
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <Search className="text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search places in Buxar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 outline-none text-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="max-h-64 overflow-y-auto">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleResultClick(result)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="text-blue-500 mt-1 flex-shrink-0" size={16} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {result.display_name.split(',')[0]}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {result.display_name}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {isSearching && (
            <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div className="absolute top-20 left-4 right-4 z-[1000] max-w-2xl mx-auto">
        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                selectedCategory === category.id
                  ? `${category.color} text-white shadow-lg`
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {category.icon}
              {category.name}
            </button>
          ))}
          {markers.length > 0 && (
            <button
              onClick={clearMarkers}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-gray-800 text-white hover:bg-gray-700 whitespace-nowrap"
            >
              <X size={16} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Controls */}
      <button
        onClick={getCurrentLocation}
        className="absolute bottom-24 right-4 z-[1000] bg-white p-3 rounded-full shadow-lg hover:bg-gray-50 transition-colors"
        title="Get current location"
      >
        <Navigation className="text-blue-500" size={24} />
      </button>

      {/* Marker Counter */}
      {markers.length > 0 && (
        <div className="absolute bottom-24 left-4 z-[1000] bg-white px-4 py-2 rounded-full shadow-lg text-sm font-medium">
          {markers.length} {markers.length === 1 ? 'location' : 'locations'}
        </div>
      )}

      {/* Map */}
      <MapContainer
        center={BUXAR_CENTER}
        zoom={13}
        className="w-full h-full"
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <FlyToLocation center={mapCenter} zoom={mapZoom} />

        {markers.map((marker, index) => (
          <Marker key={index} position={marker.position}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{marker.name}</p>
                <p className="text-gray-600 text-xs capitalize">{marker.type}</p>
                <p className="text-gray-500 text-xs mt-1">
                  {marker.position[0].toFixed(6)}, {marker.position[1].toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

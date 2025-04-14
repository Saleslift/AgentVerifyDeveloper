import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, FileText, Car as CarIcon, Navigation, Bus, Share2, MapPin } from 'lucide-react';
import { GoogleMap, Marker, Circle, DirectionsRenderer } from '@react-google-maps/api';
import { getGeocode, getLatLng } from 'use-places-autocomplete';
import NearbyPlaces from '../components/property/NearbyPlaces';
import PropertyDetails from '../components/property/PropertyDetails';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Property } from '../types';
import { supabase } from '../utils/supabase';
import { useCurrency } from '../contexts/CurrencyContext';
import { initPageVisibilityHandling, cleanupPageVisibilityHandling } from '../utils/pageVisibility';
import ShareModal from '../components/property/ShareModal';

interface LocationCoords {
  lat: number;
  lng: number;
}

interface DirectionsInfo {
  driving?: google.maps.DirectionsResult;
  walking?: google.maps.DirectionsResult;
  transit?: google.maps.DirectionsResult;
}

export default function PropertyPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [areaCoords, setAreaCoords] = useState<LocationCoords | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [showDirectionsPanel, setShowDirectionsPanel] = useState(false);
  const [destination, setDestination] = useState('');
  const [directions, setDirections] = useState<DirectionsInfo>({});
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Initialize page visibility handling to prevent reloads
  useEffect(() => {
    initPageVisibilityHandling();
    return () => cleanupPageVisibilityHandling();
  }, []);

  useEffect(() => {
    if (window.googleMapsLoaded) {
      setIsMapLoaded(true);
    } else {
      const handleLoad = () => setIsMapLoaded(true);
      window.addEventListener('google-maps-loaded', handleLoad);
      return () => window.removeEventListener('google-maps-loaded', handleLoad);
    }
  }, []);

  useEffect(() => {
    fetchProperty();
  }, [slug]);

  useEffect(() => {
    if (property && !property.lat && !property.lng) {
      geocodeLocation(property.location);
    }
  }, [property]);

  const fetchProperty = async () => {
    try {
      if (!slug) return;

      const { data, error: fetchError } = await supabase
        .from('properties')
        .select(`
          *,
          agent:agent_id(
            full_name,
            avatar_url,
            agency_name,
            whatsapp,
            email
          )
        `)
        .eq('slug', slug)
        .single();

      if (fetchError) throw fetchError;

      // Transform the data to match Property type
      const transformedData: Property = {
        ...data,
        contractType: data.contract_type,
        furnishingStatus: data.furnishing_status,
        completionStatus: data.completion_status,
        floorPlanImage: data.floor_plan_image,
        parkingAvailable: data.parking_available || false,
        agentId: data.agent_id
      };

      setProperty(transformedData);
    } catch (err) {
      console.error('Error fetching property:', err);
      setError('Failed to load property details');
    } finally {
      setLoading(false);
    }
  };

  const geocodeLocation = async (location: string) => {
    try {
      const results = await getGeocode({ address: `${location}, UAE` });
      const { lat, lng } = await getLatLng(results[0]);
      
      setAreaCoords({ lat, lng });

      const { error: updateError } = await supabase
        .from('properties')
        .update({ lat, lng })
        .eq('slug', slug);

      if (updateError) {
        console.error('Error updating coordinates:', updateError);
      }
    } catch (error) {
      console.error('Error geocoding location:', error);
    }
  };

  const calculateRoute = async (mode: google.maps.TravelMode) => {
    if (!destination || !property?.lat || !property?.lng) return;

    setCalculatingRoute(true);
    const directionsService = new google.maps.DirectionsService();

    try {
      const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        directionsService.route(
          {
            origin: { lat: property.lat, lng: property.lng },
            destination,
            travelMode: mode,
            region: 'AE',
            optimizeWaypoints: true
          },
          (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result) {
              resolve(result);
            } else {
              reject(status);
            }
          }
        );
      });

      setDirections(prev => ({
        ...prev,
        [mode.toLowerCase()]: result
      }));
    } catch (error) {
      console.error(`Error calculating ${mode} route:`, error);
    } finally {
      setCalculatingRoute(false);
    }
  };

  const handleMarkerClick = () => {
    setShowDirectionsPanel(true);
  };

  const handleCalculateRoutes = async () => {
    if (!destination) return;
    
    await Promise.all([
      calculateRoute(google.maps.TravelMode.DRIVING),
      calculateRoute(google.maps.TravelMode.WALKING),
      calculateRoute(google.maps.TravelMode.TRANSIT)
    ]);
  };

  const handlePrevImage = () => {
    if (!property) return;
    setActiveImageIndex((prev) => 
      prev === 0 ? property.images.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    if (!property) return;
    setActiveImageIndex((prev) => 
      prev === property.images.length - 1 ? 0 : prev + 1
    );
  };

  const handleShare = () => {
    if (!property) return;
    setShowShareModal(true);
  };

  const handleCopySuccess = () => {
    setShowCopiedMessage(true);
    setTimeout(() => setShowCopiedMessage(false), 2000);
  };

  const renderMap = () => {
    if (!isMapLoaded) return null;

    const hasExactLocation = property?.lat && property?.lng;
    const center = hasExactLocation 
      ? { lat: property.lat, lng: property.lng }
      : areaCoords;

    if (!center) return null;

    return (
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Location</h2>
          <MapPin className="h-6 w-6 text-gray-400" />
        </div>

        {showDirectionsPanel && (
          <div className="mb-4">
            <div className="flex gap-4">
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Enter destination address"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <button
                onClick={handleCalculateRoutes}
                disabled={!destination || calculatingRoute}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
              >
                {calculatingRoute ? 'Calculating...' : 'Get Directions'}
              </button>
            </div>

            {Object.entries(directions).map(([mode, result]) => {
              if (!result?.routes[0]) return null;
              
              const route = result.routes[0];
              const leg = route.legs[0];
              if (!leg) return null;

              const icon = mode === 'driving' ? CarIcon : mode === 'walking' ? Navigation : Bus;
              const Icon = icon;

              return (
                <div key={mode} className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-5 w-5" />
                    <span className="font-medium capitalize">{mode}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>Distance: {leg.distance?.text}</div>
                    <div>Duration: {leg.duration?.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="h-[400px] rounded-lg overflow-hidden">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={center}
            zoom={hasExactLocation ? 16 : 14}
            options={{
              styles: [
                {
                  featureType: 'poi',
                  elementType: 'labels',
                  stylers: [{ visibility: 'off' }]
                }
              ],
              mapTypeControl: true,
              streetViewControl: true,
              fullscreenControl: true
            }}
          >
            {hasExactLocation ? (
              <Marker 
                position={{ lat: property.lat, lng: property.lng }}
                onClick={handleMarkerClick}
                options={{
                  icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: '#000000',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 2,
                    scale: 8
                  }
                }}
              />
            ) : (
              <Circle
                center={center}
                radius={1000}
                options={{
                  fillColor: '#000000',
                  fillOpacity: 0.1,
                  strokeColor: '#000000',
                  strokeOpacity: 0.3,
                  strokeWeight: 2
                }}
              />
            )}

            {Object.values(directions).map((result, index) => (
              result && (
                <DirectionsRenderer
                  key={index}
                  directions={result}
                  options={{
                    suppressMarkers: true,
                    polylineOptions: {
                      strokeColor: '#000000',
                      strokeOpacity: 0.6,
                      strokeWeight: 4
                    }
                  }}
                />
              )
            ))}
          </GoogleMap>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black"></div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error || 'Property not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="pt-20 bg-white">
        <div className="container mx-auto px-4 py-6">
          {/* Price and Address Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-3xl font-bold text-black">
                {formatPrice(property.price)}
              </h2>
              <button
                onClick={handleShare}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
              >
                <Share2 className="h-6 w-6" />
              </button>
            </div>
            <p className="text-gray-700 text-lg mb-2">{property.location}</p>
            <h1 className="text-2xl font-bold text-gray-900">{property.title}</h1>
          </div>

          {/* Main Image with Gallery */}
          <div className="relative mb-8">
            <div 
              className="aspect-[16/9] overflow-hidden rounded-xl cursor-pointer bg-gray-100"
              onClick={() => setShowGallery(true)}
            >
              <img
                src={property.images[activeImageIndex]}
                alt={property.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Thumbnail Navigation */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <div className="flex gap-2">
                {property.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImageIndex(index)}
                    className={`w-2 h-2 rounded-full ${
                      index === activeImageIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={handlePrevImage}
              className="absolute top-1/2 left-4 -translate-y-1/2 p-2 bg-white/10 rounded-full hover:bg-white/20"
            >
              <ChevronLeft className="h-6 w-6 text-white" />
            </button>
            <button
              onClick={handleNextImage}
              className="absolute top-1/2 right-4 -translate-y-1/2 p-2 bg-white/10 rounded-full hover:bg-white/20"
            >
              <ChevronRight className="h-6 w-6 text-white" />
            </button>
          </div>
          {/* Mobile Property Details - Shown at the top on mobile */}
          <div className="md:hidden mb-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Property Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Type</span>
                  <span className="font-medium">{property.type}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Purpose</span>
                  <span className="font-medium">For {property.contractType}</span>
                </div>
                {property.furnishingStatus && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Furnishing</span>
                    <span className="font-medium">{property.furnishingStatus}</span>
                  </div>
                )}
                {property.completionStatus && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Completion</span>
                    <span className="font-medium">{property.completionStatus}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Parking</span>
                  <span className="font-medium">{property.parkingAvailable ? 'Available' : 'Not Available'}</span>
                </div>
              </div>
            </div>
            
            {/* Property Highlight on mobile */}
            {property.highlight && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
                <h3 className="text-lg font-semibold mb-3">Property Highlight</h3>
                <p className="text-gray-700">{property.highlight}</p>
              </div>
            )}
            
            {/* Horizontal divider for mobile */}
            <div className="h-px bg-gray-200 w-full my-6 md:hidden"></div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {/* Property Details Component */}
              <div className="hidden md:block mb-8">
                {property && <PropertyDetails property={property} />}
              </div>
              
              {/* Floor Plan */}
              {property.floorPlanImage && (
                <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Floor Plan</h2>
                    <FileText className="h-6 w-6 text-gray-400" />
                  </div>
                  <img
                    src={property.floorPlanImage}
                    alt="Floor Plan"
                    className="w-full rounded-lg"
                  />
                </div>
              )}

              {/* Location Map */}
              {renderMap()}
              
              {/* Nearby Places */}
              {property.lat && property.lng && (
                <NearbyPlaces propertyLat={property.lat} propertyLng={property.lng} />
              )}
            </div>

            {/* Price Card for Desktop */}
            <div className="lg:col-span-1 space-y-6">
              <div className="hidden md:block">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Property Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Type</span>
                      <span className="font-medium">{property.type}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Purpose</span>
                      <span className="font-medium">For {property.contractType}</span>
                    </div>
                    {property.furnishingStatus && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Furnishing</span>
                        <span className="font-medium">{property.furnishingStatus}</span>
                      </div>
                    )}
                    {property.completionStatus && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Completion</span>
                        <span className="font-medium">{property.completionStatus}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Parking</span>
                      <span className="font-medium">{property.parkingAvailable ? 'Available' : 'Not Available'}</span>
                    </div>
                  </div>
                </div>
              
                {/* Highlight Feature */}
                {property.highlight && (
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mt-6">
                    <h3 className="text-lg font-semibold mb-3">Property Highlight</h3>
                    <p className="text-gray-700">{property.highlight}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Fullscreen Gallery */}
      {showGallery && (
        <div className="fixed inset-0 bg-black z-50">
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setShowGallery(false)}
              className="p-2 bg-white/10 rounded-full hover:bg-white/20"
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          
          <div className="h-full flex items-center justify-center">
            <img
              src={property.images[activeImageIndex]}
              alt={property.title}
              className="max-h-full max-w-full object-contain"
            />
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <div className="flex gap-2">
              {property.images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveImageIndex(index)}
                  className={`w-2 h-2 rounded-full ${
                    index === activeImageIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handlePrevImage}
            className="absolute top-1/2 left-4 -translate-y-1/2 p-2 bg-white/10 rounded-full hover:bg-white/20"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
          <button
            onClick={handleNextImage}
            className="absolute top-1/2 right-4 -translate-y-1/2 p-2 bg-white/10 rounded-full hover:bg-white/20"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        property={property}
        onCopySuccess={handleCopySuccess}
      />

      {/* Copied Message */}
      {showCopiedMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-lg text-sm animate-fade-in z-50">
          Link copied!
        </div>
      )}

      <Footer />
    </div>
  );
}
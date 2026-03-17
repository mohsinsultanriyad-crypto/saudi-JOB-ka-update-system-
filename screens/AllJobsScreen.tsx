
import React, { useState, useEffect } from 'react';
import { Job } from '../types';
import { getGlobalJobs, markAsViewedLocal } from '../services/api';
import JobCard from '../components/JobCard';
import InteractiveJobMap from '../components/InteractiveJobMap';
import { Search, SlidersHorizontal, RefreshCw, MapPin, Navigation, Map as MapIcon, X } from 'lucide-react';
import { useNotification } from '../components/NotificationContext';

interface AllJobsScreenProps {
  onJobClick: (job: Job) => void;
}

const AllJobsScreen: React.FC<AllJobsScreenProps> = ({ onJobClick }) => {
  const { showNotification } = useNotification();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sortByDistance, setSortByDistance] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await getGlobalJobs();
      setJobs(data);
    } catch (error: any) {
      console.error('Failed to load jobs:', error);
      const isNetworkError = error instanceof TypeError && error.message === 'Failed to fetch';
      const isDbError = error.message?.toLowerCase().includes('database') || error.message?.includes('503');
      
      let message = error.message || "We're having trouble reaching the server. Please try again later.";
      if (isNetworkError) message = "Please check your internet connection and try again.";
      if (isDbError) {
        message = error.message || "Database connection issue. The server is unable to reach the database.";
      }

      showNotification(message, isNetworkError ? 'network' : 'error');
    } finally {
      setLoading(false);
    }
  };

  const [isLocating, setIsLocating] = useState(false);

  const requestLocation = (silent = false) => {
    if (!silent) {
      setLocationError(null);
      setIsLocating(true);
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(loc);
          localStorage.setItem('user_location', JSON.stringify(loc));
          if (!silent) {
            setSortByDistance(true);
            setIsLocating(false);
          }
        },
        (error) => {
          if (!silent) {
            setIsLocating(false);
            console.error("Error getting location:", error);
            let msg = "Could not get your location.";
            if (error.code === 1) msg = "Location permission denied.";
            else if (error.code === 2) msg = "Location unavailable.";
            else if (error.code === 3) msg = "Location request timed out.";
            
            setLocationError(msg);
            setSortByDistance(false);
          }
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    } else if (!silent) {
      setIsLocating(false);
      setLocationError("Geolocation is not supported by your browser.");
    }
  };

  useEffect(() => {
    loadJobs();
    
    // Try to load cached location first for instant response
    const cached = localStorage.getItem('user_location');
    if (cached) {
      try {
        setUserLocation(JSON.parse(cached));
      } catch (e) {}
    }
    
    // Silently request fresh location in background
    requestLocation(true);
  }, []);

  const handleJobClick = (job: Job) => {
    markAsViewedLocal(job.id);
    onJobClick(job);
  };

  const getProcessedJobs = () => {
    let filtered = jobs.filter(job => 
      job.jobRole?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortByDistance && userLocation) {
      filtered = filtered.map(job => {
        if (job.coordinates) {
          return {
            ...job,
            distance: calculateDistance(userLocation.lat, userLocation.lng, job.coordinates.lat, job.coordinates.lng)
          };
        }
        return job;
      }).sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    }

    return filtered;
  };

  const filteredJobs = getProcessedJobs();

  return (
    <div className="pb-24">
      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-extrabold text-gray-900">Explore Jobs</h2>
          <button 
            onClick={loadJobs}
            disabled={loading}
            className={`p-2 bg-white rounded-full shadow-sm border border-gray-100 transition-all ${loading ? 'animate-spin opacity-50' : 'active:scale-90'}`}
          >
            <RefreshCw size={18} className="text-green-600" />
          </button>
        </div>
        
        {locationError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 animate-in slide-in-from-top-2">
            <Navigation size={16} className="shrink-0" />
            <p className="text-xs font-medium">{locationError}</p>
            <button 
              onClick={() => setLocationError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by role or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-12 py-4 shadow-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
          />
          <button className="absolute right-4 top-1/2 -translate-y-1/2 text-green-600 bg-green-50 p-2 rounded-lg">
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {/* Filters/Sort */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
          <button 
            onClick={() => setSortByDistance(false)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${!sortByDistance ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-100'}`}
          >
            Latest Posts
          </button>
          <button 
            onClick={() => requestLocation()}
            disabled={isLocating}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${sortByDistance ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-100'} ${isLocating ? 'opacity-70' : ''}`}
          >
            <Navigation size={12} className={isLocating ? 'animate-pulse' : ''} fill={sortByDistance ? 'white' : 'none'} />
            {isLocating ? 'Locating...' : 'Jobs Near Me'}
          </button>
          <button 
            onClick={() => setShowMap(true)}
            className="px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 bg-white text-gray-500 border border-gray-100 hover:border-green-200"
          >
            <MapIcon size={12} />
            Map View
          </button>
        </div>

        {/* Job List */}
        <div className="mt-4 space-y-4">
          {loading && jobs.length === 0 ? (
            <div className="py-20 text-center text-gray-400 animate-pulse">Syncing with server...</div>
          ) : filteredJobs.length > 0 ? (
            filteredJobs.map((job, index) => (
              <JobCard 
                key={job.id}
                job={job} 
                onClick={() => handleJobClick(job)} 
              />
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="text-gray-300" size={32} />
              </div>
              <p className="text-gray-500 font-medium">No jobs found matching your search</p>
              <button 
                onClick={() => setSearchTerm('')}
                className="mt-2 text-green-600 font-bold"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {showMap && (
        <InteractiveJobMap 
          jobs={jobs} 
          onJobClick={(job) => {
            setShowMap(false);
            handleJobClick(job);
          }}
          onClose={() => setShowMap(false)}
        />
      )}
    </div>
  );
};

export default AllJobsScreen;

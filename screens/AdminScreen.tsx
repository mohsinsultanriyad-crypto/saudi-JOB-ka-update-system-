
import React, { useState, useEffect } from 'react';
import { Job } from '../types';
import { getGlobalJobs, deleteGlobalJob, adminUpdateJob } from '../services/api';
import { Trash2, ShieldAlert, Search, RefreshCcw, LogOut, Loader2, Clock, ShieldCheck, Building2 } from 'lucide-react';
import { useNotification } from '../components/NotificationContext';

interface AdminScreenProps {
  onLogout: () => void;
}

const AdminScreen: React.FC<AdminScreenProps> = ({ onLogout }) => {
  const { showNotification } = useNotification();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await getGlobalJobs();
      setJobs(data);
    } catch (err) {
      console.error('Admin fetch failed:', err);
      showNotification("Failed to sync database. Check your connection.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('ADMIN ACTION: Are you sure you want to PERMANENTLY delete this job from the global database?')) {
      setDeletingId(id);
      try {
        const success = await deleteGlobalJob(id, undefined, 'saudi_admin_2025');
        if (success) {
          setJobs(prev => prev.filter(j => j.id !== id));
          showNotification('Job deleted successfully by Admin.', 'success');
        } else {
          showNotification('Failed to delete job. It might have been already removed.', 'error');
        }
      } catch (err) {
        showNotification('An error occurred during deletion.', 'error');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleToggleVerify = async (job: Job) => {
    setVerifyingId(job.id);
    try {
      const updated = await adminUpdateJob(job.id, { isVerified: !job.isVerified });
      setJobs(prev => prev.map(j => j.id === job.id ? updated : j));
      showNotification(`Employer ${!job.isVerified ? 'verified' : 'unverified'} successfully.`, 'success');
    } catch (err) {
      showNotification('Failed to update verification status.', 'error');
    } finally {
      setVerifyingId(null);
    }
  };

  const filteredJobs = jobs.filter(j => 
    j.jobRole?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    j.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isNearingExpiry = (postedAt: number) => {
    const fifteenDaysInMs = 15 * 24 * 60 * 60 * 1000;
    const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
    const expiryTime = postedAt + fifteenDaysInMs;
    const remainingTime = expiryTime - Date.now();
    return remainingTime > 0 && remainingTime < threeDaysInMs;
  };

  return (
    <div className="pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Admin Toolbar */}
      <div className="bg-red-600 border-b border-red-700 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-lg">
        <div className="flex items-center text-white font-bold">
          <ShieldAlert size={20} className="mr-2 animate-pulse" />
          ADMINISTRATOR PANEL
        </div>
        <button 
          onClick={onLogout}
          className="text-white bg-red-700 hover:bg-red-800 px-4 py-2 rounded-xl transition-colors flex items-center text-xs font-bold border border-red-500"
        >
          <LogOut size={14} className="mr-2" /> SIGN OUT
        </button>
      </div>

      <div className="px-6 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">Live Global Postings</h2>
            <p className="text-xs text-gray-400 mt-1">Total Jobs: {jobs.length}</p>
          </div>
          <button 
            onClick={fetchJobs} 
            disabled={loading}
            className={`p-3 bg-white shadow-sm border border-gray-100 rounded-full hover:bg-gray-50 transition-all ${loading ? 'animate-spin' : 'active:scale-90'}`}
          >
            <RefreshCcw size={18} className="text-green-600" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Filter global database..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-4 py-4 shadow-sm outline-none focus:ring-2 focus:ring-red-500 transition-all"
          />
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-20 text-gray-400">
               <Loader2 className="animate-spin mb-2" size={32} />
               <span className="text-sm font-medium">Syncing database...</span>
             </div>
          ) : filteredJobs.length > 0 ? (
            filteredJobs.map(job => {
              const nearingExpiry = isNearingExpiry(job.postedAt);
              return (
                <div 
                  key={job.id} 
                  className={`bg-white p-5 rounded-2xl border ${nearingExpiry ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'} shadow-sm flex items-center justify-between hover:border-red-100 transition-colors group relative`}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-bold text-gray-800 truncate">{job.jobRole}</h3>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">ID: {job.id}</span>
                      {nearingExpiry && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-md animate-pulse">
                          <Clock size={10} /> EXPIRING SOON
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <p className="flex items-center">
                        <span className="font-semibold text-gray-700 mr-1">Owner:</span> {job.fullName}
                      </p>
                      <p className="flex items-center text-green-600 font-medium italic">
                        {job.city} • {job.email}
                      </p>
                      {job.crNumber && (
                        <p className="flex items-center text-blue-600 font-bold text-[10px] mt-1">
                          <Building2 size={10} className="mr-1" /> CR: {job.crNumber}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleVerify(job);
                      }}
                      disabled={verifyingId === job.id}
                      className={`p-3 rounded-xl transition-all ${
                        job.isVerified 
                        ? 'bg-amber-100 text-amber-600 border border-amber-200 shadow-sm' 
                        : 'bg-gray-50 text-gray-400 border border-gray-100 hover:border-amber-200'
                      }`}
                      title={job.isVerified ? "Unverify Employer" : "Verify Employer"}
                    >
                      {verifyingId === job.id ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} fill={job.isVerified ? "currentColor" : "none"} className={job.isVerified ? "text-amber-600" : ""} />}
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(job.id);
                      }}
                      disabled={deletingId === job.id}
                      className={`p-3 rounded-xl transition-all ${
                        deletingId === job.id 
                        ? 'bg-gray-100 text-gray-400' 
                        : 'bg-red-50 text-red-500 hover:bg-red-600 hover:text-white shadow-sm'
                      }`}
                    >
                      {deletingId === job.id ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <ShieldAlert className="mx-auto text-gray-200 mb-4" size={48} />
              <p className="text-gray-400 font-medium italic">No jobs match your admin filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminScreen;

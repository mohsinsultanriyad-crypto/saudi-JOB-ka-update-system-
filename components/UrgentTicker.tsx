
import React from 'react';
import { Zap } from 'lucide-react';
import { Job } from '../types';

interface UrgentTickerProps {
  jobs: Job[];
  onJobClick: (job: Job) => void;
}

const UrgentTicker: React.FC<UrgentTickerProps> = ({ jobs, onJobClick }) => {
  const urgentJobs = jobs.filter(job => 
    job.isUrgent && (job.urgentUntil ? job.urgentUntil > Date.now() : true)
  );

  if (urgentJobs.length === 0) return null;

  return (
    <div className="bg-red-600 text-white py-2 overflow-hidden whitespace-nowrap relative flex items-center shadow-md">
      <div className="flex items-center px-4 bg-red-600 z-10 font-black text-[10px] tracking-tighter border-r border-red-500">
        <Zap size={12} className="mr-1 fill-white" />
        URGENT
      </div>
      <div className="flex animate-marquee">
        {[...urgentJobs, ...urgentJobs].map((job, index) => (
          <button
            key={`${job.id}-${index}`}
            onClick={() => onJobClick(job)}
            className="inline-flex items-center mx-4 text-xs font-bold hover:underline"
          >
            <span className="opacity-70 mr-2">•</span>
            {job.jobRole} in {job.city}
          </button>
        ))}
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-flex;
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}} />
    </div>
  );
};

export default UrgentTicker;


import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Job } from '../types';
import { MapPin, X } from 'lucide-react';

interface InteractiveJobMapProps {
  jobs: Job[];
  onJobClick: (job: Job) => void;
  onClose: () => void;
}

const InteractiveJobMap: React.FC<InteractiveJobMapProps> = ({ jobs, onJobClick, onClose }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 400;
    const height = 300;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Saudi Arabia bounding box (approximate)
    // Lat: 16 to 32, Lng: 34 to 56
    const projection = d3.geoMercator()
      .center([45, 24])
      .scale(1200)
      .translate([width / 2, height / 2]);

    // Simple Saudi Arabia path (simplified polygon)
    const saudiPath = [
      [34.5, 28.5], [39.0, 32.0], [44.5, 33.5], [48.5, 30.0], [51.5, 24.5], 
      [56.0, 24.0], [53.5, 17.5], [52.5, 19.0], [47.5, 16.5], [42.5, 16.5], 
      [42.5, 18.0], [39.5, 21.5], [34.5, 28.5]
    ];

    const lineGenerator = d3.line()
      .x(d => projection([d[0], d[1]])![0])
      .y(d => projection([d[0], d[1]])![1])
      .curve(d3.curveCardinalClosed);

    // Draw Map Background
    svg.append("path")
      .attr("d", lineGenerator(saudiPath as any))
      .attr("fill", "#f3f4f6")
      .attr("stroke", "#e5e7eb")
      .attr("stroke-width", 2);

    // Group jobs by coordinates (approximate)
    const jobGroups: Record<string, Job[]> = {};
    jobs.forEach(job => {
      if (job.coordinates) {
        const key = `${job.coordinates.lat.toFixed(1)}-${job.coordinates.lng.toFixed(1)}`;
        if (!jobGroups[key]) jobGroups[key] = [];
        jobGroups[key].push(job);
      }
    });

    // Draw Job Points
    Object.values(jobGroups).forEach(group => {
      const job = group[0];
      const [x, y] = projection([job.coordinates!.lng, job.coordinates!.lat])!;

      const g = svg.append("g")
        .attr("class", "cursor-pointer")
        .on("click", () => onJobClick(job));

      // Pulse effect for urgent jobs
      const hasUrgent = group.some(j => j.isUrgent);
      if (hasUrgent) {
        g.append("circle")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", 8)
          .attr("fill", "#ef4444")
          .attr("opacity", 0.3)
          .append("animate")
          .attr("attributeName", "r")
          .attr("values", "8;15;8")
          .attr("dur", "2s")
          .attr("repeatCount", "indefinite");
      }

      g.append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", 5)
        .attr("fill", hasUrgent ? "#ef4444" : "#10b981")
        .attr("stroke", "white")
        .attr("stroke-width", 2);

      g.append("text")
        .attr("x", x)
        .attr("y", y - 10)
        .attr("text-anchor", "middle")
        .attr("font-size", "8px")
        .attr("font-weight", "bold")
        .attr("fill", "#374151")
        .text(`${job.city} (${group.length})`);
    });

  }, [jobs]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="bg-green-100 p-2 rounded-xl">
              <MapPin className="text-green-600" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Interactive Job Map</h3>
              <p className="text-[10px] text-gray-500 font-medium">Explore opportunities across the Kingdom</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-400 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 flex justify-center bg-white relative">
          <svg 
            ref={svgRef} 
            width="400" 
            height="300" 
            viewBox="0 0 400 300"
            className="max-w-full h-auto"
          />
          <div className="absolute bottom-4 left-6 flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
              <span className="text-[10px] font-bold text-gray-500 uppercase">Standard</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm animate-pulse"></div>
              <span className="text-[10px] font-bold text-gray-500 uppercase">Urgent</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-400 font-medium">Click on a city marker to view jobs in that area.</p>
        </div>
      </div>
    </div>
  );
};

export default InteractiveJobMap;

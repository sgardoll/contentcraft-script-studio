
import React from 'react';
import type { TranscriptSegment } from '../types';

interface TranscriptDisplayProps {
  title: string;
  transcript: TranscriptSegment[];
  onTimestampClick: (time: number) => void;
  className?: string;
}

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  return new Date(seconds * 1000).toISOString().substring(14, 19);
};

const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({ title, transcript, onTimestampClick, className = '' }) => {
  return (
    <div className={`flex flex-col bg-gray-800 rounded-lg shadow-lg border border-gray-700 ${className}`}>
      <h3 className="text-xl font-semibold p-4 border-b border-gray-700 text-indigo-300 sticky top-0 bg-gray-800/80 backdrop-blur-sm z-10">{title}</h3>
      <div className="p-4 space-y-3 overflow-y-auto flex-grow">
        {transcript.length === 0 ? (
          <p className="text-gray-400">No transcript available.</p>
        ) : (
          transcript.map((segment, index) => (
            <div
              key={index}
              onClick={() => onTimestampClick(segment.start)}
              className="flex items-start cursor-pointer group p-2 rounded-md hover:bg-gray-700/50 transition-colors"
            >
              <span className="font-mono text-sm text-indigo-400 mr-3 mt-1 w-12 text-right">
                [{formatTime(segment.start)}]
              </span>
              <p className="text-gray-300 group-hover:text-white transition-colors flex-1">
                {segment.text}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TranscriptDisplay;

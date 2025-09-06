import React from 'react';
import type { TranscriptSegment } from '../types';
import { DownloadIcon } from './icons';

interface ComparisonTranscriptDisplayProps {
  originalTranscript: TranscriptSegment[];
  revisedTranscript: TranscriptSegment[];
  onTimestampClick: (time: number) => void;
  className?: string;
}

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  return new Date(seconds * 1000).toISOString().substring(14, 19);
};

// Helper function to format and download transcript as an SRT file
const downloadAsSrt = (transcript: TranscriptSegment[], filename: string) => {
    if (!transcript || transcript.length === 0) return;

    const formatSrtTime = (seconds: number): string => {
        if (isNaN(seconds) || seconds < 0) return "00:00:00,000";
        const date = new Date(0);
        date.setSeconds(seconds);
        const timeStr = date.toISOString().substring(11, 23);
        return timeStr.replace('.', ',');
    };

    const content = transcript.map((segment, index) => {
        const startTime = formatSrtTime(segment.start);
        const endTime = formatSrtTime(segment.end);
        return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`;
    }).join('\n');

    const blob = new Blob([content], { type: 'text/srt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};


const ComparisonTranscriptDisplay: React.FC<ComparisonTranscriptDisplayProps> = ({ originalTranscript, revisedTranscript, onTimestampClick, className = '' }) => {
  const hasTranscripts = originalTranscript.length > 0 && revisedTranscript.length > 0;

  return (
    <div className={`flex flex-col bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden ${className}`}>
      <div className="flex justify-between items-center p-4 border-b border-gray-700 sticky top-0 bg-gray-800/80 backdrop-blur-sm z-10">
        <h3 className="text-xl font-semibold text-indigo-300">Script Comparison</h3>
         <div className="flex items-center gap-2">
            <button
                onClick={() => downloadAsSrt(originalTranscript, 'original_script.srt')}
                disabled={!originalTranscript || originalTranscript.length === 0}
                className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Download Original Script as SRT"
            >
                <DownloadIcon />
                Original
            </button>
            <button
                onClick={() => downloadAsSrt(revisedTranscript, 'revised_script.srt')}
                disabled={!revisedTranscript || revisedTranscript.length === 0}
                className="flex items-center px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Download Revised Script as SRT"
            >
                <DownloadIcon />
                Revised
            </button>
        </div>
      </div>
      
      <div className="flex-grow overflow-y-auto">
        {/* Headers */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-900/50 sticky top-[76px] z-10">
            <div className="col-span-2 md:col-span-1 font-bold text-sm text-gray-400">Time</div>
            <div className="col-span-5 md:col-span-5 font-bold text-sm text-gray-400">Original Transcript</div>
            <div className="col-span-5 md:col-span-6 font-bold text-sm text-gray-400">AI-Revised Script</div>
        </div>

        {/* Content */}
        <div className="divide-y divide-gray-700/50">
          {!hasTranscripts ? (
            <p className="text-gray-400 p-4">No transcript available.</p>
          ) : (
            originalTranscript.map((segment, index) => {
              const revisedSegment = revisedTranscript[index];
              return (
                <div 
                  key={index} 
                  className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-gray-700/50 transition-colors"
                >
                  <div 
                    className="col-span-2 md:col-span-1 font-mono text-sm text-indigo-400 cursor-pointer"
                    onClick={() => onTimestampClick(segment.start)}
                  >
                    [{formatTime(segment.start)}]
                  </div>
                  <div className="col-span-5 md:col-span-5 text-gray-400 text-sm">
                    {segment.text}
                  </div>
                  <div className="col-span-5 md:col-span-6 text-gray-200 text-sm">
                    {revisedSegment ? revisedSegment.text : <span className="text-gray-500">No revision available.</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ComparisonTranscriptDisplay;
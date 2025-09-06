import React, { useLayoutEffect, useRef, useEffect } from 'react';
import type { TranscriptSegment } from '../types';
import { DownloadIcon, SparklesIcon, SpinnerIcon } from './icons';

interface ComparisonTranscriptDisplayProps {
  originalTranscript: TranscriptSegment[];
  revisedTranscript: TranscriptSegment[];
  onTimestampClick: (time: number) => void;
  className?: string;
  setOriginalTranscript: React.Dispatch<React.SetStateAction<TranscriptSegment[] | null>>;
  setRevisedTranscript: React.Dispatch<React.SetStateAction<TranscriptSegment[] | null>>;
  onReReviseSegment: (index: number) => void;
  revisingSegments: Record<number, boolean>;
  activeSegmentIndex: number;
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

// A textarea that automatically adjusts its height to fit the content
const AutoSizingTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [props.value]);

  return <textarea ref={textareaRef} rows={1} {...props} />;
};


const ComparisonTranscriptDisplay: React.FC<ComparisonTranscriptDisplayProps> = ({ 
  originalTranscript, 
  revisedTranscript, 
  onTimestampClick, 
  className = '',
  setOriginalTranscript,
  setRevisedTranscript,
  onReReviseSegment,
  revisingSegments,
  activeSegmentIndex
}) => {
  const hasTranscripts = originalTranscript.length > 0 && revisedTranscript.length > 0;
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Effect to scroll the active segment into view
  useEffect(() => {
    if (activeSegmentIndex >= 0 && segmentRefs.current[activeSegmentIndex]) {
      segmentRefs.current[activeSegmentIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeSegmentIndex]);

  const handleOriginalChange = (index: number, newText: string) => {
    setOriginalTranscript(prev => {
        if (!prev) return null;
        const newTranscript = [...prev];
        newTranscript[index] = { ...newTranscript[index], text: newText };
        return newTranscript;
    });
  };

  const handleRevisedChange = (index: number, newText: string) => {
      setRevisedTranscript(prev => {
          if (!prev) return null;
          const newTranscript = [...prev];
          newTranscript[index] = { ...newTranscript[index], text: newText };
          return newTranscript;
      });
  };

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
              const isActive = index === activeSegmentIndex;
              return (
                <div 
                  key={index}
                  // FIX: The ref callback for an array of refs should not return a value.
                  // The implicit return of an arrow function was causing a type error.
                  // Wrapping the assignment in curly braces `{}` fixes this.
                  ref={el => { segmentRefs.current[index] = el; }}
                  className={`grid grid-cols-12 gap-4 px-4 py-3 transition-colors duration-300 ${isActive ? 'bg-indigo-900/40' : 'hover:bg-gray-700/50'}`}
                >
                  <div 
                    className="col-span-2 md:col-span-1 font-mono text-sm text-indigo-400 cursor-pointer pt-1"
                    onClick={() => onTimestampClick(segment.start)}
                  >
                    [{formatTime(segment.start)}]
                  </div>
                  <div className="col-span-5 md:col-span-5 text-gray-400 text-sm">
                    <AutoSizingTextarea
                        value={segment.text}
                        onChange={(e) => handleOriginalChange(index, e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-1 focus:ring-indigo-500 rounded-md resize-none p-1 -m-1"
                        aria-label={`Original segment ${index + 1}`}
                    />
                  </div>
                  <div className="col-span-5 md:col-span-6 text-gray-200 text-sm flex items-start gap-2">
                    <AutoSizingTextarea
                        value={revisedSegment ? revisedSegment.text : ''}
                        onChange={(e) => handleRevisedChange(index, e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-1 focus:ring-indigo-500 rounded-md resize-none p-1 -m-1 flex-grow"
                        aria-label={`Revised segment ${index + 1}`}
                        disabled={!revisedSegment}
                    />
                     <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center pt-1">
                      {revisingSegments[index] ? (
                          <SpinnerIcon className="h-5 w-5 text-indigo-400" /> 
                      ) : (
                          <button
                              onClick={() => onReReviseSegment(index)}
                              className="text-gray-400 hover:text-indigo-300 transition-colors p-1 rounded-full hover:bg-gray-600/50"
                              title="Re-apply AI revision to this segment"
                              aria-label={`Re-revise segment ${index + 1}`}
                          >
                              <SparklesIcon />
                          </button>
                      )}
                    </div>
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
import React, { useState, useRef, useCallback } from 'react';
import VideoInput from './components/VideoInput';
import VideoPlayer from './components/VideoPlayer';
import ComparisonTranscriptDisplay from './components/ComparisonTranscriptDisplay';
import { SpinnerIcon, ResetIcon } from './components/icons';
import { reviseScriptWithAI, analyzeScriptAndVision, transcribeAudio } from './services/geminiService';
import type { TranscriptSegment } from './types';

// Component to display the text-based AI analysis
const AnalysisDisplay: React.FC<{ title: string; content: string | null; className?: string; }> = ({ title, content, className = '' }) => {
  return (
    <div className={`flex flex-col bg-gray-800 rounded-lg shadow-lg border border-gray-700 ${className}`}>
      <h3 className="text-xl font-semibold p-4 border-b border-gray-700 text-indigo-300 sticky top-0 bg-gray-800/80 backdrop-blur-sm z-10">{title}</h3>
      <div className="p-4 space-y-3 overflow-y-auto flex-grow">
        {content === null ? (
          <p className="text-gray-400">Analysis will appear here...</p>
        ) : (
           <p className="text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{content}</p>
        )}
      </div>
    </div>
  );
};

// Helper function to convert an AudioBuffer to a WAV file (as a base64 string)
// FIX: Changed return type to Promise and added error handling for FileReader.
const audioBufferToWavBase64 = (buffer: AudioBuffer): Promise<{ wavBase64: string, mimeType: string }> => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArr = new ArrayBuffer(length);
    const view = new DataView(bufferArr);
    const channels: Float32Array[] = [];
    let i: number, sample: number;
    let offset = 0;
    let pos = 0;

    // Helper function to write strings
    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    // RIFF header
    writeString(view, pos, 'RIFF'); pos += 4;
    view.setUint32(pos, length - 8, true); pos += 4;
    writeString(view, pos, 'WAVE'); pos += 4;

    // FMT sub-chunk
    writeString(view, pos, 'fmt '); pos += 4;
    view.setUint32(pos, 16, true); pos += 4; // Sub-chunk size
    view.setUint16(pos, 1, true); pos += 2; // Audio format (1 = PCM)
    view.setUint16(pos, numOfChan, true); pos += 2;
    view.setUint32(pos, buffer.sampleRate, true); pos += 4;
    view.setUint32(pos, buffer.sampleRate * 2 * numOfChan, true); pos += 4; // Byte rate
    view.setUint16(pos, numOfChan * 2, true); pos += 2; // Block align
    view.setUint16(pos, 16, true); pos += 2; // Bits per sample

    // Data sub-chunk
    writeString(view, pos, 'data'); pos += 4;
    view.setUint32(pos, length - pos - 4, true); pos += 4;

    // Write the PCM samples
    for (i = 0; i < buffer.numberOfChannels; i++) {
        channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset])); // Clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // Convert to 16-bit signed int
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }

    // Convert buffer to base64
    const blob = new Blob([view], { type: 'audio/wav' });
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const base64String = reader.result.split(',')[1];
          resolve({ wavBase64: base64String, mimeType: 'audio/wav' });
        } else {
          reject(new Error("Failed to read file as base64 string."));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(blob);
    });
};

export default function App() {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [originalTranscript, setOriginalTranscript] = useState<TranscriptSegment[] | null>(null);
  const [revisedTranscript, setRevisedTranscript] = useState<TranscriptSegment[] | null>(null);
  const [visionAnalysis, setVisionAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);

  const resetState = useCallback(() => {
    if (videoSrc) {
      URL.revokeObjectURL(videoSrc);
    }
    setVideoSrc(null);
    setIsLoading(false);
    setLoadingMessage('');
    setOriginalTranscript(null);
    setRevisedTranscript(null);
    setVisionAnalysis(null);
    setError(null);
  }, [videoSrc]);

  const extractVideoFrames = (videoFile: File, numberOfFrames: number): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const frames: string[] = [];

        video.preload = 'metadata';
        const videoUrl = URL.createObjectURL(videoFile);
        video.src = videoUrl;

        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const duration = video.duration;
            const interval = duration / numberOfFrames;
            let currentTime = 0;
            let framesExtracted = 0;

            const captureFrame = () => {
                if (context) {
                    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                    frames.push(canvas.toDataURL('image/jpeg'));
                }
                framesExtracted++;

                if (framesExtracted >= numberOfFrames) {
                    URL.revokeObjectURL(videoUrl);
                    resolve(frames);
                } else {
                    currentTime += interval;
                    video.currentTime = Math.min(currentTime, duration);
                }
            };
            
            video.onseeked = captureFrame;
            video.currentTime = 0; // Start the seeking process
        };

        video.onerror = () => {
            URL.revokeObjectURL(videoUrl);
            reject(new Error("Failed to load video file for frame extraction."));
        };
    });
  };

  // FIX: Refactored to use async/await and avoid the Promise constructor anti-pattern.
  const extractAndEncodeAudio = async (videoFile: File): Promise<{ audioBase64: string, mimeType: string }> => {
      try {
          const audioContext = new AudioContext();
          const arrayBuffer = await videoFile.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const { wavBase64, mimeType } = await audioBufferToWavBase64(audioBuffer);
          return { audioBase64: wavBase64, mimeType };
      } catch (e) {
          console.error("Audio extraction failed:", e);
          throw new Error("Could not process audio from the video file. It may be corrupt or in an unsupported format.");
      }
  };


  const startProcessing = useCallback(async (file: File) => {
    const objectURL = URL.createObjectURL(file);
    setVideoSrc(objectURL);

    try {
      setLoadingMessage('Extracting audio & keyframes...');
      const [audioData, frames] = await Promise.all([
          extractAndEncodeAudio(file),
          extractVideoFrames(file, 5)
      ]);

      setLoadingMessage('Transcribing audio...');
      const transcript = await transcribeAudio(audioData.audioBase64, audioData.mimeType);
      setOriginalTranscript(transcript);

      setLoadingMessage('Analyzing script, vision, and revising...');
      const [revised, analysis] = await Promise.all([
          reviseScriptWithAI(transcript),
          analyzeScriptAndVision(transcript, frames)
      ]);
      setRevisedTranscript(revised);
      setVisionAnalysis(analysis);

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Processing failed: ${errorMessage}`);
      console.error(e);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, []);

  const handleProcessVideo = useCallback(async (file: File) => {
    resetState();
    setIsLoading(true);
    setError(null);
    await startProcessing(file);
  }, [resetState, startProcessing]);
  
  const handleProcessUrl = useCallback(async (url: string) => {
    resetState();
    setIsLoading(true);
    setError(null);

    try {
      const urlPattern = /^(https?:\/\/[^\s$.?#].[^\s]*)$/i;
      if (!url.trim() || !urlPattern.test(url)) {
        throw new Error("Please enter a valid, complete URL (e.g., https://example.com/video.mp4).");
      }
      
      setLoadingMessage('Fetching video from URL...');
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status} ${response.statusText}.`);
      }
      
      const blob = await response.blob();
      if (!blob.type.startsWith('video/')) {
        throw new Error('The URL does not point to a valid video file. Please check the link.');
      }

      const fileName = url.substring(url.lastIndexOf('/') + 1) || 'video_from_url';
      const file = new File([blob], fileName, { type: blob.type });
      
      await startProcessing(file);

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to process URL. ${errorMessage}`);
      console.error(e);
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [resetState, startProcessing]);


  const handleTimestampClick = (time: number) => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.currentTime = time;
      videoPlayerRef.current.play();
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      {!videoSrc && !isLoading && (
         <div className="flex flex-col items-center justify-center h-full w-full flex-grow">
            <VideoInput onProcessVideo={handleProcessVideo} onProcessUrl={handleProcessUrl} isLoading={isLoading} />
             {error && (
                <div className="w-full max-w-2xl mt-4 bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}
         </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-80 flex flex-col items-center justify-center z-50">
          <SpinnerIcon />
          <p className="mt-4 text-xl font-semibold text-white">{loadingMessage}</p>
        </div>
      )}

      {videoSrc && !isLoading && (
        <div className="w-full max-w-screen-2xl mx-auto flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-white">AI Analysis Studio</h1>
                <button
                    onClick={resetState}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                >
                    <ResetIcon />
                    Start Over
                </button>
            </div>
            
            {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-4" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}
            
            <div className="flex flex-col gap-6 flex-grow">
                <div className="w-full">
                    <VideoPlayer ref={videoPlayerRef} src={videoSrc} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <ComparisonTranscriptDisplay
                        originalTranscript={originalTranscript || []}
                        revisedTranscript={revisedTranscript || []}
                        onTimestampClick={handleTimestampClick}
                        className="lg:col-span-2 h-[60vh]"
                    />
                    <AnalysisDisplay
                        title="Script & Vision Analysis"
                        content={visionAnalysis}
                        className="lg:col-span-1 h-[60vh]"
                    />
                </div>
            </div>
        </div>
      )}
    </main>
  );
}

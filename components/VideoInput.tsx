import React, { useRef, useState } from 'react';
import { UploadIcon, LinkIcon } from './icons';

interface VideoInputProps {
  onProcessVideo: (file: File) => void;
  onProcessUrl: (url: string) => void;
  isLoading: boolean;
}

const VideoInput: React.FC<VideoInputProps> = ({ onProcessVideo, onProcessUrl, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onProcessVideo(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUrlProcess = () => {
    if (url.trim()) {
      onProcessUrl(url);
    }
  };

  const handleUrlKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleUrlProcess();
    }
  };


  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-gray-800 border-2 border-dashed border-gray-600 rounded-2xl p-8 text-center transition-colors hover:border-indigo-500">
        <div className="flex flex-col items-center justify-center space-y-6">
          <h2 className="text-3xl font-bold tracking-tight text-white">Polish Your Script</h2>
          <p className="text-gray-400 max-w-md">
            Upload your video, and our AI will transcribe and refine the script to professional perfection.
          </p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="video/*"
            className="hidden"
            disabled={isLoading}
          />
          <button
            onClick={handleUploadClick}
            disabled={isLoading}
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-500/60 disabled:cursor-not-allowed"
          >
            <UploadIcon />
            {isLoading ? 'Processing...' : 'Upload Video'}
          </button>
          <div className="w-full my-4 flex items-center">
            <div className="flex-grow border-t border-gray-600"></div>
            <span className="flex-shrink mx-4 text-gray-500">Or</span>
            <div className="flex-grow border-t border-gray-600"></div>
          </div>

          <div className="w-full space-y-2">
            <div className="flex w-full items-center gap-2">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LinkIcon />
                </div>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={handleUrlKeyDown}
                  placeholder="Paste a direct video URL"
                  disabled={isLoading}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-3 pl-10 pr-3 text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <button
                onClick={handleUrlProcess}
                disabled={isLoading || !url.trim()}
                className="flex-shrink-0 px-4 py-3 text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-500/60 disabled:cursor-not-allowed"
                aria-label="Process video from URL"
              >
                Process
              </button>
            </div>
             <p className="text-xs text-gray-500 px-1 text-left">
                Note: This requires a direct link to a video file (e.g., .mp4) due to browser security policies.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default VideoInput;
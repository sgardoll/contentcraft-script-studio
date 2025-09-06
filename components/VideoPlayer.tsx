
import React, { forwardRef } from 'react';

interface VideoPlayerProps {
  src: string;
}

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(({ src }, ref) => {
  return (
    <div className="w-full aspect-video bg-black rounded-lg overflow-hidden shadow-2xl border border-gray-700">
      <video ref={ref} src={src} controls className="w-full h-full" />
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;

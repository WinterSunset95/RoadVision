// components/VideoPlayer.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';

// IMPORTANT: Import the HLS plugin
// This import registers the HLS source handler with Video.js

// Define the props for our component
interface VideoPlayerProps {
  options: any; // video.js options
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ options }) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player>(null);

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current && videoRef.current) {
      const videoElement = document.createElement("video-js");
      videoElement.classList.add("vjs-big-play-centered");
      videoRef.current.appendChild(videoElement);

      const player = playerRef.current = videojs(videoElement, options, () => {
        console.log('Player is ready');
      });
    } else {
      // You can update player options here if they change
      const player = playerRef.current;
      if (player) {
        player.autoplay(options.autoplay);
        player.src(options.sources);
      }
    }
  }, [options, videoRef]);

  // Dispose the Video.js player when the component unmounts
  useEffect(() => {
    const player = playerRef.current;

    if (!player) return;
    player.on('ready', () => {
      console.log("player ready")
    })
    player.on('error', () => {
      console.log("player error")
      // On player error, wait 5 seconds and reinitialize the player
      setTimeout(() => {
        // window.location.reload();
      }, 3000);
    })

    return () => {
      if (!player) return
      if (!player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [playerRef]);

  return (
    <div className='w-full h-full' data-vjs-player>
      <div ref={videoRef} className='w-full h-full flex justify-center items-center' />
    </div>
  );
};

export default VideoPlayer;


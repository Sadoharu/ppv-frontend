// src/components/player/VideoPlayer.tsx
import { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import 'videojs-mux'; // Імпортуємо плагін Mux
import Player from 'video.js/dist/types/player';

interface VideoPlayerProps {
  hlsUrl: string;
  muxConfig?: {
    env_key: string;
    metadata: any;
  } | null;
  poster?: string;
}

export const VideoPlayer = ({ hlsUrl, muxConfig, poster }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);

  useEffect(() => {
    // Переконуємось, що елемент існує
    if (!videoRef.current) return;

    // Створюємо елемент video, якщо він ще не створений всередині контейнера
    // Це патерн для React 18, щоб уникнути подвійної ініціалізації
    const videoElement = document.createElement("video-js");
    videoElement.classList.add('vjs-big-play-centered');
    videoRef.current.appendChild(videoElement);

    const playerOptions = {
      autoplay: false,
      controls: true,
      responsive: true,
      fluid: true,
      poster: poster,
      sources: [{
        src: hlsUrl,
        type: 'application/x-mpegURL'
      }],
      html5: {
        hls: {
          // Важливо для Bunny CDN Token Auth
          withCredentials: false 
        }
      }
    };

    // Ініціалізуємо плеєр
    const player = videojs(videoElement, playerOptions, () => {
      console.log('Player is ready');
      
      // Ініціалізація Mux Data
      if (muxConfig && (player as any).mux) {
        console.log('Initializing Mux with key:', muxConfig.env_key);
        (player as any).mux({
          debug: false,
          data: {
            env_key: muxConfig.env_key,
            ...muxConfig.metadata,
            player_init_time: Date.now(),
          }
        });
      }
    });

    // Обробка помилок
    player.on('error', () => {
        const error = player.error();
        console.error('Video Player Error:', error);
        if (error && error.code === 4) {
             // 403 Forbidden або 404 Not Found часто падає під код 4 (MEDIA_ERR_SRC_NOT_SUPPORTED) у HLS
             // Тут можна вивести гарний UI "Ваша сесія закінчилась, оновіть сторінку"
        }
    });

    playerRef.current = player;

    // Cleanup function
    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [hlsUrl, muxConfig, poster]);

  return (
    <div data-vjs-player>
      <div ref={videoRef} className="w-full" />
    </div>
  );
};
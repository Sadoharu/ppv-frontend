// src/types/global.d.ts

export {};

declare global {
  interface Window {
    __PPV_BOOT__?: {
      eventId: number;
      slug: string;
      env: {
        title: string;
        description: string;
        hls: string | null; // Посилання на .m3u8
        cdn?: string;
        mux?: {
          env_key: string;
          metadata: {
            video_id: string;
            video_title: string;
            viewer_user_id?: string;
            player_name?: string;
            [key: string]: any;
          };
        } | null;
      };
    };
  }
}
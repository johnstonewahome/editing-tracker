"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { extractYoutubeVideoId } from "@/lib/utils";

export type YoutubePlayerHandle = {
  getCurrentTime: () => number | null;
  seekTo: (seconds: number) => void;
};

type YoutubePlayerProps = {
  url: string;
  onReadyChange?: (ready: boolean) => void;
};

type YTPlayer = {
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
  getIframe: () => HTMLIFrameElement;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        config: {
          videoId: string;
          width?: string | number;
          height?: string | number;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onError?: () => void;
          };
        },
      ) => YTPlayer;
      PlayerState: {
        UNSTARTED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<void> | null = null;

function loadYoutubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.YT?.Player) {
    return Promise.resolve();
  }

  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve) => {
      const existingScript = document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]',
      );

      window.onYouTubeIframeAPIReady = () => resolve();

      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        document.body.appendChild(script);
      }
    });
  }

  return youtubeApiPromise;
}

function fitIframeToContainer(iframe: HTMLIFrameElement) {
  iframe.removeAttribute("width");
  iframe.removeAttribute("height");
  iframe.style.position = "absolute";
  iframe.style.inset = "0";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "0";
}

export const YoutubePlayer = forwardRef<YoutubePlayerHandle, YoutubePlayerProps>(
  function YoutubePlayer({ url, onReadyChange }, ref) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<YTPlayer | null>(null);
    const elementIdRef = useRef(
      `youtube-player-${Math.random().toString(36).slice(2)}`,
    );
    const [isReady, setIsReady] = useState(false);

    const videoId = extractYoutubeVideoId(url);

    useImperativeHandle(ref, () => ({
      getCurrentTime: () => {
        if (!playerRef.current || !isReady) {
          return null;
        }
        return Math.round(playerRef.current.getCurrentTime());
      },
      seekTo: (seconds: number) => {
        if (!playerRef.current || !isReady) {
          return;
        }
        playerRef.current.seekTo(seconds, true);
      },
    }));

    useEffect(() => {
      onReadyChange?.(isReady);
    }, [isReady, onReadyChange]);

    useEffect(() => {
      if (!isReady || !playerRef.current) {
        return;
      }

      const iframe = playerRef.current.getIframe();
      fitIframeToContainer(iframe);

      const wrapper = wrapperRef.current;
      if (!wrapper || typeof ResizeObserver === "undefined") {
        return;
      }

      const observer = new ResizeObserver(() => {
        fitIframeToContainer(iframe);
      });
      observer.observe(wrapper);

      return () => observer.disconnect();
    }, [isReady]);

    useEffect(() => {
      if (!videoId || !containerRef.current) {
        return;
      }

      let cancelled = false;
      setIsReady(false);

      void loadYoutubeIframeApi().then(() => {
        if (cancelled || !containerRef.current || !window.YT?.Player) {
          return;
        }

        playerRef.current?.destroy();
        containerRef.current.innerHTML = "";

        const mount = document.createElement("div");
        mount.id = elementIdRef.current;
        mount.style.width = "100%";
        mount.style.height = "100%";
        containerRef.current.appendChild(mount);

        playerRef.current = new window.YT.Player(elementIdRef.current, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            enablejsapi: 1,
            origin: window.location.origin,
            rel: 0,
          },
          events: {
            onReady: (event) => {
              if (cancelled) {
                return;
              }
              fitIframeToContainer(event.target.getIframe());
              setIsReady(true);
            },
            onError: () => {
              if (!cancelled) {
                setIsReady(false);
              }
            },
          },
        });
      });

      return () => {
        cancelled = true;
        setIsReady(false);
        playerRef.current?.destroy();
        playerRef.current = null;
      };
    }, [videoId]);

    if (!videoId) {
      return null;
    }

    return (
      <div
        ref={wrapperRef}
        className="relative w-full overflow-hidden rounded-lg border bg-black pt-[56.25%]"
      >
        <div
          ref={containerRef}
          className="absolute inset-0"
        />
      </div>
    );
  },
);

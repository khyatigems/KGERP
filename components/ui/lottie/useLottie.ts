"use client";

import { useRef, useCallback, useState } from "react";
import type { AnimationItem } from "lottie-web";

export interface UseLottieReturn {
  play: (segments?: [number, number]) => void;
  pause: () => void;
  stop: () => void;
  setSpeed: (speed: number) => void;
  goToAndStop: (frame: number, isFrame?: boolean) => void;
  goToAndPlay: (frame: number, isFrame?: boolean) => void;
  playSegments: (segments: [number, number], forceFlag: boolean) => void;
  setDirection: (direction: 1 | -1) => void;
  getDuration: (isFrame?: boolean) => number;
  getCurrentFrame: () => number;
  player: AnimationItem | null;
  isLoaded: boolean;
  onLoad: (player: AnimationItem) => void;
}

export function useLottie(): UseLottieReturn {
  const playerRef = useRef<AnimationItem | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoad = useCallback((player: AnimationItem) => {
    playerRef.current = player;
    setIsLoaded(true);
  }, []);

  const play = useCallback((segments?: [number, number]) => {
    if (playerRef.current) {
      if (segments) {
        playerRef.current.playSegments(segments, true);
      } else {
        playerRef.current.play();
      }
    }
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pause();
  }, []);

  const stop = useCallback(() => {
    playerRef.current?.stop();
  }, []);

  const setSpeed = useCallback((speed: number) => {
    playerRef.current?.setSpeed(speed);
  }, []);

  const goToAndStop = useCallback((frame: number, isFrame = true) => {
    playerRef.current?.goToAndStop(frame, isFrame);
  }, []);

  const goToAndPlay = useCallback((frame: number, isFrame = true) => {
    playerRef.current?.goToAndPlay(frame, isFrame);
  }, []);

  const playSegments = useCallback((segments: [number, number], forceFlag = true) => {
    playerRef.current?.playSegments(segments, forceFlag);
  }, []);

  const setDirection = useCallback((direction: 1 | -1) => {
    playerRef.current?.setDirection(direction);
  }, []);

  const getDuration = useCallback((isFrame = true) => {
    return playerRef.current?.getDuration(isFrame) ?? 0;
  }, []);

  const getCurrentFrame = useCallback(() => {
    return playerRef.current?.currentFrame ?? 0;
  }, []);

  return {
    play,
    pause,
    stop,
    setSpeed,
    goToAndStop,
    goToAndPlay,
    playSegments,
    setDirection,
    getDuration,
    getCurrentFrame,
    player: playerRef.current,
    isLoaded,
    onLoad: handleLoad,
  };
}

export function useLottiePlayer() {
  const { player, isLoaded, ...controls } = useLottie();
  return { player, isLoaded, ...controls };
}
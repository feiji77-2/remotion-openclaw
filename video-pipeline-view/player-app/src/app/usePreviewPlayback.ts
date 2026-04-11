import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

interface UsePreviewPlaybackOptions {
  fps: number;
  totalFrames: number;
  resetKey: number;
}

export function usePreviewPlayback({fps, totalFrames, resetKey}: UsePreviewPlaybackOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [hoverFrame, setHoverFrame] = useState<number | null>(null);
  const timelineTrackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentFrame(0);
    setHoverFrame(null);
  }, [resetKey]);

  useEffect(() => {
    setCurrentFrame((prev) => Math.min(Math.max(totalFrames - 1, 0), prev));
  }, [totalFrames]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setCurrentFrame((prev) => {
        const next = prev + 1;
        if (next >= totalFrames) {
          setIsPlaying(false);
          return Math.max(totalFrames - 1, 0);
        }
        return next;
      });
    }, 1000 / fps);

    return () => window.clearInterval(timer);
  }, [fps, isPlaying, totalFrames]);

  const formatTimecode = useCallback((frame: number) => {
    const totalSeconds = frame / fps;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const f = frame % fps;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
  }, [fps]);

  const movePlayheadToRatio = useCallback((ratio: number) => {
    const safe = Math.min(1, Math.max(0, ratio));
    const rawFrame = Math.round((totalFrames - 1) * safe);
    const snapped = Math.round(rawFrame / 30) * 30;
    setCurrentFrame(Math.min(totalFrames - 1, Math.max(0, snapped)));
  }, [totalFrames]);

  const getFrameFromClientX = useCallback((clientX: number) => {
    if (!timelineTrackRef.current) return 0;
    const rect = timelineTrackRef.current.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    const safe = Math.min(1, Math.max(0, ratio));
    const raw = Math.round((totalFrames - 1) * safe);
    const snapped = Math.round(raw / 30) * 30;
    return Math.min(totalFrames - 1, Math.max(0, snapped));
  }, [totalFrames]);

  const onTimelinePointer = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineTrackRef.current) return;
    const rect = timelineTrackRef.current.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    movePlayheadToRatio(ratio);
  }, [movePlayheadToRatio]);

  const onTimelineHoverMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    setHoverFrame(getFrameFromClientX(event.clientX));
  }, [getFrameFromClientX]);

  const timelineMarks = useMemo(() => {
    const marks: {frame: number; left: number}[] = [];
    for (let frame = 0; frame <= totalFrames; frame += 30) {
      marks.push({frame, left: (frame / totalFrames) * 100});
    }
    return marks;
  }, [totalFrames]);

  return {
    currentFrame,
    formatTimecode,
    hoverFrame,
    isPlaying,
    onTimelineHoverMove,
    onTimelinePointer,
    setCurrentFrame,
    setHoverFrame,
    setIsPlaying,
    timelineMarks,
    timelineTrackRef,
  };
}

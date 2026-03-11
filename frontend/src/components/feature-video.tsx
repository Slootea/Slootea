"use client"

import {
  VideoPlayer,
  VideoPlayerContent,
  VideoPlayerControlBar,
  VideoPlayerMuteButton,
  VideoPlayerPlayButton,
  VideoPlayerTimeDisplay,
  VideoPlayerTimeRange,
  VideoPlayerVolumeRange,
} from "@/components/ui/video-player"

interface FeatureVideoProps {
  src: string
  className?: string
}

export function FeatureVideo({ src, className }: FeatureVideoProps) {
  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl blur-xl opacity-60" />
      <div className="relative bg-gradient-to-b from-muted/50 to-muted rounded-2xl border border-border/50 overflow-hidden">
        <VideoPlayer className={className ?? "w-full rounded-2xl overflow-hidden"}>
          <VideoPlayerContent
            src={src}
            slot="media"
            playsInline
            preload="metadata"
            className="w-full aspect-[4/3] object-cover"
          />
          <VideoPlayerControlBar>
            <VideoPlayerPlayButton />
            <VideoPlayerMuteButton />
            <VideoPlayerTimeRange />
            <VideoPlayerTimeDisplay showDuration />
            <VideoPlayerVolumeRange />
          </VideoPlayerControlBar>
        </VideoPlayer>
      </div>
    </div>
  )
}

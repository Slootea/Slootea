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
            poster="/Logo_whitebg.png"
            className="w-full aspect-[4/3] object-cover"
            style={{
              // @ts-expect-error media-chrome poster styling
              "--media-object-fit": "contain",
              "--media-object-position": "center",
            }}
          />
          {/* Big centered play button */}
          <VideoPlayerPlayButton 
            slot="centered-chrome"
            className="p-4 rounded-md bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-colors"
            style={{
              "--media-button-icon-width": "48px",
              "--media-button-icon-height": "48px",
            }}
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

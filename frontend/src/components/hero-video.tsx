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

export function HeroVideo() {
  return (
    <VideoPlayer className="w-full rounded-2xl overflow-hidden">
      <VideoPlayerContent
        src="/Slootea_demo_music.mp4"
        slot="media"
        playsInline
        preload="metadata"
        className="w-full aspect-video object-cover"
      />
      <VideoPlayerControlBar>
        <VideoPlayerPlayButton />
        <VideoPlayerMuteButton />
        <VideoPlayerTimeRange />
        <VideoPlayerTimeDisplay showDuration />
        <VideoPlayerVolumeRange />
      </VideoPlayerControlBar>
    </VideoPlayer>
  )
}

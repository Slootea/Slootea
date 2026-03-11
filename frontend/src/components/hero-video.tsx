"use client"

import {
  VideoPlayer,
  VideoPlayerContent,
  VideoPlayerControlBar,
  VideoPlayerFullscreenButton,
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
        poster="/Thumbnail_Hero_Video.png"
        className="w-full aspect-video object-cover [&::--poster]:[object-fit:cover] [&::--poster]:[object-position:center]"
        style={{
          // @ts-expect-error media-chrome poster styling
          "--media-poster-image-object-fit": "cover",
          "--media-poster-image-object-position": "center",
        }}
      />
      <VideoPlayerControlBar>
        <VideoPlayerPlayButton />
        <VideoPlayerMuteButton />
        <VideoPlayerTimeRange />
        <VideoPlayerTimeDisplay showDuration />
        <VideoPlayerVolumeRange />
        <VideoPlayerFullscreenButton />
      </VideoPlayerControlBar>
    </VideoPlayer>
  )
}

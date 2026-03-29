"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { Play } from "lucide-react"
import {
  VideoPlayer,
  VideoPlayerContent,
  VideoPlayerPlayButton,
} from "@/components/ui/video-player"

interface ClientStoryVideoProps {
  src: string
  className?: string
  logoSrc?: string
}

export function ClientStoryVideo({ src, className, logoSrc = "/TurkanDurmazGuzellikLogo.png" }: ClientStoryVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const mediaController = container.querySelector('media-controller')
    if (!mediaController) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)

    mediaController.addEventListener('play', handlePlay)
    mediaController.addEventListener('pause', handlePause)
    mediaController.addEventListener('ended', handleEnded)

    return () => {
      mediaController.removeEventListener('play', handlePlay)
      mediaController.removeEventListener('pause', handlePause)
      mediaController.removeEventListener('ended', handleEnded)
    }
  }, [])

  return (
    <div className="relative">
      <div className="absolute -inset-2 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl blur-xl opacity-60" />
      <div ref={containerRef} className="relative bg-gradient-to-b from-muted/50 to-muted rounded-2xl border border-border/50 overflow-hidden">
        <VideoPlayer className={className ?? "w-full rounded-2xl overflow-hidden"}>
          <VideoPlayerContent
            src={src}
            slot="media"
            playsInline
            preload="metadata"
            className="w-full aspect-[9/16] object-cover"
            style={{
              // @ts-expect-error media-chrome poster styling
              "--media-object-fit": "cover",
              "--media-object-position": "center",
            }}
          />
          {/* Logo watermark overlay - visible when not playing */}
          {!isPlaying && (
            <div 
              slot="centered-chrome"
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10"
            >
              <div className="absolute inset-0 bg-black/40" />
              <Image
                src={logoSrc}
                alt="Client Logo"
                width={180}
                height={90}
                className="relative z-10 opacity-95 drop-shadow-lg mb-6"
              />
              <div className="relative z-10 w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play className="w-8 h-8 text-primary fill-primary ml-1" />
              </div>
            </div>
          )}
          {/* Invisible centered play button for click handling */}
          <VideoPlayerPlayButton
            slot="centered-chrome"
            className="absolute inset-0 w-full h-full bg-transparent opacity-0 cursor-pointer z-20"
          />
        </VideoPlayer>
      </div>
    </div>
  )
}

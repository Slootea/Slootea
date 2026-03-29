"use client"

import * as React from "react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel"
import { ClientStoryVideo } from "@/components/client-story-video"
import { cn } from "@/lib/utils"

interface ClientStoriesCarouselProps {
  videos: {
    src: string
    logoSrc?: string
  }[]
}

export function ClientStoriesCarousel({ videos }: ClientStoriesCarouselProps) {
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)
  const [count, setCount] = React.useState(0)

  React.useEffect(() => {
    if (!api) return

    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap())

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap())
    })
  }, [api])

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Carousel
        setApi={setApi}
        opts={{
          align: "center",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {videos.map((video, index) => (
            <CarouselItem 
              key={index} 
              className="pl-2 md:pl-4 basis-[85%] sm:basis-full md:basis-1/2"
            >
              <div className="max-w-[280px] mx-auto">
                <ClientStoryVideo src={video.src} logoSrc={video.logoSrc} />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex -left-4 md:-left-12" />
        <CarouselNext className="hidden sm:flex -right-4 md:-right-12" />
      </Carousel>
      
      {/* Navigation dots for mobile */}
      <div className="flex justify-center gap-2 mt-4 sm:hidden">
        {Array.from({ length: count }).map((_, index) => (
          <button
            key={index}
            onClick={() => api?.scrollTo(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              index === current 
                ? "bg-primary w-4" 
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

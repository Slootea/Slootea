"use client"

import { Calendar } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"

export function CalendarShowcase() {
  const t = useTranslations('landing.showcase.calendar')
  
  // Mock appointments for the week view
  const appointments = [
    { day: 0, start: 9, duration: 1, name: "Sarah M.", service: "Hair", status: "confirmed" },
    { day: 0, start: 11, duration: 1.5, name: "John D.", service: "Massage", status: "confirmed" },
    { day: 1, start: 10, duration: 1, name: "Emma W.", service: "Facial", status: "pending" },
    { day: 1, start: 14, duration: 0.75, name: "Mike T.", service: "Nails", status: "confirmed" },
    { day: 2, start: 9, duration: 2, name: "Lisa K.", service: "Massage", status: "confirmed" },
    { day: 2, start: 13, duration: 1, name: "Anna P.", service: "Hair", status: "completed" },
    { day: 3, start: 10, duration: 1.5, name: "Tom R.", service: "Facial", status: "confirmed" },
    { day: 4, start: 11, duration: 1, name: "Kate M.", service: "Makeup", status: "pending" },
  ]

  const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri'] as const
  const hours = [9, 10, 11, 12, 13, 14, 15]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/90 border-l-green-600'
      case 'pending': return 'bg-yellow-500/90 border-l-yellow-600'
      case 'completed': return 'bg-blue-500/90 border-l-blue-600'
      default: return 'bg-primary/90 border-l-primary'
    }
  }

  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl blur-xl opacity-60" />
      <div className="relative bg-surface-container-low rounded-2xl shadow-ambient overflow-hidden aspect-[4/3] border">
        {/* Browser chrome */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-background/80 border-b">
          {/* Traffic lights */}
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          
          {/* URL bar */}
          <div className="flex-1 max-w-[180px] mx-auto">
            <div className="flex items-center gap-1 bg-muted/50 rounded px-2 py-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-muted-foreground">slootea.com/dashboard</span>
            </div>
          </div>
        </div>

        {/* Calendar Content */}
        <div className="flex flex-col h-[calc(100%-37px)] bg-background p-2 sm:p-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b mb-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="p-1 bg-primary/10 rounded-full">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-xs sm:text-sm">{t('month')}</h3>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">{t('week')} 16</p>
              </div>
            </div>
            <div className="flex gap-0.5">
              <Button variant="outline" size="sm" className="h-5 sm:h-6 px-1.5 sm:px-2 text-[9px] sm:text-[10px]">{t('week')}</Button>
              <Button variant="ghost" size="sm" className="h-5 sm:h-6 px-1.5 sm:px-2 text-[9px] sm:text-[10px]">{t('day')}</Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Day headers */}
            <div className="flex shrink-0">
              <div className="w-7 sm:w-9 shrink-0" /> {/* Time column spacer */}
              {dayKeys.map((dayKey, i) => (
                <div 
                  key={dayKey} 
                  className="flex-1 text-center py-0.5 text-[9px] sm:text-[10px] font-medium animate-fade-up"
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
                >
                  <span className="text-muted-foreground">{t(`days.${dayKey}`)}</span>
                  <span className={`block text-[10px] sm:text-xs font-bold ${i === 2 ? 'text-primary' : ''}`}>
                    {14 + i}
                  </span>
                </div>
              ))}
            </div>

            {/* Time grid */}
            <div className="flex-1 flex overflow-hidden">
              {/* Time labels */}
              <div className="w-7 sm:w-9 shrink-0 flex flex-col">
                {hours.map((hour) => (
                  <div key={hour} className="flex-1 text-[8px] sm:text-[9px] text-muted-foreground text-right pr-1 -mt-1">
                    {hour > 12 ? `${hour - 12}p` : `${hour}a`}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              <div className="flex-1 flex relative">
                {dayKeys.map((_, dayIndex) => (
                  <div 
                    key={dayIndex} 
                    className="flex-1 border-l first:border-l-0 border-muted/50 relative"
                  >
                    {/* Hour grid lines */}
                    {hours.map((_, i) => (
                      <div 
                        key={i} 
                        className="border-t border-muted/30"
                        style={{ height: `${100 / hours.length}%` }}
                      />
                    ))}
                  </div>
                ))}

                {/* Appointments overlay */}
                {appointments.map((apt, i) => {
                  const hourHeight = 100 / hours.length
                  const top = (apt.start - hours[0]) * hourHeight
                  const height = apt.duration * hourHeight
                  const left = (apt.day / dayKeys.length) * 100

                  return (
                    <div
                      key={i}
                      className={`absolute rounded-sm border-l-2 p-0.5 text-white text-[8px] sm:text-[9px] overflow-hidden shadow-sm animate-scale-up ${getStatusColor(apt.status)}`}
                      style={{
                        top: `${top}%`,
                        height: `${height}%`,
                        left: `calc(${left}% + 1px)`,
                        width: `calc(${100 / dayKeys.length}% - 3px)`,
                        animationDelay: `${200 + i * 50}ms`,
                        animationFillMode: 'both'
                      }}
                    >
                      <div className="font-medium truncate">{apt.name}</div>
                      <div className="opacity-90 truncate hidden sm:block">{apt.service}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Footer stats */}
          <div className="pt-2 border-t mt-2 grid grid-cols-3 gap-1 text-center shrink-0">
            <div className="animate-fade-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
              <p className="text-xs sm:text-sm font-bold">8</p>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground">{t('today')}</p>
            </div>
            <div className="animate-fade-up" style={{ animationDelay: '450ms', animationFillMode: 'both' }}>
              <p className="text-xs sm:text-sm font-bold">32</p>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground">{t('thisWeek')}</p>
            </div>
            <div className="animate-fade-up" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
              <p className="text-xs sm:text-sm font-bold text-green-600">94%</p>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground">{t('confirmed')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

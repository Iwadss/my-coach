import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  value: string
  onChange: (time: string) => void
  placeholder?: string
  label?: string
}

export const TimePicker = ({ value, onChange, placeholder = "Select time", label }: TimePickerProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedHour, setSelectedHour] = useState<string>(value.split(":")[0] || "01")
  const [selectedMinute, setSelectedMinute] = useState<string>(value.split(":")[1] || "00")
  const dropdownRef = useRef<HTMLDivElement>(null)

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"))
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"))

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (value) {
      const [hour, minute] = value.split(":")
      setSelectedHour(hour || "01")
      setSelectedMinute(minute || "00")
    }
  }, [value])

  const handleHourSelect = (hour: string) => {
    setSelectedHour(hour)
    onChange(`${hour}:${selectedMinute}`)
  }

  const handleMinuteSelect = (minute: string) => {
    setSelectedMinute(minute)
    onChange(`${selectedHour}:${minute}`)
    setIsOpen(false)
  }

  const handleReset = () => {
    setSelectedHour("01")
    setSelectedMinute("00")
    onChange("")
    setIsOpen(false)
  }

  const displayTime = value ? `${selectedHour}:${selectedMinute}` : placeholder

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && (
        <label className="block text-base font-semibold text-foreground mb-2">
          {label}
        </label>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full h-12 justify-center text-center font-normal bg-background hover:bg-accent/50 border-2 border-indigo-500 rounded-xl shadow-inner",
          !value && "text-muted-foreground",
          isOpen && "ring-2 ring-indigo-400/50"
        )}
      >
        <span className="font-mono text-xs sm:text-sm">{displayTime}</span>
      </Button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl border border-border bg-white shadow-xl dark:bg-gray-900 dark:border-gray-700">
          <div className="grid grid-cols-2 divide-x divide-border dark:divide-gray-700 rounded-t-2xl overflow-hidden">
            {/* Hours */}
            <div className="flex flex-col">
              <div className="bg-indigo-50 dark:bg-indigo-900/30 py-2 text-center font-semibold text-indigo-700 dark:text-indigo-300 text-base border-b border-border dark:border-gray-700">
                Hours
              </div>
              <div className="max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-400/30">
                {hours.map((hour) => (
                  <button
                    key={hour}
                    onClick={() => handleHourSelect(hour)}
                    className={cn(
                      "w-full px-4 py-2 text-base text-center font-mono transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-800",
                      selectedHour === hour && "bg-indigo-500 text-white font-semibold"
                    )}
                  >
                    {hour}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes */}
            <div className="flex flex-col">
              <div className="bg-violet-50 dark:bg-violet-900/30 py-2 text-center font-semibold text-violet-700 dark:text-violet-300 text-base border-b border-border dark:border-gray-700">
                Minutes
              </div>
              <div className="max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-violet-400/30">
                {minutes.map((minute) => (
                  <button
                    key={minute}
                    onClick={() => handleMinuteSelect(minute)}
                    className={cn(
                      "w-full px-4 py-2 text-base text-center font-mono transition-colors hover:bg-violet-100 dark:hover:bg-violet-800",
                      selectedMinute === minute && "bg-violet-500 text-white font-semibold"
                    )}
                  >
                    {minute}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <div className="border-t border-border dark:border-gray-700 px-3 py-2 text-right bg-white dark:bg-gray-900 rounded-b-2xl">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Reset
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
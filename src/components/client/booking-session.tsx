import { useState, useEffect } from 'react'
import { format, isAfter } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Clock, AlertCircle, CalendarRange } from 'lucide-react'
import supabase from '@/supabase/supabase'

import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue
} from "@/components/ui/select"
import { toast } from 'sonner'

interface BookingFormProps {
    onBookingSuccess?: () => void
}

interface TimeSlot {
    id: number
    start_time: string
    end_time: string
    is_available: boolean
}

interface AvailableDay {
    day: string
    is_available: boolean
}

export default function BookingForm({ onBookingSuccess }: BookingFormProps) {
    const [date, setDate] = useState<Date | undefined>()
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
    const [availableDays, setAvailableDays] = useState<AvailableDay[]>([])
    const [bookedSlots, setBookedSlots] = useState<TimeSlot[]>([])
    const [timeSlotId, setTimeSlotId] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        const fetchTimeSlots = async () => {
            const { data, error } = await supabase
                .from('timeslots')
                .select('*')
                .eq('is_available', true)
                .order('start_time', { ascending: true })

            if (!error && data) setTimeSlots(data)
        }

        const fetchAvailableDays = async () => {
            const { data, error } = await supabase
                .from('available_days')
                .select('day, is_available')

            if (!error && data) setAvailableDays(data)
        }

        fetchTimeSlots()
        fetchAvailableDays()
    }, [])

    useEffect(() => {
        const fetchBookedSlots = async () => {
            if (!date) return

            const { data, error } = await supabase
                .from('bookings')
                .select('time_slot_id, timeslots(start_time, end_time)')
                .eq('date', format(date, 'yyyy-MM-dd'))

            if (!error && data) {
                const slots = data.map((b: any) => ({
                    id: b.time_slot_id,
                    start_time: b.timeslots.start_time,
                    end_time: b.timeslots.end_time,
                    is_available: false
                }))
                setBookedSlots(slots)
            }
        }

        fetchBookedSlots()
    }, [date])

    const isOverlapping = (slot: TimeSlot, others: TimeSlot[]) => {
        const toMinutes = (t: string) => {
            const [h, m] = t.split(':').map(Number)
            return h * 60 + m
        }

        const start = toMinutes(slot.start_time)
        const end = toMinutes(slot.end_time)

        return others.some(other => {
            const otherStart = toMinutes(other.start_time)
            const otherEnd = toMinutes(other.end_time)
            return start < otherEnd && end > otherStart
        })
    }

    const isDateAllowed = (inputDate: Date): boolean => {
        const today = new Date()
        const dayName = inputDate.toLocaleDateString('en-US', { weekday: 'long' })
        const dayDisabled = availableDays.find(d => d.day === dayName && !d.is_available)


        // If the day is generally allowed, let it through
        if (!dayDisabled) return true

        // Find the first upcoming date that matches the disabled day
        const dayIndex = inputDate.getDay()
        const diff = (dayIndex - today.getDay() + 7) % 7
        const nextDisabled = new Date(today)
        nextDisabled.setDate(today.getDate() + diff)

        // Only disable the first upcoming disabled date
        return inputDate.toDateString() !== nextDisabled.toDateString()
    }

    const handleBooking = async () => {
        if (!date || !timeSlotId) {
            alert('Please select date and time slot')
            return
        }

        if (!isDateAllowed(date)) {
            alert('This date is currently not available for booking.')
            return
        }

        const session = await supabase.auth.getSession()
        const user = session.data.session?.user

        if (!user) {
            alert('Not logged in')
            return
        }

        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('id')
            .eq('email', user.email)
            .single()

        if (clientError || !client) {
            alert('Client not found')
            return
        }

        const { error } = await supabase.from('bookings').insert({
            date: format(date, 'yyyy-MM-dd'),
            time_slot_id: parseInt(timeSlotId),
            client_id: client.id
        })

        if (error) {
            if (error.code === '23505') {
                alert('Time slot already booked')
            } else {
                alert('Booking failed: ' + error.message)
            }
        } else {
            toast.success('✅ Booking successful!', {
                description: 'Redirecting to your dashboard...',
                className: 'toast-success'
            })

            setDate(undefined)
            setTimeSlotId('')
            onBookingSuccess?.()
            navigate('/client-dashboard')
        }
    }

    return (
        <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white via-green-50/30 to-emerald-50/30 dark:from-gray-900 dark:via-green-950/30 dark:to-emerald-950/30">
            <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25" />
            <div className="relative">
                <CardHeader className="space-y-4 pb-6">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-teal-600 rounded-xl blur-lg opacity-30" />
                            <div className="relative p-2 sm:p-3 bg-gradient-to-r from-green-600 to-teal-600 rounded-xl">
                                <CalendarRange className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </div>
                        </div>
                        <div>
                            <CardTitle className="text-xl sm:text-2xl font-bold">
                                Book a Session
                            </CardTitle>
                            <CardDescription className="text-sm sm:text-base">
                                Choose your session schedule
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Select Date and Choose Time Slot Side by Side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Select Date Section */}
                        <div className="space-y-3">
                            <Label className="text-base font-semibold text-foreground flex items-center gap-2">
                                Select date
                            </Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-full !h-12 justify-start text-left font-normal text-sm rounded-xl border-2 border-border/50 bg-background/50 backdrop-blur-sm hover:!border-green-500 transition-all duration-200"
                                    >
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="h-4 w-4 text-green-600" />
                                            {date ? format(date, "dd MMMM yyyy") : "Pick a date"}
                                        </div>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        disabled={(d) => !isAfter(d, new Date()) || !isDateAllowed(d)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Choose Time Slot Section */}
                        <div className="space-y-3">
                            <Label className="text-base font-semibold text-foreground flex items-center gap-2">
                                Session time
                            </Label>
                            <Select
                                value={timeSlotId}
                                onValueChange={(value) => setTimeSlotId(value)}
                                disabled={!date || !isDateAllowed(date)}
                            >
                                <SelectTrigger className="w-full !h-12 justify-start text-left font-normal text-sm rounded-xl border-2 border-border/50 bg-background/50 backdrop-blur-sm hover:border-green-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <div className="flex items-center gap-2 w-full">
                                        <Clock className="h-4 w-4 text-green-600" />
                                        <SelectValue placeholder="Session time" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="bg-background/95 backdrop-blur-sm border-2 border-border/50 rounded-xl shadow-lg">
                                    {timeSlots.map(slot => {
                                        const isDisabled = isOverlapping(slot, bookedSlots)

                                        return (
                                            <SelectItem
                                                key={slot.id}
                                                value={slot.id.toString()}
                                                disabled={isDisabled}
                                                className="focus:bg-green-50 dark:focus:bg-green-950/30 hover:bg-green-50 dark:hover:bg-green-950/30"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span>{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</span>
                                                </div>
                                            </SelectItem>
                                        )
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {date && !isDateAllowed(date) && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400">
                            <AlertCircle className="w-4 h-4" />
                            <p className="text-sm font-medium">Bookings not allowed on this day.</p>
                        </div>
                    )}

                    {/* Confirm Booking Section */}
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                onClick={() => {
                                    setDate(undefined)
                                    setTimeSlotId('')
                                }}
                                variant="outline"
                                className="h-12 rounded-xl border-2 border-border/50 bg-background/50 backdrop-blur-sm hover:border-gray-400 focus:border-gray-400 focus:ring-4 focus:ring-gray-400/20 transition-all duration-200"
                            >
                                Clear
                            </Button>
                            <Button
                                onClick={handleBooking}
                                disabled={!date || !isDateAllowed(date) || !timeSlotId}
                                className="h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <CalendarDays className="w-4 h-4 mr-2" />
                                Confirm booking
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </div>
        </Card>
    )
}
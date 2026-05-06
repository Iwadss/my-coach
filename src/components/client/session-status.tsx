import * as React from 'react'
import { format } from 'date-fns'
import supabase from '@/supabase/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Info, Calendar, Clock, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface TimeSlot {
    id: number
    start_time: string
    end_time: string
}

interface Booking {
    id: number
    date: string
    timeslot: TimeSlot | null
    status: string
}

export default function SessionStatus() {
    const [bookings, setBookings] = React.useState<Booking[]>([])
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)


    const fetchBookings = React.useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user?.email) {
                setError('Not authenticated')
                return
            }

            const { data: clientData, error: clientError } = await supabase
                .from('clients')
                .select('id')
                .eq('email', session.user.email)
                .maybeSingle()

            if (clientError || !clientData) {
                setError('Client not found')
                return
            }

            // Fetch bookings
            const { data, error: bookingsError } = await supabase
                .from('bookings')
                .select(`
                    id,
                    date,
                    status,
                    timeslot:timeslots!bookings_time_slot_id_fkey (id, start_time, end_time)
                `)
                .eq('client_id', clientData.id)
                .order('date', { ascending: false })

            if (bookingsError) throw bookingsError


            const transformedBookings: Booking[] = (data ?? []).map((booking: any) => ({
                id: booking.id,
                date: booking.date,
                status: booking.status,
                timeslot: booking.timeslot || null
            }))

            setBookings(transformedBookings)
        } catch (err) {
            console.error('Error fetching bookings:', err)
            setError('Failed to load bookings')
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchBookings()
    }, [fetchBookings])

    const formatDate = (date: string) => {
        try {
            return format(new Date(date), 'EEEE d MMMM yyyy') // e.g. Sunday 1 January 2023
        } catch {
            return 'Invalid date'
        }
    }



    const formatTimeSlot = (timeslot: TimeSlot | null) => {
        if (!timeslot) return 'No time slot'
        return `${timeslot.start_time.slice(0, 5)} - ${timeslot.end_time.slice(0, 5)}`
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            case 'completed': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
        }
    }

    const getStatusTextColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'text-emerald-700 dark:text-emerald-400'
            case 'pending': return 'text-yellow-700 dark:text-yellow-400'
            case 'cancelled': return 'text-red-700 dark:text-red-400'
            case 'completed': return 'text-blue-700 dark:text-blue-400'
            default: return 'text-gray-700 dark:text-gray-400'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'confirmed': return <CheckCircle className={`w-4 h-4 ${getStatusTextColor(status)}`} />
            case 'pending': return <Clock className={`w-4 h-4 ${getStatusTextColor(status)}`} />
            case 'cancelled': return <XCircle className={`w-4 h-4 ${getStatusTextColor(status)}`} />
            case 'completed': return <CheckCircle className={`w-4 h-4 ${getStatusTextColor(status)}`} />
            default: return <AlertCircle className={`w-4 h-4 ${getStatusTextColor(status)}`} />
        }
    }

    return (
        <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white via-red-50/30 to-red-50/30 dark:from-gray-900 dark:via-red-950/30 dark:to-red-950/30">
            <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25" />
            <div className="relative">
                <CardHeader className="space-y-4 pb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative flex-shrink-0">
                                <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-700 rounded-xl blur-lg opacity-30" />
                                <div className="relative p-2 sm:p-3 bg-gradient-to-r from-red-600 to-red-700 rounded-xl">
                                    <Info className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                </div>
                            </div>
                            <div>
                                <CardTitle className="text-xl sm:text-2xl font-bold">
                                    Session Status
                                </CardTitle>
                                <CardDescription className="text-sm sm:text-base">
                                    Track your past and upcoming sessions
                                </CardDescription>

                            </div>
                        </div>

                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-10">
                            <div className="relative">
                                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-md" />
                                <Loader2 className="w-10 h-10 text-green-600 animate-spin relative" />
                            </div>
                            <p className="text-muted-foreground mt-4">Loading Session Status...</p>
                        </div>
                    )}

                    {error && (
                        <div className="flex flex-col items-center justify-center py-10">
                            <div className="relative">
                                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-md" />
                                <AlertCircle className="w-10 h-10 text-red-500 relative" />
                            </div>
                            <p className="text-muted-foreground mt-4">Error loading Session Status. Please try again later.</p>
                        </div>
                    )}

                    {!loading && !error && bookings.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gray-500/20 rounded-full blur-md" />
                                <Calendar className="w-10 h-10 text-muted-foreground relative" />
                            </div>
                            <p className="text-muted-foreground mt-4">No sessions found. Book a session to get started!</p>
                        </div>
                    )}

                    {!loading && !error && bookings.length > 0 && (
                        <div className="space-y-4">
                            {bookings.map(booking => (
                                <div key={booking.id} className="group relative overflow-hidden">
                                    <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-xl" />
                                    <div className="absolute inset-0 bg-gray-100/50 dark:bg-gray-700/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                    <div className="relative p-4 sm:p-6">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
                                                        <Calendar className={`w-4 h-4 ${getStatusTextColor(booking.status)}`} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-foreground text-lg">{formatDate(booking.date)}</h4>
                                                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {formatTimeSlot(booking.timeslot)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(booking.status)}
                                                    <Badge className={`${getStatusColor(booking.status)} border-0 px-3 py-1 font-medium`}>
                                                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                                    </Badge>
                                                </div>
                                                {booking.status === 'pending' && (
                                                    <p className="text-xs text-yellow-600 dark:text-yellow-400 italic">
                                                        Waiting for approval from coach
                                                    </p>
                                                )}
                                                {booking.status === 'confirmed' && (
                                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 italic">
                                                        Your session is confirmed
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </div>
        </Card>
    )
}
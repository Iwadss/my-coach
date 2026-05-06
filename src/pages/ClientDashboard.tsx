//src/pages/ClientDashboard.tsx
import { useEffect, useState } from 'react'
import * as React from 'react'
import ClientHeader from '@/components/client/client-header'
import BookingForm from '@/components/client/booking-session'
import BookingHistory from '@/components/client/session-status'
import supabase from '@/supabase/supabase'
import { Badge } from '@/components/ui/badge'
import { UserCheck2, CheckCircle, Clock } from 'lucide-react'

interface BookingTotals {
    completed_slots: number
    last_completed_at: string | null
}

export default function ClientDashboard() {
    const [userName, setUserName] = useState<string>('')
    const [bookingsKey, setBookingsKey] = useState<number>(0)
    const [bookingTotals, setBookingTotals] = React.useState<BookingTotals | null>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)


    useEffect(() => {
        const fetchUserName = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            const userEmail = session?.user?.email

            if (userEmail) {
                const { data, error } = await supabase
                    .from('clients')
                    .select('full_name')
                    .eq('email', userEmail)
                    .single()

                if (!error && data?.full_name) {
                    setUserName(data.full_name)
                }
            }
        }

        fetchUserName()
    }, [])

    useEffect(() => {
        const fetchBookingTotals = async () => {
            setLoading(true)
            setError(null)

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

                const { data: totalsData, error: totalsError } = await supabase
                    .from('client_booking_totals')
                    .select('completed_slots, last_completed_at')
                    .eq('client_id', clientData.id)
                    .maybeSingle()

                if (totalsError) {
                    console.error('Error fetching booking totals:', totalsError)
                    setError('Failed to load booking totals')
                } else {
                    setBookingTotals(totalsData || { completed_slots: 0, last_completed_at: null })
                }
            } catch (err) {
                console.error('Error fetching booking totals:', err)
                setError('Failed to load booking totals')
            } finally {
                setLoading(false)
            }
        }

        fetchBookingTotals()
    }, [])

    const handleBookingSuccess = () => {
        setBookingsKey(prev => prev + 1) // Refresh BookingHistory
    }

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <ClientHeader />

            {/* Enhanced Hero Section */}
            <div className="relative px-4 sm:px-6 py-6 sm:py-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20">
                <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25" />
                <div className="relative">
                    <div className="space-y-4 sm:space-y-6">
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                            <div className="relative flex-shrink-0">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl sm:rounded-2xl blur-lg opacity-30" />
                                <div className="relative p-2 sm:p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl sm:rounded-2xl">
                                    <UserCheck2 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                                </div>
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent leading-tight">
                                    Welcome back, {userName || 'Client'}
                                </h1>
                                <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mt-1 sm:mt-2">
                                    Manage your coaching sessions and track your progress
                                </p>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6">
                            {!loading && !error && bookingTotals && (
                                <div className="flex items-center gap-3 mt-2">
                                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border font-semibold text-sm px-4 py-2 shadow-sm rounded-full inline-flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5" />
                                        <span>{bookingTotals.completed_slots} Completed</span>
                                    </Badge>

                                    {bookingTotals?.last_completed_at && (
                                        <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border font-medium text-sm px-4 py-2 shadow-sm rounded-full inline-flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                            <span>Last: {formatCompactDate(bookingTotals.last_completed_at)}</span>
                                        </Badge>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-4 sm:px-6 py-6 sm:py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                    <BookingForm onBookingSuccess={handleBookingSuccess} />
                    <BookingHistory key={bookingsKey} />
                </div>
            </div>
        </div>
    )
}

function formatCompactDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}
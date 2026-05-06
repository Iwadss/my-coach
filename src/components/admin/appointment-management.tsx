import * as React from 'react'
import { format } from 'date-fns'
import supabase from '@/supabase/supabase'
import { AdminHeader } from '@/components/admin/admin-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, X, CalendarDays, Clock, Clipboard, AlertCircle, RefreshCcw, Archive, User, Phone } from 'lucide-react'


interface TimeSlot {
    id: number
    start_time: string
    end_time: string
    is_available: boolean
}

interface Client {
    id: string
    full_name: string
    phone: string
}

interface Booking {
    id: number
    date: string
    status: string
    client: Client
    timeslot: TimeSlot
}

export default function AppointmentManagement() {
    const [bookings, setBookings] = React.useState<Booking[]>([])
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)

    // Search and filter states for All Appointments
    const [searchTerm, setSearchTerm] = React.useState('')
    const [statusFilter, setStatusFilter] = React.useState('all')

    const statusOptions = ['pending', 'confirmed', 'cancelled', 'completed']

    const fetchBookings = React.useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const { data, error } = await supabase
                .from('bookings')
                .select(`
          id,
          date,
          status,
          client:clients!bookings_client_id_fkey (id, full_name, phone),
          timeslot:timeslots!bookings_time_slot_id_fkey (id, start_time, end_time, is_available)
        `)

            if (error) throw error

            const transformed: Booking[] = (data ?? []).map((b: any) => ({
                id: b.id,
                date: b.date,
                status: b.status,
                client: b.client || { id: '', full_name: '', phone: '' },
                timeslot: b.timeslot || { id: 0, start_time: '', end_time: '', is_available: false }
            }))

            setBookings(transformed)
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

    const updateBookingStatus = async (id: number, newStatus: string) => {
        const toastId = toast.loading("⏳ Updating booking status...");
        const { error } = await supabase
            .from('bookings')
            .update({ status: newStatus })
            .eq('id', id);

        toast.dismiss(toastId);

        if (error) {
            toast.error("❌ Failed to update status", {
                description: error.message || "Please try again.",
                className: 'toast-error',
                duration: 5000
            });
        } else {
            setBookings(prev =>
                prev.map(b => (b.id === id ? { ...b, status: newStatus } : b))
            );
            toast.success("✅ Status updated", {
                description: `Booking marked as ${newStatus}`,
                className: 'toast-success',
                duration: 3000
            });
        }
    };

    const handleArchive = async (booking: Booking) => {
        const toastId = toast.loading("⏳ Archiving booking...");

        try {
            if (booking.status === 'cancelled') {
                const { error: deleteError } = await supabase
                    .from('bookings')
                    .delete()
                    .eq('id', booking.id);

                toast.dismiss(toastId);

                if (deleteError) {
                    toast.error("❌ Failed to archive", {
                        description: deleteError.message,
                        className: 'toast-error'
                    });
                } else {
                    setBookings(prev => prev.filter(b => b.id !== booking.id));
                    toast.success("✅ Booking archived", {
                        description: "Cancelled booking has been removed.",
                        className: 'toast-success'
                    });
                }
            } else if (booking.status === 'completed') {
                const { data, error: fetchError } = await supabase
                    .from('client_booking_totals')
                    .select('completed_slots')
                    .eq('client_id', booking.client.id)
                    .single();

                if (fetchError && fetchError.code !== 'PGRST116') {
                    toast.dismiss(toastId);
                    toast.error("❌ Failed to fetch client data", {
                        description: fetchError.message,
                        className: 'toast-error'
                    });
                    return;
                }

                if (data) {
                    await supabase
                        .from('client_booking_totals')
                        .update({
                            completed_slots: data.completed_slots + 1,
                            last_completed_at: new Date().toISOString()
                        })
                        .eq('client_id', booking.client.id);
                } else {
                    await supabase
                        .from('client_booking_totals')
                        .insert({
                            client_id: booking.client.id,
                            completed_slots: 1,
                            last_completed_at: new Date().toISOString()
                        });
                }

                const { error: deleteError } = await supabase
                    .from('bookings')
                    .delete()
                    .eq('id', booking.id);

                toast.dismiss(toastId);

                if (deleteError) {
                    toast.error("❌ Failed to delete booking", {
                        description: deleteError.message,
                        className: 'toast-error'
                    });
                } else {
                    setBookings(prev => prev.filter(b => b.id !== booking.id));
                    toast.success("✅ Completed booking archived", {
                        description: "Booking removed and stats updated.",
                        className: 'toast-success'
                    });
                }
            }
        } catch (err: any) {
            toast.dismiss(toastId);
            toast.error("❌ Unexpected error", {
                description: err.message || "Something went wrong.",
                className: 'toast-error'
            });
        }
    };

    const formatDate = (date: string) => {
        try {
            return format(new Date(date), 'd MMMM yyyy')
        } catch {
            return 'Invalid date'
        }
    }

    const formatTimeSlot = (slot: TimeSlot) =>
        `${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}`

    // Filter bookings for All Appointments section
    const filteredBookings = React.useMemo(() => {
        return bookings.filter(booking => {
            // Ensure we have valid data before filtering
            if (!booking || !booking.client) {
                return false
            }

            const searchLower = searchTerm.toLowerCase().trim()
            const matchesSearch = searchTerm === '' ||
                (booking.client.full_name && booking.client.full_name.toLowerCase().includes(searchLower)) ||
                (booking.client.phone && booking.client.phone.includes(searchTerm.trim()))

            const matchesStatus = statusFilter === 'all' || booking.status === statusFilter

            return matchesSearch && matchesStatus
        })
    }, [bookings, searchTerm, statusFilter])

    const clearFilters = () => {
        setSearchTerm('')
        setStatusFilter('all')
    }

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <AdminHeader />

            {/* Enhanced Hero Section */}
            <div className="relative px-4 sm:px-6 py-6 sm:py-8 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/20 dark:via-teal-950/20 dark:to-cyan-950/20">
                <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25" />
                <div className="relative">
                    <div className="space-y-4 sm:space-y-6">
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                            <div className="relative flex-shrink-0">
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl sm:rounded-2xl blur-lg opacity-30" />
                                <div className="relative p-2 sm:p-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl sm:rounded-2xl">
                                    <CalendarDays className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                                </div>
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent leading-tight">
                                    Appointments Management
                                </h1>
                                <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mt-1 sm:mt-2">
                                    Monitor and manage all client appointments efficiently
                                </p>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm bg-white/60 dark:bg-gray-800/60 w-fit">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse flex-shrink-0" />
                                <span className="text-sm font-medium text-foreground">
                                    {bookings.filter(b => b.status === 'confirmed').length} Confirmed
                                </span>
                            </div>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm bg-white/60 dark:bg-gray-800/60 w-fit">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0" />
                                <span className="text-sm font-medium text-foreground">
                                    {bookings.filter(b => b.status === 'pending').length} Pending
                                </span>
                            </div>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm bg-white/60 dark:bg-gray-800/60 w-fit">
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                <span className="text-sm font-medium text-foreground">
                                    {bookings.length} Total Bookings
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 bg-gradient-to-b from-background to-muted/20">

                {/* Today's Bookings Card */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50 dark:from-gray-900 dark:via-blue-950/20 dark:to-indigo-950/30">
                    <CardHeader className="pb-0">
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                                <div className="relative flex-shrink-0">
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl blur opacity-30" />
                                    <div className="relative p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                                        <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-xl sm:text-2xl font-bold text-foreground">Today's Schedule</h3>
                                    <p className="text-sm sm:text-base text-muted-foreground mt-1">
                                        {(() => {
                                            const today = format(new Date(), 'yyyy-MM-dd')
                                            const todayBookings = bookings.filter(booking => booking.date === today)
                                            return `${todayBookings.length} appointments for today`
                                        })()} • {format(new Date(), 'EEEE, d MMMM yyyy')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                {(() => {
                                    const today = format(new Date(), 'yyyy-MM-dd')
                                    const todayBookings = bookings.filter(booking => booking.date === today)
                                    const confirmedToday = todayBookings.filter(b => b.status === 'confirmed').length
                                    const pendingToday = todayBookings.filter(b => b.status === 'pending').length
                                    return (
                                        <>
                                            <div className="px-3 sm:px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                                <span className="text-blue-700 dark:text-blue-400 font-semibold text-xs sm:text-sm">{confirmedToday} Confirmed</span>
                                            </div>
                                            <div className="px-3 sm:px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                                                <span className="text-yellow-700 dark:text-yellow-400 font-semibold text-xs sm:text-sm">{pendingToday} Pending</span>
                                            </div>
                                        </>
                                    )
                                })()}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-5 lg:p-7">
                        {(() => {
                            const today = format(new Date(), 'yyyy-MM-dd')
                            const todayBookings = bookings.filter(booking => booking.date === today)

                            if (loading) {
                                return (
                                    <div className="text-center py-20">
                                        <div className="relative mx-auto w-20 h-20 mb-8">
                                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 rounded-full animate-spin">
                                                <div className="absolute inset-3 bg-background rounded-full" />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <h4 className="text-xl font-bold text-foreground">Loading Today's Schedule</h4>
                                            <p className="text-sm text-muted-foreground">Please wait while we fetch your appointments...</p>
                                        </div>
                                    </div>
                                )
                            }

                            if (todayBookings.length === 0) {
                                return (
                                    <div className="text-center py-20">
                                        <div className="relative mx-auto w-32 h-32 mb-8">
                                            <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-purple-950/30 rounded-full" />
                                            <Clock className="w-16 h-16 text-blue-500 dark:text-blue-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                                        </div>
                                        <div className="space-y-4">
                                            <h3 className="text-2xl font-bold text-foreground">No Appointments Today</h3>
                                            <p className="text-muted-foreground max-w-lg mx-auto">Enjoy your free day! Tomorrow's schedule awaits your attention.</p>
                                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/20 rounded-full text-blue-600 dark:text-blue-400 text-sm font-medium">
                                                <AlertCircle className="w-4 h-4" />
                                                Check back tomorrow
                                            </div>
                                        </div>
                                    </div>
                                )
                            }

                            return (
                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 sm:gap-6">
                                    {todayBookings
                                        .sort((a, b) => a.timeslot.start_time.localeCompare(b.timeslot.start_time))
                                        .map(booking => {
                                            const getStatusColor = (status: string) => {
                                                switch (status) {
                                                    case 'confirmed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                    case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                    case 'completed': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                                }
                                            }

                                            return (
                                                <div key={booking.id} className="group relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50/40 to-indigo-50/60 dark:from-gray-800 dark:via-blue-950/30 dark:to-indigo-950/40 rounded-2xl" />
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent dark:via-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                                    <div className="relative border border-blue-100/80 dark:border-blue-900/40 rounded-2xl backdrop-blur-sm hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/5 transition-all duration-500 group-hover:border-blue-200/90 dark:group-hover:border-blue-800/60">
                                                        <div className="p-5 sm:p-6 lg:p-7">
                                                            <div className="flex flex-col gap-5">
                                                                {/* Header with time and status */}
                                                                <div className="flex items-start justify-between gap-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-3 h-3 ${booking.status === 'pending' ? 'bg-amber-500' :
                                                                            booking.status === 'confirmed' ? 'bg-emerald-500' :
                                                                                booking.status === 'cancelled' ? 'bg-red-500' :
                                                                                    booking.status === 'completed' ? 'bg-blue-500' :
                                                                                        'bg-gray-400'
                                                                            } rounded-full shadow-sm`} />
                                                                        <div className="space-y-1">
                                                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Time Slot</p>
                                                                            <h4 className="text-lg font-bold text-foreground">{formatTimeSlot(booking.timeslot)}</h4>
                                                                        </div>
                                                                    </div>
                                                                    <Badge className={`${getStatusColor(booking.status)} border font-semibold text-xs px-3 py-1.5 shadow-sm`}>
                                                                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                                                    </Badge>
                                                                </div>

                                                                {/* Appointment details */}
                                                                <div className="grid grid-rows-2 gap-4">
                                                                    {/* Name Row */}
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="p-2 rounded-xl bg-blue-100/10 dark:bg-blue-900/30">
                                                                            <User className="w-5 h-5 text-blue-400" />
                                                                        </div>
                                                                        <p className="font-semibold text-foreground">
                                                                            {booking.client.full_name}
                                                                        </p>
                                                                    </div>

                                                                    {/* Phone Row */}
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="p-2 rounded-xl bg-indigo-100/10 dark:bg-indigo-900/30">
                                                                            <Phone className="w-5 h-5 text-indigo-400" />
                                                                        </div>
                                                                        <p className="font-medium text-foreground">
                                                                            {booking.client.phone}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* Actions */}
                                                                <div className="flex items-center gap-3 sm:gap-4 w-full">
                                                                    {/* Status Dropdown (left) */}
                                                                    <div className="flex-1">
                                                                        <Select
                                                                            value={booking.status}
                                                                            onValueChange={(value) => {
                                                                                updateBookingStatus(booking.id, value)
                                                                            }}
                                                                        >
                                                                            <SelectTrigger className="h-12 px-4 flex items-center justify-between bg-gradient-to-r from-white to-blue-50/50 dark:from-gray-900 dark:to-blue-950/30 border border-blue-200/70 dark:border-blue-800/50 rounded-xl text-sm font-semibold shadow-sm hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 dark:hover:border-blue-700">
                                                                                <div className="flex items-center gap-3">
                                                                                    <SelectValue className="text-foreground font-medium" />
                                                                                </div>
                                                                            </SelectTrigger>
                                                                            <SelectContent className="min-w-[200px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-blue-200/70 dark:border-blue-800/50 shadow-2xl rounded-xl">
                                                                                {statusOptions.map((status) => {
                                                                                    const statusDotColor =
                                                                                        status === 'pending'
                                                                                            ? 'bg-amber-500'
                                                                                            : status === 'confirmed'
                                                                                                ? 'bg-emerald-500'
                                                                                                : status === 'cancelled'
                                                                                                    ? 'bg-red-500'
                                                                                                    : status === 'completed'
                                                                                                        ? 'bg-blue-500'
                                                                                                        : 'bg-gray-400';

                                                                                    return (
                                                                                        <SelectItem
                                                                                            key={status}
                                                                                            value={status}
                                                                                            className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/30 focus:bg-blue-50 dark:focus:bg-blue-950/30 transition-colors duration-200 py-3"
                                                                                        >
                                                                                            <div className="flex items-center gap-3">
                                                                                                <div className={`w-2 h-2 rounded-full ${statusDotColor}`} />
                                                                                                <span className="font-semibold">
                                                                                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                                                                                </span>
                                                                                            </div>
                                                                                        </SelectItem>
                                                                                    );
                                                                                })}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>

                                                                    {/* Archive Button (right) */}
                                                                    <div className="sm:w-auto">
                                                                        <Button
                                                                            disabled={['pending', 'confirmed'].includes(booking.status)}
                                                                            onClick={() => handleArchive(booking)}
                                                                            className="h-full px-4 flex items-center justify-center bg-gradient-to-r from-red-500 via-red-600 to-pink-600 hover:from-red-600 hover:via-red-700 hover:to-pink-700 text-white font-semibold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                        >
                                                                            <Archive className="w-4 h-4 mr-2" />
                                                                            <span>Archive</span>
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                </div>
                            )
                        })()}
                    </CardContent>
                </Card>

                {/* All Appointments List */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/50 dark:from-gray-900 dark:via-emerald-950/20 dark:to-teal-950/30">
                    <CardHeader className="pb-0">
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                                <div className="relative flex-shrink-0">
                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl blur opacity-30" />
                                    <div className="relative p-2 sm:p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl">
                                        <Clipboard className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-xl sm:text-2xl font-bold text-foreground">All Appointments</h3>
                                    <p className="text-sm sm:text-base text-muted-foreground mt-1">{filteredBookings.length} of {bookings.length} appointments</p>
                                </div>
                            </div>
                            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                                {/* Search Input */}
                                <div className="w-auto min-w-[300px]">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-600 dark:text-emerald-400 w-4 h-4" />
                                        <Input
                                            type="text"
                                            placeholder="Search by client name or phone..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="h-10 pl-10 bg-white/90 dark:bg-gray-900/90 border-emerald-200/60 dark:border-emerald-800/60 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 shadow-sm hover:shadow-md"
                                        />
                                    </div>
                                </div>

                                {/* Status Filter + Clear Filters */}
                                <div className="flex items-center gap-3 w-full lg:w-auto">
                                    {/* Status Filter */}
                                    <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
                                        <SelectTrigger className="h-10 bg-white/90 dark:bg-gray-900/90 border-emerald-200/60 dark:border-emerald-800/60 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 shadow-sm hover:shadow-md w-48">
                                            <div className="flex items-center gap-2">
                                                <Filter className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                <SelectValue placeholder="Filter by status" className="text-sm font-medium" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-emerald-200/60 dark:border-emerald-800/60">
                                            <SelectItem value="all">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                                                    <span>All Status</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="pending">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                                                    <span>Pending</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="confirmed">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                                                    <span>Confirmed</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="cancelled">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                                                    <span>Cancelled</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="completed">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                                    <span>Completed</span>
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {/* Clear Filters Button */}
                                    {(searchTerm || statusFilter !== 'all') && (
                                        <Button
                                            variant="outline"
                                            onClick={clearFilters}
                                            className="h-10 px-4 border-emerald-200/60 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                                        >
                                            <X className="w-4 h-4 mr-1" />
                                            Clear Filters
                                        </Button>
                                    )}
                                </div>
                            </div>
                            {/* Filter Results Summary */}
                            {(searchTerm || statusFilter !== 'all') && (
                                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-lg border border-emerald-200/30 dark:border-emerald-800/30 text-center flex flex-col items-center justify-center">

                                    <div className="flex items-center justify-center gap-2 text-sm">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                        <span className="font-medium text-emerald-700 dark:text-emerald-400">
                                            Showing {filteredBookings.length} of {bookings.length} appointments
                                        </span>
                                    </div>

                                    {(searchTerm || statusFilter !== 'all') && (
                                        <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
                                            {searchTerm && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/60 dark:bg-gray-800/60 rounded-md">
                                                    <Search className="w-3 h-3" />
                                                    matching "{searchTerm}"
                                                </span>
                                            )}
                                            {statusFilter !== 'all' && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/60 dark:bg-gray-800/60 rounded-md">
                                                    <Filter className="w-3 h-3" />
                                                    status: {statusFilter}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-5 lg:p-7">
                        {loading ? (
                            <div className="text-center py-20">
                                <div className="relative mx-auto w-20 h-20 mb-8">
                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 rounded-full animate-spin">
                                        <div className="absolute inset-3 bg-background rounded-full" />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-xl font-bold text-foreground">Loading All Appointments</h4>
                                    <p className="text-sm text-muted-foreground">Fetching your complete appointment list...</p>
                                </div>
                            </div>
                        ) : error ? (
                            <div className="text-center py-20">
                                <div className="relative mx-auto w-20 h-20 mb-8">
                                    <div className="absolute inset-0 bg-gradient-to-br from-red-100 via-red-50 to-pink-100 dark:from-red-950/30 dark:via-red-950/20 dark:to-pink-950/30 rounded-full">
                                        <AlertCircle className="w-10 h-10 text-red-500 dark:text-red-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-xl font-bold text-red-600 dark:text-red-400">Error Loading Appointments</h4>
                                    <p className="text-sm text-muted-foreground max-w-md mx-auto">{error}</p>
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950/20 rounded-full text-red-600 dark:text-red-400 text-sm font-medium">
                                        <RefreshCcw className="w-4 h-4" />
                                        Try refreshing the page
                                    </div>
                                </div>
                            </div>
                        ) : filteredBookings.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="relative mx-auto w-32 h-32 mb-8">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-cyan-950/30 rounded-full" />
                                    <CalendarDays className="w-16 h-16 text-emerald-500 dark:text-emerald-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-2xl font-bold text-foreground">
                                        {bookings.length === 0 ? 'No Bookings Found' : 'No Matching Appointments'}
                                    </h3>
                                    <p className="text-muted-foreground max-w-lg mx-auto">
                                        {bookings.length === 0
                                            ? 'When clients make appointments, they\'ll appear here. Your appointment management starts now!'
                                            : 'No appointments match your current search or filter criteria. Try adjusting your filters.'}
                                    </p>
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-full text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                                        <Search className="w-4 h-4" />
                                        {bookings.length === 0 ? 'Waiting for bookings' : 'Refine your search'}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 sm:gap-6">
                                {filteredBookings
                                    .sort((a, b) => {
                                        // Sort by date first, then by time
                                        const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime()
                                        if (dateCompare !== 0) return dateCompare
                                        return a.timeslot.start_time.localeCompare(b.timeslot.start_time)
                                    })
                                    .map(booking => {
                                        const getStatusColor = (status: string) => {
                                            switch (status) {
                                                case 'confirmed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                case 'completed': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                            }
                                        }

                                        return (
                                            <div key={booking.id} className="group relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/60 dark:from-gray-800 dark:via-emerald-950/30 dark:to-teal-950/40 rounded-2xl" />
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent dark:via-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                                <div className="relative border border-emerald-100/80 dark:border-emerald-900/40 rounded-2xl backdrop-blur-sm hover:shadow-2xl hover:shadow-emerald-500/10 dark:hover:shadow-emerald-500/5 transition-all duration-500 group-hover:border-emerald-200/90 dark:group-hover:border-emerald-800/60">
                                                    <div className="p-5 sm:p-6 lg:p-7">
                                                        <div className="flex flex-col gap-5">
                                                            {/* Header with date and status */}
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-3 h-3 ${booking.status === 'pending' ? 'bg-amber-500' :
                                                                        booking.status === 'confirmed' ? 'bg-emerald-500' :
                                                                            booking.status === 'cancelled' ? 'bg-red-500' :
                                                                                booking.status === 'completed' ? 'bg-blue-500' :
                                                                                    'bg-gray-400'
                                                                        } rounded-full shadow-sm`} />
                                                                    <div className="space-y-1">
                                                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Appointment Date</p>
                                                                        <h4 className="text-lg font-bold text-foreground">{formatDate(booking.date)}</h4>
                                                                    </div>
                                                                </div>
                                                                <Badge className={`${getStatusColor(booking.status)} border font-semibold text-xs px-3 py-1.5 shadow-sm`}>
                                                                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                                                </Badge>
                                                            </div>

                                                            {/* Appointment details */}

                                                            <div className="grid grid-rows-3 gap-4">
                                                                {/* Time Row */}
                                                                <div className="flex items-center gap-4">
                                                                    <div className="p-2 rounded-xl bg-orange-100/10 dark:bg-orange-900/30">
                                                                        <Clock className="w-5 h-5 text-orange-500" />
                                                                    </div>
                                                                    <p className="font-bold text-foreground">
                                                                        {formatTimeSlot(booking.timeslot)}
                                                                    </p>
                                                                </div>

                                                                {/* Name Row */}
                                                                <div className="flex items-center gap-4">
                                                                    <div className="p-2 rounded-xl bg-emerald-100/10 dark:bg-emerald-900/30">
                                                                        <User className="w-5 h-5 text-emerald-400" />
                                                                    </div>
                                                                    <p className="font-semibold text-foreground">
                                                                        {booking.client.full_name}
                                                                    </p>
                                                                </div>

                                                                {/* Phone Row */}
                                                                <div className="flex items-center gap-4">
                                                                    <div className="p-2 rounded-xl bg-purple-100/10 dark:bg-purple-900/30">
                                                                        <Phone className="w-5 h-5 text-purple-400" />
                                                                    </div>
                                                                    <p className="font-medium text-foreground">
                                                                        {booking.client.phone}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Actions */}
                                                            <div className="flex items-center gap-3 sm:gap-4 w-full">
                                                                {/* Status Dropdown (left) */}
                                                                <div className="flex-1">
                                                                    <Select
                                                                        value={booking.status}
                                                                        onValueChange={(value) => {
                                                                            updateBookingStatus(booking.id, value)

                                                                        }}
                                                                    >
                                                                        <SelectTrigger className="h-12 px-4 flex items-center justify-between bg-gradient-to-r from-white to-emerald-50/50 dark:from-gray-900 dark:to-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 rounded-xl text-sm font-semibold shadow-sm hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 dark:hover:border-emerald-700">
                                                                            <div className="flex items-center gap-3">
                                                                                <SelectValue className="text-foreground font-medium" />
                                                                            </div>
                                                                        </SelectTrigger>
                                                                        <SelectContent className="min-w-[200px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-emerald-200/70 dark:border-emerald-800/50 shadow-2xl rounded-xl">
                                                                            {statusOptions.map((status) => {
                                                                                const statusDotColor =
                                                                                    status === 'pending'
                                                                                        ? 'bg-amber-500'
                                                                                        : status === 'confirmed'
                                                                                            ? 'bg-emerald-500'
                                                                                            : status === 'cancelled'
                                                                                                ? 'bg-red-500'
                                                                                                : status === 'completed'
                                                                                                    ? 'bg-blue-500'
                                                                                                    : 'bg-gray-400';

                                                                                return (
                                                                                    <SelectItem
                                                                                        key={status}
                                                                                        value={status}
                                                                                        className="cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/30 focus:bg-emerald-50 dark:focus:bg-emerald-950/30 transition-colors duration-200 py-3"
                                                                                    >
                                                                                        <div className="flex items-center gap-3">
                                                                                            <div className={`w-2 h-2 rounded-full ${statusDotColor}`} />
                                                                                            <span className="font-semibold">
                                                                                                {status.charAt(0).toUpperCase() + status.slice(1)}
                                                                                            </span>
                                                                                        </div>
                                                                                    </SelectItem>
                                                                                );
                                                                            })}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>

                                                                {/* Archive Button (right) */}
                                                                <div className="sm:w-auto">
                                                                    <Button
                                                                        disabled={['pending', 'confirmed'].includes(booking.status)}
                                                                        onClick={() => handleArchive(booking)}
                                                                        className="h-full px-4 flex items-center justify-center bg-gradient-to-r from-red-500 via-red-600 to-pink-600 hover:from-red-600 hover:via-red-700 hover:to-pink-700 text-white font-semibold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        <Archive className="w-4 h-4 mr-2" />
                                                                        <span>Archive</span>
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
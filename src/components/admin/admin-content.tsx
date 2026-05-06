import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminHeader } from '@/components/admin/admin-header'
import supabase from '@/supabase/supabase'
import { Pie, PieChart } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, PieChart as PieChartIcon, Users, Calendar, CalendarX, BarChart3, Settings, Trophy, Medal, Award, Star, Clock } from 'lucide-react'

// Interfaces for typing the chart and client data
interface StatusData {
  status: string
  count: number
  fill: string
}

interface TopClient {
  id: string
  full_name: string
  completed_slots: number
}

interface TodayBooking {
  id: number
  date: string
  time: string
  status: string
  client_name: string
  client_phone: string
}

interface UnavailableDay {
  id: number
  day: string
  is_available: boolean
}

// Chart configuration used for labeling and coloring chart sections
const statusConfig = {
  count: {
    label: "Appointments",
  },
  Pending: {
    label: "Pending",
    color: "#facc15",
  },
  Confirmed: {
    label: "Confirmed",
    color: "#34d399",
  },
  Cancelled: {
    label: "Cancelled",
    color: "#f87171",
  },
  Completed: {
    label: "Completed",
    color: "#60a5fa",
  },
}

export function AdminContent() {
  const navigate = useNavigate()
  const [statusData, setStatusData] = React.useState<StatusData[]>([])
  const [topClients, setTopClients] = React.useState<TopClient[]>([])
  const [todayBookings, setTodayBookings] = React.useState<TodayBooking[]>([])
  const [unavailableDays, setUnavailableDays] = React.useState<UnavailableDay[]>([])
  const [totalBookings, setTotalBookings] = React.useState<number>(0)

  // Fetch stats when the component mounts
  React.useEffect(() => {
    fetchBookingStats()
  }, [])

  // Fetch booking status data and top clients from Supabase
  const fetchBookingStats = async () => {
    try {
      // 1. Fetch appointment status counts
      const { data: bookings, error } = await supabase.from('bookings').select('status')
      if (error) throw error

      // 2. Count each booking status
      const statusCounts = {
        pending: 0,
        confirmed: 0,
        cancelled: 0,
        completed: 0
      }

      bookings?.forEach(booking => {
        const status = booking.status?.toLowerCase()
        if (status in statusCounts) {
          statusCounts[status as keyof typeof statusCounts]++
        }
      })

      // 3. Calculate total bookings
      const total = statusCounts.pending + statusCounts.confirmed + statusCounts.cancelled + statusCounts.completed
      setTotalBookings(total)

      // 4. Prepare data for pie chart
      const chartData: StatusData[] = [
        { status: "Pending", count: statusCounts.pending, fill: "#facc15" },
        { status: "Confirmed", count: statusCounts.confirmed, fill: "#34d399" },
        { status: "Cancelled", count: statusCounts.cancelled, fill: "#f87171" },
        { status: "Completed", count: statusCounts.completed, fill: "#60a5fa" },
      ].filter(item => item.count > 0)

      setStatusData(chartData)

      // 5. Fetch top 3 clients based on completed slots
      const { data: topClientData, error: topClientError } = await supabase
        .from('client_booking_totals')
        .select('client_id, completed_slots, clients ( full_name )')
        .order('completed_slots', { ascending: false })
        .limit(3);

      if (topClientError) throw topClientError;

      const formattedTopClients = topClientData.map((row: any) => ({
        id: row.client_id,
        full_name: row.clients?.full_name ?? 'Unknown',
        completed_slots: row.completed_slots ?? 0,
      }))

      setTopClients(formattedTopClients)

      // 6. Fetch today's bookings
      const today = new Date().toLocaleDateString('en-CA') // outputs 'YYYY-MM-DD' in local time
      const { data: todayBookingsData, error: todayBookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          date,
          status,
          clients ( full_name, phone ),
          timeslots ( start_time, end_time )
        `)
        .eq('date', today)
        .order('timeslots(start_time)', { ascending: true });

      if (!todayBookingsError && todayBookingsData) {
        const formattedTodayBookings = todayBookingsData.map((booking: any) => ({
          id: booking.id,
          date: booking.date,
          time: booking.timeslots ? `${booking.timeslots.start_time.slice(0, 5)} - ${booking.timeslots.end_time.slice(0, 5)}` : 'N/A',
          status: booking.status,
          client_name: booking.clients?.full_name ?? 'Unknown Client',
          client_phone: booking.clients?.phone ?? 'N/A'
        }))
        setTodayBookings(formattedTodayBookings)
      }

      // 7. Fetch unavailable days
      const { data: unavailableDaysData, error: unavailableDaysError } = await supabase
        .from('available_days')
        .select('id, day, is_available')
        .eq('is_available', false)
        .order('day', { ascending: true });

      if (!unavailableDaysError && unavailableDaysData) {
        setUnavailableDays(unavailableDaysData)
      }

    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AdminHeader />

      {/* Dashboard header section with title and description */}
      <div className="relative px-4 sm:px-6 py-6 sm:py-8 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-900/20 dark:via-amber-900/20 dark:to-orange-900/20">
        <div className="absolute inset-0 bg-grid-yellow-100 dark:bg-grid-yellow-700/25 mask-image-[linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
        <div className="relative">
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="relative flex-shrink-0">
                {/* Animated background glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-xl sm:rounded-2xl blur-lg opacity-30" />
                <div className="relative p-2 sm:p-3 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-xl sm:rounded-2xl">
                  <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 bg-clip-text text-transparent leading-tight">
                  Admin Dashboard
                </h1>
                <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mt-1 sm:mt-2">
                  Your comprehensive coaching business overview
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area with grid sections */}
      <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 bg-gradient-to-b from-background to-muted/20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Appointment Status Pie Chart */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-purple-50/30 to-indigo-50/50 dark:from-gray-900 dark:via-purple-950/20 dark:to-indigo-950/30">
            <CardHeader className="pb-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl blur opacity-30" />
                  <div className="relative p-2 sm:p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl">
                    <PieChartIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-xl sm:text-2xl font-bold">Appointment Status Overview</CardTitle>
                  <CardDescription className="text-sm sm:text-base">Distribution of appointments</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-3 sm:p-5 lg:p-7">
              {statusData.length === 0 ? (
                <div className="text-center py-12">
                  <div className="relative mx-auto w-24 h-24 mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-100 via-indigo-50 to-blue-100 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-blue-950/30 rounded-full" />
                    <PieChartIcon className="w-12 h-12 text-purple-500 dark:text-purple-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Booking Data</h3>
                  <p className="text-muted-foreground text-sm">Start accepting bookings to see analytics</p>
                </div>
              ) : (
                <div className="relative">
                  <ChartContainer
                    config={statusConfig}
                    className="mx-auto aspect-square max-h-[320px]"
                  >
                    <PieChart>
                      <Pie data={statusData} dataKey="count" nameKey="status" innerRadius={60} outerRadius={120} />
                      <ChartLegend
                        content={<ChartLegendContent nameKey="status" />}
                        className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
                      />
                    </PieChart>
                  </ChartContainer>
                  {/* Center text showing total bookings */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center -translate-y-4">
                      <div className="text-3xl font-bold text-foreground">{totalBookings}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Clients Card */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/50 dark:from-gray-900 dark:via-emerald-950/20 dark:to-teal-950/30">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl blur opacity-30" />
                  <div className="relative p-2 sm:p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-xl sm:text-2xl font-bold">Top Clients</CardTitle>
                  <CardDescription className="text-sm sm:text-base">Top clients based on completed sessions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-3 sm:p-5 lg:p-7">
              {topClients.length === 0 ? (
                <div className="text-center py-12">
                  <div className="relative mx-auto w-24 h-24 mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-cyan-950/30 rounded-full" />
                    <Users className="w-12 h-12 text-emerald-500 dark:text-emerald-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Top Clients Yet</h3>
                  <p className="text-muted-foreground text-sm">Complete sessions to see your top clients</p>
                </div>
              ) : (
                topClients.map((client, index) => {
                  const getRankColors = (rank: number) => {
                    switch (rank) {
                      case 0: return {
                        gradient: 'from-yellow-300 via-yellow-400 to-yellow-600',
                        bg: 'from-yellow-50/80 via-amber-50/60 to-yellow-100/80 dark:from-yellow-950/30 dark:via-amber-950/20 dark:to-yellow-900/40',
                        border: 'border-yellow-300/70 dark:border-yellow-600/50',
                        badge: 'from-yellow-200 via-yellow-300 to-amber-300 dark:from-yellow-800/60 dark:via-yellow-700/60 dark:to-amber-700/60 text-yellow-800 dark:text-yellow-200',
                        icon: Trophy,
                        glow: 'shadow-yellow-400/30 dark:shadow-yellow-600/20'
                      }
                      case 1: return {
                        gradient: 'from-slate-300 via-gray-400 to-slate-500',
                        bg: 'from-slate-50/80 via-gray-100/60 to-slate-200/80 dark:from-slate-950/30 dark:via-gray-950/20 dark:to-slate-900/40',
                        border: 'border-slate-300/70 dark:border-slate-600/50',
                        badge: 'from-slate-200 via-gray-300 to-slate-400 dark:from-slate-800/60 dark:via-gray-700/60 dark:to-slate-700/60 text-slate-700 dark:text-slate-200',
                        icon: Medal,
                        glow: 'shadow-slate-400/30 dark:shadow-slate-600/20'
                      }
                      case 2: return {
                        gradient: 'from-amber-600 via-orange-600 to-amber-800',
                        bg: 'from-amber-50/80 via-orange-50/60 to-amber-100/80 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-amber-900/40',
                        border: 'border-amber-400/70 dark:border-amber-600/50',
                        badge: 'from-amber-200 via-orange-300 to-amber-400 dark:from-amber-800/60 dark:via-orange-700/60 dark:to-amber-700/60 text-amber-800 dark:text-amber-200',
                        icon: Award,
                        glow: 'shadow-amber-500/30 dark:shadow-amber-600/20'
                      }
                      default: return {
                        gradient: 'from-emerald-500 to-teal-600',
                        bg: 'from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20',
                        border: 'border-emerald-200/60 dark:border-emerald-800/40',
                        badge: 'from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 text-emerald-700 dark:text-emerald-300',
                        icon: Star,
                        glow: 'shadow-emerald-400/20 dark:shadow-emerald-600/15'
                      }
                    }
                  }

                  const colors = getRankColors(index)

                  return (
                    <div
                      key={client.id}
                      className="group relative overflow-hidden"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} rounded-2xl`} />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent dark:via-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className={`relative flex items-center justify-between p-4 rounded-2xl border ${colors.border} backdrop-blur-sm shadow-lg ${colors.glow}`}>
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className={`absolute inset-0 bg-gradient-to-r ${colors.gradient} rounded-full blur opacity-30`} />
                            <div className={`relative w-12 h-12 bg-gradient-to-r ${colors.gradient} rounded-full flex items-center justify-center shadow-xl ${colors.glow}`}>
                              <colors.icon className="w-6 h-6 text-white" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-bold text-foreground text-lg">{client.full_name}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className="text-xs font-semibold border border-red-500/50 bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white shadow-inner shadow-red-400/10 px-3 py-1 rounded-full hover:brightness-110 transition-all duration-200"
                              >
                                {client.completed_slots} sessions
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className={`px-4 py-2 bg-gradient-to-r ${colors.badge} rounded-full text-sm font-bold shadow-md`}>
                          Top {index + 1}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Enhanced dashboard widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-red-50/30 to-rose-50/50 dark:from-gray-900 dark:via-red-950/20 dark:to-rose-950/30">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl blur opacity-30" />
                  <div className="relative p-2 sm:p-3 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl">
                    <CalendarX className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-xl sm:text-2xl font-bold">Unavailable Days</CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    {unavailableDays.length} day{unavailableDays.length !== 1 ? 's' : ''} currently unavailable
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-3 sm:p-5 lg:p-7">
              {unavailableDays.length === 0 ? (
                <div className="text-center py-12">
                  <div className="relative mx-auto w-24 h-24 mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 dark:from-green-950/30 dark:via-emerald-950/20 dark:to-teal-950/30 rounded-full" />
                    <Calendar className="w-12 h-12 text-green-500 dark:text-green-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">All Days Available</h3>
                  <p className="text-muted-foreground text-sm">Ready to accept bookings!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unavailableDays.slice(0, 4).map((day) => {
                    const formatDayName = (dayStr: string) => {
                      const days = {
                        'monday': 'Monday',
                        'tuesday': 'Tuesday',
                        'wednesday': 'Wednesday',
                        'thursday': 'Thursday',
                        'friday': 'Friday',
                        'saturday': 'Saturday',
                        'sunday': 'Sunday'
                      }
                      return days[dayStr.toLowerCase() as keyof typeof days] || dayStr
                    }

                    return (
                      <div key={day.id} className="group relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-white via-red-50/40 to-rose-50/60 dark:from-gray-800 dark:via-red-950/30 dark:to-rose-950/40 rounded-2xl" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent dark:via-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative flex items-center justify-between p-4 rounded-2xl border border-red-100/50 dark:border-red-800/30 backdrop-blur-sm">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className="absolute inset-0 bg-red-500 rounded-full blur opacity-30" />
                              <div className="relative w-3 h-3 bg-red-500 rounded-full"></div>
                            </div>
                            <div>
                              <div className="font-bold text-foreground text-lg">{formatDayName(day.day)}</div>
                              <div className="text-sm text-muted-foreground">Not accepting bookings</div>
                            </div>
                          </div>
                          <div className="px-3 py-1 bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-bold">
                            Unavailable
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {unavailableDays.length > 4 && (
                    <div className="text-center pt-4">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950/20 rounded-full text-red-600 dark:text-red-400 text-sm font-medium">
                        <CalendarX className="w-4 h-4" />
                        +{unavailableDays.length - 4} more unavailable day{unavailableDays.length - 4 !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )}
                  <div className="text-center pt-4">
                    <Button
                      onClick={() => navigate('/time-slots-management')}
                      className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold px-6 py-2 rounded-l-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Manage Availability
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50 dark:from-gray-900 dark:via-blue-950/20 dark:to-indigo-950/30">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl blur opacity-30" />
                  <div className="relative p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-xl sm:text-2xl font-bold">Today's Schedule Overview</CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    {todayBookings.length} appointment{todayBookings.length !== 1 ? 's' : ''} scheduled for today
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-3 sm:p-5 lg:p-7">
              {todayBookings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="relative mx-auto w-24 h-24 mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-purple-950/30 rounded-full" />
                    <Calendar className="w-12 h-12 text-blue-500 dark:text-blue-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Appointments Today</h3>
                  <p className="text-muted-foreground text-sm">Enjoy your free day!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayBookings.slice(0, 4).map((booking) => {
                    const getStatusBadge = (status: string) => {
                      switch (status.toLowerCase()) {
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
                        <div className="relative p-4 rounded-2xl border border-blue-100/50 dark:border-blue-800/30 backdrop-blur-sm">
                          <div className="absolute top-3 right-3">
                            <span className={`px-3 py-1 rounded-md text-xs font-semibold shadow-sm ${getStatusBadge(booking.status)}`}>
                              {booking.status}
                            </span>
                          </div>
                          <div className="pr-20">
                            <div className="mb-2">
                              <span className="font-bold text-foreground text-lg">{booking.client_name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />Time Slot:
                              <span className="font-medium">{booking.time}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {todayBookings.length > 4 && (
                    <div className="text-center pt-4">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/20 rounded-full text-blue-600 dark:text-blue-400 text-sm font-medium">
                        <Activity className="w-4 h-4" />
                        +{todayBookings.length - 4} more appointment{todayBookings.length - 4 !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )}
                  <div className="text-center pt-4">
                    <Button
                      onClick={() => navigate('/appointment-management')}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold px-6 py-2 rounded-l-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Manage Schedule
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
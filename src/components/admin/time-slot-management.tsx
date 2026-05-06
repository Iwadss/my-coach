import { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/admin-header";
import { toast } from "sonner";
import supabase from "@/supabase/supabase";
import {
    Card,
    CardContent,
    CardHeader
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "../ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TimePicker } from "@/components/TimePicker";
import { Input } from "@/components/ui/input";
import { AlertTriangle, CalendarDays, ChevronDown, ChevronUp, ClipboardList, Clock, Loader2, Plus, Search, Trash } from "lucide-react";

interface TimeSlot {
    id: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
}

interface AvailableDay {
    id: number;
    day: string;
    is_available: boolean;
}

export default function TimeSlots() {
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [availableDays, setAvailableDays] = useState<AvailableDay[]>([]);
    const [loading, setLoading] = useState(false);
    const [showMore, setShowMore] = useState(false);
    const [slotToDelete, setSlotToDelete] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [newSlot, setNewSlot] = useState({
        start_time: "",
        end_time: "",
        is_available: true,
    });

    useEffect(() => {
        fetchTimeSlots();
        fetchAvailableDays();
    }, []);

    const fetchTimeSlots = async () => {
        setLoading(true);
        const { data } = await supabase.from("timeslots").select("*").order("start_time");
        if (data) setTimeSlots(data);
        setLoading(false);
    };

    const fetchAvailableDays = async () => {
        const { data } = await supabase.from("available_days").select("*").order("id");
        if (data) setAvailableDays(data);
    };

    const handleAddTimeSlot = async () => {
        if (!newSlot.start_time || !newSlot.end_time) {
            toast.warning("⚠️ Please fill in both Start Time and End Time.", {
                description: "Ensure all fields are completed before adding a new slot.",
                className: 'toast-warning'
            });
            return;
        }
        const toastId = toast.loading("⏳ Adding time slot...");
        const { error } = await supabase.from("timeslots").insert([newSlot]);
        toast.dismiss(toastId);
        if (!error) {
            toast.success("✅ Time slot successfully added!", {
                description: `${formatTime(newSlot.start_time)} - ${formatTime(newSlot.end_time)} is now available.`,
                className: 'toast-success',
                duration: 4000
            });
            setNewSlot({ start_time: "", end_time: "", is_available: true });
            fetchTimeSlots();
        } else {
            toast.error("❌ Failed to add time slot", {
                description: error.message || "Please try again.",
                className: 'toast-error',
                duration: 5000
            });
        }
    };

    const updateTimeSlot = async (id: number, updates: Partial<TimeSlot>) => {
        const { error } = await supabase.from("timeslots").update(updates).eq("id", id);
        if (!error) {
            toast.info("ℹ️ Time slot updated", {
                description: "Availability has been changed.",
                className: 'toast-info',
                duration: 3000
            });
            fetchTimeSlots();
        } else {
            toast.error("❌ Failed to update slot", {
                description: error.message || "Please try again.",
                className: 'toast-error',
                duration: 5000
            });
        }
    };

    const confirmDeleteTimeSlot = async () => {
        if (slotToDelete !== null) {
            const toastId = toast.loading("⏳ Deleting time slot...");
            const { error } = await supabase.from("timeslots").delete().eq("id", slotToDelete);
            toast.dismiss(toastId);
            if (!error) {
                toast.success("🗑️ Time Slot Deleted", {
                    description: "Time slot has been successfully removed.",
                    className: 'toast-delete',
                    duration: 4000
                });
                fetchTimeSlots();
            } else {
                toast.error("❌ Failed to delete", {
                    description: error.message || "Please try again later.",
                    className: 'toast-error',
                    duration: 5000
                });
            }
            setSlotToDelete(null);
        }
    };

    const toggleDayAvailability = async (id: number, is_available: boolean) => {
        const { error } = await supabase.from("available_days").update({ is_available }).eq("id", id);
        if (!error) {
            toast.info("🗓️ Availability updated", {
                description: `Day marked as ${is_available ? "available" : "unavailable"}.`,
                className: is_available ? 'toast-available' : 'toast-unavailable',
                duration: 3000
            });
            fetchAvailableDays();
        } else {
            toast.error("❌ Update failed", {
                description: error.message || "Try again later.",
                className: 'toast-error',
                duration: 5000
            });
        }
    };

    // Helper function to format time (remove seconds)
    const formatTime = (time: string) => {
        return time.slice(0, 5); // Show only HH:MM
    };
    // Filter time slots based on search query
    const filteredTimeSlots = timeSlots.filter(slot => {
        if (!searchQuery) return true;

        const query = searchQuery.toLowerCase();
        const timeRange = `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`.toLowerCase();
        const status = slot.is_available ? 'available' : 'unavailable';

        return (
            timeRange.includes(query) ||
            status.toLowerCase().includes(query)
        );
    });

    const visibleSlots = showMore ? filteredTimeSlots : filteredTimeSlots.slice(0, 6);
    const activeSlots = timeSlots.filter(slot => slot.is_available).length;
    const activeDays = availableDays.filter(day => day.is_available).length;



    return (
        <div className="min-h-screen flex flex-col bg-background">
            <AdminHeader />
            {/* Enhanced Hero Section */}
            <div className="relative px-4 sm:px-6 py-6 sm:py-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20">
                <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25" />
                <div className="relative">
                    <div className="space-y-4 sm:space-y-6">
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                            <div className="relative flex-shrink-0">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl sm:rounded-2xl blur-lg opacity-30" />
                                <div className="relative p-2 sm:p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl sm:rounded-2xl">
                                    <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                                </div>
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent leading-tight">
                                    Time Slots Management
                                </h1>
                                <p className="text-[13px] sm:text-base lg:text-lg text-muted-foreground leading-snug sm:leading-normal mt-1 sm:mt-2">
                                    Create and manage your coaching availability with precision
                                </p>
                            </div>
                        </div>

                        {/* Quick Stats - Mobile Responsive */}

                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6">
                            {/* Active Slots */}
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm bg-white/60 dark:bg-gray-800/60 w-fit">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
                                <span className="text-xs sm:text-sm font-medium text-foreground">
                                    {activeSlots} Active Slots
                                </span>
                            </div>

                            {/* Available Days */}
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm bg-white/60 dark:bg-gray-800/60 w-fit">
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                <span className="text-xs sm:text-sm font-medium text-foreground">
                                    {activeDays}/7 Days Available
                                </span>
                            </div>

                            {/* Total Slots */}
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm bg-white/60 dark:bg-gray-800/60 w-fit">
                                <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0" />
                                <span className="text-xs sm:text-sm font-medium text-foreground">
                                    {timeSlots.length} Total Slots
                                </span>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 bg-gradient-to-b from-background to-muted/20">

                {/* Add New Time Slot Card */}
                <Card className="group relative border-0 shadow-xl bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50 dark:from-gray-900 dark:via-blue-950/20 dark:to-indigo-950/30 hover:shadow-2xl transition-all duration-500">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-xl" />
                    <CardHeader className="relative pb-0">
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                            <div className="relative flex-shrink-0">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity" />
                                <div className="relative p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                                    <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                </div>
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-xl sm:text-2xl font-bold text-foreground">Add New Time Slot</h3>
                                <p className="text-sm sm:text-base text-muted-foreground mt-1">Schedule your coaching sessions with ease</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="relative p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-10">
                        {/* Time Pickers: Label and Input Side-by-Side */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Start Time */}
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center text-sm sm:text-base font-semibold text-foreground gap-2 whitespace-nowrap">
                                    <span className="inline-block w-2.5 h-2.5 sm:w-3 sm:h-3 bg-blue-500 rounded-full" />
                                    Start Time
                                </label>
                                <TimePicker
                                    value={newSlot.start_time}
                                    onChange={(time) => setNewSlot({ ...newSlot, start_time: time })}
                                    placeholder="Select start time"
                                />
                            </div>

                            {/* End Time */}
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center text-sm sm:text-base font-semibold text-foreground gap-2 whitespace-nowrap">
                                    <span className="inline-block w-2.5 h-2.5 sm:w-3 sm:h-3 bg-purple-500 rounded-full" />
                                    End Time
                                </label>
                                <TimePicker
                                    value={newSlot.end_time}
                                    onChange={(time) => setNewSlot({ ...newSlot, end_time: time })}
                                    placeholder="Select end time"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-center">
                            <Button
                                onClick={handleAddTimeSlot}
                                disabled={loading}
                                className="px-5 sm:px-6 h-10 sm:h-12 text-sm sm:text-base font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg sm:rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-white" />
                                        <span>Adding Time Slot...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                                        <span>Add Time Slot</span>
                                    </div>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Time Slots List */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/50 dark:from-gray-900 dark:via-emerald-950/20 dark:to-teal-950/30">
                    <CardHeader className="pb-0">
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                                <div className="relative flex-shrink-0">
                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl blur opacity-30" />
                                    <div className="relative p-2 sm:p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl">
                                        <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-[20px] sm:text-[24px] lg:text-[28px] font-bold text-foreground leading-snug">Time Slot List</h3>
                                    <p className="text-sm sm:text-base text-muted-foreground mt-1">{timeSlots.length} slots configured • {activeSlots} active</p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                    <div className="px-3 sm:px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-xs sm:text-sm">{activeSlots} Active</span>
                                    </div>
                                    <div className="px-3 sm:px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                                        <span className="text-slate-600 dark:text-slate-400 font-semibold text-xs sm:text-sm">{timeSlots.length - activeSlots} Inactive</span>
                                    </div>
                                </div>

                                {/* Search Bar */}
                                <div className="relative w-full sm:w-80">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                    <Input
                                        placeholder="Search time slots..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 h-10 bg-white/80 dark:bg-gray-800/80 border-emerald-200/70 dark:border-emerald-800/50 rounded-xl focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 transition-all duration-300"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 lg:p-8">
                        {timeSlots.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="relative mx-auto w-32 h-32 mb-6">
                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-gray-800 dark:to-gray-700 rounded-full opacity-50" />
                                    <div className="relative w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center">
                                        <Clock className="w-16 h-16 text-slate-400" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-semibold text-foreground mb-3">No Time Slots Yet</h3>
                                <p className="text-muted-foreground text-lg max-w-md mx-auto">Create your first time slot to get started with scheduling your coaching sessions.</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                                    {visibleSlots.map((slot) => (
                                        <div key={slot.id} className="group relative bg-gradient-to-br from-white to-slate-50/50 dark:from-gray-800 dark:to-gray-900/50 border border-slate-200/60 dark:border-gray-700/60 rounded-xl sm:rounded-2xl p-3 sm:p-4 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] hover:border-emerald-300 dark:hover:border-emerald-600">
                                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                            <div className="relative space-y-3">
                                                {/* Time slot and status badge - side by side */}
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <div className={`relative p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${slot.is_available ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                                                            <Clock className={`w-3 h-3 sm:w-4 sm:h-4 ${slot.is_available ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
                                                        </div>
                                                        <div className="font-bold text-base sm:text-lg text-foreground truncate">
                                                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                                        </div>
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className={`${slot.is_available
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                                                            : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                                                            } font-medium text-xs sm:text-sm flex-shrink-0`}
                                                    >
                                                        {slot.is_available ? "Available" : "Unavailable"}
                                                    </Badge>
                                                </div>

                                                {/* Status switch and delete button - side by side */}
                                                <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200/60 dark:border-gray-700/60">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs sm:text-sm font-medium text-muted-foreground">Status:</span>
                                                        <Switch
                                                            checked={slot.is_available}
                                                            onCheckedChange={(checked) => updateTimeSlot(slot.id, { is_available: checked })}
                                                            className="scale-100 sm:scale-110 data-[state=checked]:bg-emerald-500"
                                                        />
                                                    </div>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setSlotToDelete(slot.id)}
                                                                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-4"
                                                            >
                                                                <Trash className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                                                <span className="sm:inline">Delete</span>
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="rounded-3xl border-0 shadow-2xl">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle className="flex items-center gap-3 text-xl">
                                                                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                                                                        <AlertTriangle className="w-6 h-6 text-red-500" />
                                                                    </div>
                                                                    Delete Time Slot?
                                                                </AlertDialogTitle>
                                                                <AlertDialogDescription className="text-base leading-relaxed">
                                                                    This action cannot be undone. This will permanently delete the time slot <strong className="text-foreground">{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</strong> from your schedule.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter className="gap-3">
                                                                <AlertDialogCancel onClick={() => setSlotToDelete(null)} className="rounded-xl">
                                                                    Cancel
                                                                </AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={confirmDeleteTimeSlot}
                                                                    className="bg-red-600 hover:bg-red-700 rounded-xl"
                                                                >
                                                                    Delete Slot
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* Search Results Info */}
                                {searchQuery && (
                                    <div className="mt-4 text-center">
                                        <p className="text-sm text-muted-foreground">
                                            {filteredTimeSlots.length === 0 ? (
                                                <>No time slots found for "<span className="font-medium text-foreground">{searchQuery}</span>"\</>
                                            ) : (
                                                <>Found {filteredTimeSlots.length} time slot{filteredTimeSlots.length !== 1 ? 's' : ''} for "<span className="font-medium text-foreground">{searchQuery}</span>"</>
                                            )}
                                        </p>
                                    </div>
                                )}

                                {filteredTimeSlots.length > 6 && (
                                    <div className="mt-6 sm:mt-8 text-center">
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowMore(!showMore)}
                                            className="rounded-lg sm:rounded-2xl px-4 sm:px-8 py-2.5 sm:py-3 h-10 sm:h-12 text-sm sm:text-base font-medium border hover:bg-slate-50 dark:hover:bg-gray-800 transition-all duration-200"
                                        >
                                            {showMore ? (
                                                <div className="flex items-center gap-2">
                                                    <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    Show Less
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    <span className="hidden sm:inline">Show More ({filteredTimeSlots.length - 6} more slots)</span>
                                                    <span className="sm:hidden">Show More ({filteredTimeSlots.length - 6})</span>
                                                </div>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Available Days */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-amber-50/30 to-orange-50/50 dark:from-gray-900 dark:via-amber-950/20 dark:to-orange-950/30">
                    <CardHeader className="pb-0">
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                                <div className="relative flex-shrink-0">
                                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl blur opacity-30" />
                                    <div className="relative p-2 sm:p-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl">
                                        <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-xl sm:text-2xl font-bold text-foreground">Available Days</h3>
                                    <p className="text-[13px] sm:text-[15px] lg:text-base text-muted-foreground mt-1 leading-snug sm:leading-normal">Configure your weekly schedule</p>
                                </div>
                            </div>
                            <div className="flex justify-start">
                                <div className="px-3 sm:px-4 py-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                                    <span className="text-amber-700 dark:text-amber-400 font-semibold text-xs sm:text-sm">{activeDays}/7 Days</span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 lg:p-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                            {availableDays.map((day) => (
                                <div key={day.id} className="group relative bg-gradient-to-br from-white to-slate-50/50 dark:from-gray-800 dark:to-gray-900/50 border border-slate-200/60 dark:border-gray-700/60 rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:shadow-md transition-all duration-300 hover:scale-[1.02] hover:border-amber-300 dark:hover:border-amber-600">
                                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                    <div className="relative">
                                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                                <div className={`p-1.5 sm:p-2 rounded-xl flex-shrink-0 ${day.is_available ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                                    <CalendarDays
                                                        className={`w-4 h-4 sm:w-5 sm:h-5 ${day.is_available ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}
                                                        strokeWidth={2}
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-bold text-foreground text-base sm:text-lg truncate">{day.day}</div>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={day.is_available}
                                                onCheckedChange={(checked) => toggleDayAvailability(day.id, checked)}
                                                className="scale-100 sm:scale-110 data-[state=checked]:bg-emerald-500"
                                            />
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={`w-full justify-center ${day.is_available
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                                                : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                                                } font-medium py-1.5 sm:py-2 text-xs sm:text-sm`}
                                        >
                                            {day.is_available ? "Available" : "Unavailable"}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
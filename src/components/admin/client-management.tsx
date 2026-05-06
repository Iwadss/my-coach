import { useState, useEffect } from "react";
import { Plus, Eye, Search, Users, UserCheck, Target, Phone, CalendarDays, User, ChevronDown, ChevronUp, UserPlus, Move, Dumbbell, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, } from "@/components/ui/card";
import { toast } from "sonner";
import {
    Dialog, DialogContent, DialogDescription,
    DialogTitle
} from "@/components/ui/dialog";
import { AdminHeader } from "@/components/admin/admin-header";
import supabase from "@/supabase/supabase";
import RegisterClient from "./client-registration";
import { ClientDetail } from "./client-detail";

interface Client {
    id: string;
    full_name?: string;
    email?: string;
    phone?: string;
    goal?: string;
    created_at: string;
    completed_slots?: number;
    last_completed_at?: string | null;
}

export default function ClientManagement() {
    const [clients, setClients] = useState<Client[]>([]);

    const [searchTerm, setSearchTerm] = useState("");
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [showClientDetail, setShowClientDetail] = useState(false);
    const [isSidebarSearch, setIsSidebarSearch] = useState(false);
    const [showMore, setShowMore] = useState(false);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const { data, error } = await supabase
                .from("clients")
                .select(`
                *,
                client_booking_totals:client_booking_totals(
                    completed_slots,
                    last_completed_at
                )
            `)
                .order("created_at", { ascending: false });

            if (error) throw error;

            setClients(
                (data || []).map((client) => ({
                    ...client,
                    completed_slots: client.client_booking_totals?.completed_slots || 0,
                    last_completed_at: client.client_booking_totals?.last_completed_at || null,
                }))
            );
        } catch (error) {
            console.error("Error fetching clients:", error);
        } finally {
            // Loading complete
        }
    };

    const filteredClients = clients.filter(
        (client) =>
            client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.phone?.includes(searchTerm)
    );

    const visibleClients = showMore ? filteredClients : filteredClients.slice(0, 6);

    const getGoalIcon = (goal: string) => {
        switch (goal.toLowerCase()) {
            case "lean body":
                return <Move className="w-4 h-4 text-sky-500" />;
            case "bulking":
                return <Dumbbell className="w-4 h-4 text-yellow-400" />;
            case "cutting":
                return <Flame className="w-4 h-4 text-red-500" />;
            default:
                return <Target className="w-4 h-4 text-gray-400" />;
        }
    };

    const getGoalColorClasses = (goal: string) => {
        switch (goal.toLowerCase()) {
            case "lean body":
                return "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400";
            case "bulking":
                return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
            case "cutting":
                return "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400";
            default:
                return "bg-gray-100 dark:bg-gray-800/30 text-gray-600 dark:text-gray-400";
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <AdminHeader />

            {/* Enhanced Hero Section */}
            <div className="relative px-4 sm:px-6 py-6 sm:py-8 bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-purple-950/20 dark:via-pink-950/20 dark:to-rose-950/20">
                <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25" />
                <div className="relative">
                    <div className="space-y-4 sm:space-y-6">
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                            <div className="relative flex-shrink-0">
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl sm:rounded-2xl blur-lg opacity-30" />
                                <div className="relative p-2 sm:p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl sm:rounded-2xl">
                                    <User className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                                </div>
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 bg-clip-text text-transparent leading-tight">
                                    Client Management
                                </h1>
                                <p className="text-[13px] sm:text-base lg:text-lg text-muted-foreground leading-snug sm:leading-normal mt-1 sm:mt-2">
                                    Manage your fitness clients and track their progress with precision
                                </p>
                            </div>
                            <div className="flex-shrink-0">
                                <Button
                                    onClick={() => setShowRegisterModal(true)}
                                    className="px-4 sm:px-6 h-10 sm:h-12 text-sm sm:text-base font-medium bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg sm:rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                                >
                                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                    <span className="hidden sm:inline">Register Client</span>
                                    <span className="sm:hidden">Register</span>
                                </Button>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6">
                            {/* Lean Body */}
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm bg-white/60 dark:bg-gray-800/60 w-fit">
                                <Move className="w-4 h-4 text-sky-500 flex-shrink-0" />
                                <span className="text-xs sm:text-sm font-medium text-foreground">
                                    {clients.filter(c => c.goal === 'lean body').length} Lean Body
                                </span>
                            </div>

                            {/* Bulking */}
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm bg-white/60 dark:bg-gray-800/60 w-fit">
                                <Dumbbell className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                                <span className="text-xs sm:text-sm font-medium text-foreground">
                                    {clients.filter(c => c.goal === 'bulking').length} Bulking
                                </span>
                            </div>

                            {/* Cutting */}
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm bg-white/60 dark:bg-gray-800/60 w-fit">
                                <Flame className="w-4 h-4 text-rose-500 flex-shrink-0" />
                                <span className="text-xs sm:text-sm font-medium text-foreground">
                                    {clients.filter(c => c.goal === 'cutting').length} Cutting
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 bg-gradient-to-b from-background to-muted/20">

                {/* Enhanced Search & Filter Card */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-purple-50/30 to-pink-50/50 dark:from-gray-900 dark:via-purple-950/20 dark:to-pink-950/30">
                    <CardHeader className="pb-0">
                        <div className="space-y-4">
                            {/* Title Section */}
                            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                                <div className="relative flex-shrink-0">
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl blur opacity-30" />
                                    <div className="relative p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                                        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                                        Client Overview
                                    </h3>
                                    <p className="text-sm sm:text-base text-muted-foreground mt-1">
                                        Keep track of every client's fitness journey here
                                    </p>
                                </div>
                            </div>

                            {/* Stats + Search Section */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                {/* Left: Total + Showing badges */}
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                    {/* Total Badge */}
                                    <div className="px-3 sm:px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                                        <span className="text-purple-700 dark:text-purple-300 font-semibold text-xs sm:text-sm">
                                            <UserCheck className="inline-block w-4 h-4 mr-1" />
                                            Total: {clients.length}
                                        </span>
                                    </div>

                                    {/* Showing Badge */}
                                    {isSidebarSearch && searchTerm && (
                                        <div className="px-3 sm:px-4 py-2 bg-pink-100 dark:bg-pink-900/30 rounded-full">
                                            <span className="text-pink-700 dark:text-pink-300 font-semibold text-xs sm:text-sm">
                                                <Target className="inline-block w-4 h-4 mr-1" />
                                                Showing: {filteredClients.length}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Right: Search Bar */}
                                <div className="relative w-full sm:w-80">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                    <Input
                                        type="text"
                                        placeholder="Search by name, or phone..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setSearchTerm(value);
                                            setIsSidebarSearch(value.trim() !== "");
                                        }}
                                        className="h-10 pl-10 bg-white/80 dark:bg-gray-800/80 border-purple-200/70 dark:border-purple-800/50 rounded-xl focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all duration-300"
                                    />
                                </div>
                            </div>

                            {/* Search Results Info */}
                            {searchTerm && (
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">
                                        {filteredClients.length === 0 ? (
                                            <>
                                                No clients found for{" "}
                                                <span className="font-medium text-foreground">"{searchTerm}"</span>
                                            </>
                                        ) : (
                                            <>
                                                Found {filteredClients.length} client
                                                {filteredClients.length !== 1 && "s"} for{" "}
                                                <span className="font-medium text-foreground">"{searchTerm}"</span>
                                            </>
                                        )}
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {filteredClients.length === 0 ? (
                            <div className="text-center py-16 px-6">
                                <div className="relative mx-auto w-24 h-24 mb-6">
                                    <div className="absolute inset-0 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full blur opacity-30" />
                                    <div className="relative w-full h-full bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                                        <Users className="w-10 h-10 text-white" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-semibold text-foreground mb-2">
                                    {searchTerm ? 'No matching clients found' : 'No clients registered yet'}
                                </h3>
                                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                    {searchTerm
                                        ? `Try adjusting your search term "${searchTerm}" to find clients.`
                                        : 'Start building your client base by registering new clients.'
                                    }
                                </p>
                                {!searchTerm && (
                                    <Button
                                        onClick={() => setShowRegisterModal(true)}
                                        className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                                    >
                                        <UserCheck className="w-4 h-4 mr-2" />
                                        Register First Client
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                    {visibleClients.map((client, index) => (
                                        <div
                                            key={client.id}
                                            className="group relative bg-gradient-to-br from-white to-slate-50/50 dark:from-gray-800 dark:to-gray-900/50 border border-slate-200/60 dark:border-gray-700/60 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] hover:border-emerald-300 dark:hover:border-emerald-600"
                                            style={{
                                                animationDelay: `${index * 100}ms`
                                            }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                            <div className="relative">
                                                {/* Client Avatar & Name */}
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="relative">
                                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full blur opacity-30" />
                                                        <div className="relative w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
                                                            {client.full_name?.charAt(0).toUpperCase() || 'U'}
                                                        </div>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="font-semibold text-foreground text-lg truncate">
                                                            {client.full_name || 'Unknown Client'}
                                                        </h4>
                                                    </div>
                                                </div>

                                                {/* Goal and Sessions - Side by Side */}
                                                <div className="grid grid-cols-2 gap-3 mb-6">
                                                    {/* Goal */}
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getGoalColorClasses(client.goal || '')}`}>
                                                            {getGoalIcon(client.goal || '')}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Goal</p>
                                                            <p className="text-sm font-medium text-foreground truncate">
                                                                {client.goal || 'No Goal Set'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Sessions */}
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                                            <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Sessions</p>
                                                            <p className="text-sm font-medium text-foreground truncate">
                                                                {client.completed_slots}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Client Details */}
                                                <div className="mb-6">
                                                    {/* Phone and Last Session - Side by Side */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {/* Phone */}
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                <Phone className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Phone</p>
                                                                <p className="text-sm font-medium text-foreground truncate">
                                                                    {client.phone || 'Not provided'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Last Session */}
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                <CalendarDays className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Last Session</p>
                                                                <p className="text-sm font-medium text-foreground truncate">
                                                                    {client.last_completed_at
                                                                        ? new Date(client.last_completed_at).toLocaleDateString('en-GB', {
                                                                            year: 'numeric',
                                                                            month: 'short',
                                                                            day: 'numeric'
                                                                        })
                                                                        : 'No sessions yet'
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action Button */}
                                                <div className="pt-4 border-t border-slate-200/60 dark:border-gray-700/60">
                                                    <Button
                                                        onClick={() => {
                                                            setSelectedClient(client);
                                                            setShowClientDetail(true);
                                                        }}
                                                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg sm:rounded-xl py-2.5 sm:py-3 px-4 font-medium transition-all duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                        View Details
                                                    </Button>
                                                </div>
                                            </div>

                                        </div>
                                    ))}
                                </div>

                                {/* Show More/Less Button */}
                                {filteredClients.length > 6 && (
                                    <div className="flex justify-center mt-8">
                                        <Button
                                            onClick={() => setShowMore(!showMore)}
                                            variant="outline"
                                            className="px-6 py-3 bg-white/80 dark:bg-gray-800/80 border-purple-200/70 dark:border-purple-800/50 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:border-purple-300 dark:hover:border-purple-700 text-purple-700 dark:text-purple-300 font-medium rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-sm hover:shadow-md"
                                        >
                                            {showMore ? (
                                                <>
                                                    <ChevronUp className="w-4 h-4 mr-2" />
                                                    Show Less
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown className="w-4 h-4 mr-2" />
                                                    Show More ({filteredClients.length - 6} more)
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Register Client Modal */}
                <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
                    <DialogContent className="sm:max-w-[500px] p-0 overflow-y-auto max-h-[90vh] border-0 shadow-2xl bg-white dark:bg-gray-900 rounded-xl">
                        {/* Modal Header */}
                        <div className="relative px-6 py-6 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600">
                            <div className="relative flex items-center gap-4">
                                <div className="relative">
                                    <div className="relative w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                        <UserPlus className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <DialogTitle className="text-xl font-bold text-white mb-1">
                                        Register New Client
                                    </DialogTitle>
                                    <DialogDescription className="text-white/80 text-sm">
                                        Add a new client to your fitness coaching program
                                    </DialogDescription>
                                </div>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="relative">
                            <RegisterClient closeModal={() => setShowRegisterModal(false)} />
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Client Detail Modal */}
                <ClientDetail
                    client={selectedClient}
                    isOpen={showClientDetail}
                    onClose={() => {
                        setShowClientDetail(false);
                        setSelectedClient(null);
                    }}
                    onUpdate={async (updatedClient) => {
                        const toastId = toast.loading("⏳ Updating client info...");

                        try {
                            const { error } = await supabase
                                .from("clients")
                                .update({
                                    full_name: updatedClient.full_name,
                                    email: updatedClient.email,
                                    phone: updatedClient.phone,
                                    goal: updatedClient.goal,
                                })
                                .eq("id", updatedClient.id);

                            toast.dismiss(toastId);

                            if (error) {
                                console.error("Error updating client:", error);
                                toast.error("❌ Failed to update client", {
                                    description: error.message || "Please try again.",
                                    className: "toast-error",
                                    duration: 5000,
                                });
                                return;
                            }

                            setClients((clients) =>
                                clients.map((c) => (c.id === updatedClient.id ? updatedClient : c))
                            );

                            toast.success("✅ Client updated", {
                                description: `${updatedClient.full_name}'s information has been saved.`,
                                className: "toast-success",
                                duration: 4000,
                            });
                        } catch (err) {
                            toast.dismiss(toastId);
                            console.error("Unexpected error:", err);
                            toast.error("❌ Unexpected error", {
                                description: "Something went wrong while updating the client.",
                                className: "toast-error",
                                duration: 5000,
                            });
                        }
                    }}
                    onDelete={async (clientId) => {
                        const toastId = toast.loading("⏳ Deleting client...");

                        try {
                            const { error } = await supabase
                                .from("clients")
                                .delete()
                                .eq("id", clientId);

                            toast.dismiss(toastId);

                            if (error) {
                                console.error("Error deleting client:", error);
                                toast.error("❌ Failed to delete client", {
                                    description: error.message || "Please try again.",
                                    className: "toast-error",
                                    duration: 5000,
                                });
                                return;
                            }

                            // Remove from local state only after successful database deletion
                            setClients((clients) => clients.filter((c) => c.id !== clientId));

                            toast.success("✅ Client deleted", {
                                description: "The client has been successfully removed.",
                                className: "toast-success",
                                duration: 4000,
                            });
                        } catch (err) {
                            toast.dismiss(toastId);
                            console.error("Unexpected error:", err);
                            toast.error("❌ Unexpected error", {
                                description: "Something went wrong while deleting the client.",
                                className: "toast-error",
                                duration: 5000,
                            });
                        }
                    }}
                />
            </div>
        </div>
    );
}
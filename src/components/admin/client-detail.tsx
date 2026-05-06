// src/components/admin/client-detail.tsx
import { useState, useEffect } from "react";
import { Edit, Trash2, Mail, Phone, Target, CheckCircle, Clock, TrendingUp, Award, Activity, UserCheck, Zap, Star, Shield, Move, Dumbbell, Flame } from "lucide-react";
import { ClientEdit } from "./client-edit";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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

interface ClientDetailProps {
    client: Client | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (client: Client) => void;
    onDelete: (clientId: string) => void;
}

export const ClientDetail: React.FC<ClientDetailProps> = ({ client, isOpen, onClose, onUpdate, onDelete }) => {
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    useEffect(() => {
        // Reset edit dialog state when main dialog closes
        if (!isOpen) {
            setIsEditDialogOpen(false);
        }
    }, [isOpen]);

    if (!client) return null;

    const handleEditSave = (updatedClient: Client) => {
        onUpdate(updatedClient);
        setIsEditDialogOpen(false);
    };

    const handleDelete = () => {
        onDelete(client.id);
        onClose();
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const day = date.getDate();
        const month = date.toLocaleDateString('en-US', { month: 'long' });
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    };

    const formatLastCompleted = (dateString: string | null) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        const now = new Date();

        // Check if it's the same day
        const isToday = date.toDateString() === now.toDateString();
        if (isToday) return 'Today';

        // Check if it's yesterday
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();
        if (isYesterday) return 'Yesterday';

        // Calculate days difference for other cases
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 7) return `${diffDays} days ago`;
        if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
        return formatDate(dateString);
    };

    const getCompletionStatus = (completedSlots: number) => {
        if (completedSlots === 0) return { color: 'text-gray-500', bg: 'bg-gray-100', label: 'Getting Started' };
        if (completedSlots <= 5) return { color: 'text-blue-600', bg: 'bg-blue-100', label: 'Beginner' };
        if (completedSlots <= 15) return { color: 'text-green-600', bg: 'bg-green-100', label: 'Regular' };
        if (completedSlots <= 30) return { color: 'text-purple-600', bg: 'bg-purple-100', label: 'Committed' };
        return { color: 'text-orange-600', bg: 'bg-orange-100', label: 'Elite' };
    };

    const getGoalBadgeVariant = (goal: string) => {
        switch (goal.toLowerCase()) {
            case "bulking":
                return "bg-gradient-to-r from-yellow-400 to-amber-500 text-white border-0 shadow-lg hover:shadow-xl";
            case "cutting":
                return "bg-gradient-to-r from-red-500 to-rose-500 text-white border-0 shadow-lg hover:shadow-xl";
            case "lean body":
                return "bg-gradient-to-r from-sky-500 to-blue-400 text-white border-0 shadow-lg hover:shadow-xl";
            default:
                return "bg-gradient-to-r from-gray-500 to-slate-500 text-white border-0 shadow-lg hover:shadow-xl";
        }
    };

    const getGoalIcon = (goal: string) => {
        switch (goal.toLowerCase()) {
            case "bulking":
                return <Dumbbell className="w-4 h-4" />;
            case "cutting":
                return <Flame className="w-4 h-4" />;
            case "lean body":
                return <Move className="w-4 h-4" />;
            default:
                return <Target className="w-4 h-4" />;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                aria-describedby={undefined}
                className="w-[95vw] max-w-[768px] h-[90vh] max-h-[900px] sm:w-[90vw] sm:h-[85vh] md:w-[700px] lg:w-[720px] xl:w-[768px] rounded-2xl overflow-hidden p-0 bg-gradient-to-br from-white via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-950 dark:to-pink-950"
            >
                <DialogTitle className="sr-only">
                    {client.full_name || "Client Detail"}
                </DialogTitle>
                {/* Enhanced Header with Gradient Background */}
                <div className="relative px-6 py-7 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 rounded-2xl overflow-hidden">
                    {/* Soft overlay */}
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />

                    {/* Main content */}
                    <div className="relative z-10 flex flex-col gap-6">
                        {/* Avatar & Info */}
                        <div className="flex items-center gap-5">
                            {/* Avatar */}
                            <div className="relative">
                                <div className="absolute inset-0 bg-white/40 rounded-full blur-sm" />
                                <div className="relative w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                                    <span className="text-white font-bold text-2xl">
                                        {client.full_name?.charAt(0).toUpperCase() || 'U'}
                                    </span>
                                </div>
                            </div>

                            {/* Info & Badges */}
                            <div className="text-white space-y-1">
                                <h2 className="text-2xl font-bold leading-tight">
                                    {client.full_name || 'Unknown Client'}
                                </h2>
                                <p className="text-white/80 text-sm">
                                    Member Since {formatDate(client.created_at)}
                                </p>

                                {/* Badges */}
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {/* Fitness Goal Badge */}
                                    <Badge
                                        className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-bold rounded-full hover:shadow-xl transition-all duration-300 backdrop-blur-sm ${getGoalBadgeVariant(client.goal || 'Not set')}`}
                                    >
                                        {getGoalIcon(client.goal || '')}
                                        {client.goal || 'Not set'}
                                    </Badge>

                                    {/* Level Badge */}
                                    <Badge
                                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-500 border-0 shadow-lg rounded-full hover:shadow-xl transition-all duration-300 backdrop-blur-sm"
                                    >
                                        {(() => {
                                            const status = getCompletionStatus(client.completed_slots || 0);
                                            const icons = {
                                                'Getting Started': Activity,
                                                'Beginner': Zap,
                                                'Regular': TrendingUp,
                                                'Committed': Award,
                                                'Elite': Star,
                                            };
                                            const Icon = icons[status.label as keyof typeof icons] || Activity;
                                            return (
                                                <>
                                                    <Icon className="w-4 h-4" />
                                                    {status.label}
                                                </>
                                            );
                                        })()}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex justify-end gap-2 flex-wrap">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEditDialogOpen(true)}
                                className="bg-white/20 border-white/30 text-white hover:bg-white/30 hover:border-white/50 backdrop-blur-sm"
                            >
                                <Edit className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">Edit Profile</span>
                                <span className="sm:hidden">Edit</span>
                            </Button>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="bg-red-500/80 hover:bg-red-600 border-0 text-white"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        <span className="hidden sm:inline">Delete</span>
                                        <span className="sm:hidden">Delete</span>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-white dark:bg-gray-900">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                                            <Shield className="h-5 w-5" />
                                            Delete Client Account
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="text-base">
                                            This will permanently delete <strong>{client.full_name}</strong>'s account and all associated data. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="hover:bg-gray-100 dark:hover:bg-gray-800">
                                            Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleDelete}
                                            className="bg-red-600 hover:bg-red-700 text-white"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete Permanently
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content Area */}
                <div className="overflow-y-auto max-h-[calc(95vh-120px)] px-6 pb-6">
                    {isEditDialogOpen ? (
                        <div className="pt-6">
                            <ClientEdit
                                client={client}
                                onSave={handleEditSave}
                                onCancel={() => setIsEditDialogOpen(false)}
                            />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Client Overview */}
                            <Card className="border-0 bg-gradient-to-br from-white via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-950 shadow-xl rounded-2xl backdrop-blur-sm">
                                <CardHeader className="pb-2">
                                    <div className="grid grid-cols-[auto_1fr] gap-4 items-center">
                                        {/* Icon on the left */}
                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg flex items-center justify-center">
                                            <UserCheck className="w-6 h-6 text-white" />
                                        </div>

                                        {/* Right side: title + badges */}
                                        <div className="space-y-2">
                                            {/* Title */}
                                            <h2 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600">
                                                Client Overview
                                            </h2>

                                            {/* Badges */}
                                            <div className="flex flex-wrap gap-3">
                                                {/* Sessions Badge */}
                                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500 text-white shadow-md hover:shadow-lg transition-all duration-300">
                                                    <CheckCircle className="h-4 w-4" />
                                                    <span className="text-sm font-semibold">
                                                        {client.completed_slots || 0} Sessions
                                                    </span>
                                                </div>

                                                {/* Last Session Badge */}
                                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500 text-white shadow-md hover:shadow-lg transition-all duration-300">
                                                    <Clock className="h-4 w-4" />
                                                    <span className="text-sm font-semibold">
                                                        {client.last_completed_at ? formatLastCompleted(client.last_completed_at) : 'Never'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="pt-4">
                                    <div className="grid grid-cols-1 gap-4">
                                        {/* Email Card */}
                                        <div className="group p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/20 border border-blue-200/50 dark:border-blue-700/30 hover:shadow-lg transition-all duration-300 backdrop-blur-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 shadow-md group-hover:shadow-lg transition-shadow duration-300">
                                                    <Mail className="h-5 w-5 text-white" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Email</p>
                                                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 truncate">
                                                        {client.email || 'Not provided'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Phone Card */}
                                        <div className="group p-4 rounded-xl bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/20 border border-purple-200/50 dark:border-purple-700/30 hover:shadow-lg transition-all duration-300 backdrop-blur-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 shadow-md group-hover:shadow-lg transition-shadow duration-300">
                                                    <Phone className="h-5 w-5 text-white" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">Phone</p>
                                                    <p className="text-sm font-semibold text-purple-800 dark:text-purple-300 truncate">
                                                        {client.phone || 'Not provided'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-0 bg-gradient-to-br from-white via-green-50 to-emerald-100 dark:from-gray-900 dark:via-green-900/20 dark:to-emerald-950 shadow-xl rounded-2xl">
                                <CardHeader className="pb-2">
                                    <div className="grid grid-cols-[auto_1fr] gap-4 items-center">
                                        {/* Left: Icon */}
                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-inner flex items-center justify-center">
                                            <TrendingUp className="h-6 w-6 text-white" />
                                        </div>

                                        {/* Right: Title (top) + Status (bottom) */}
                                        <div className="space-y-2">
                                            {/* Title */}
                                            <h2 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">
                                                Training Progress
                                            </h2>

                                            {/* Activity Status */}
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className={`w-3 h-3 rounded-full ${client.last_completed_at &&
                                                        new Date(client.last_completed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                                                        ? 'bg-green-500 animate-pulse'
                                                        : 'bg-gray-400'
                                                        }`}
                                                />
                                                <span className="text-sm font-semibold text-muted-foreground">
                                                    {client.last_completed_at &&
                                                        new Date(client.last_completed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                                                        ? 'Active'
                                                        : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-4">
                                    <div className="grid grid-cols-1 gap-6">
                                        {/* Sessions Progress */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-muted-foreground">Sessions Completed</span>
                                                <span className="text-lg font-bold text-green-700 dark:text-green-400">
                                                    {client.completed_slots || 0} / 50
                                                </span>
                                            </div>
                                            <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                                                <div
                                                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-1000 ease-out"
                                                    style={{
                                                        width: `${Math.min(((client.completed_slots || 0) / 50) * 100, 100)}%`
                                                    }}
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                You're {Math.min(((client.completed_slots || 0) / 50) * 100, 100).toFixed(0)}% closer to the goal
                                            </p>
                                        </div>

                                    </div>
                                </CardContent>
                            </Card>


                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
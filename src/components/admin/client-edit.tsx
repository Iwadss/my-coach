// src/components/admin/client-edit.tsx
import { useState, useEffect } from "react";
import { Edit, User, Mail, Phone, Target, Save, X, Move, Dumbbell, Flame } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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

interface ClientEditProps {
    client: Client;
    onSave: (client: Client) => void;
    onCancel: () => void;
}

export const ClientEdit: React.FC<ClientEditProps> = ({ client, onSave, onCancel }) => {
    const [editForm, setEditForm] = useState<Client>(client);

    useEffect(() => {
        setEditForm(client);
    }, [client]);

    const handleSave = () => {
        onSave(editForm);
    };

    const handleCancel = () => {
        setEditForm(client);
        onCancel();
    };

    return (
        <div className="space-y-6">
            {/* Enhanced Edit Form with Client Detail Styling */}
            <Card className="border-0 bg-gradient-to-br from-white via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-950 shadow-xl rounded-2xl backdrop-blur-sm">
                <CardHeader className="pb-2">
                    <div className="grid grid-cols-[auto_1fr] gap-4 items-center">
                        {/* Icon on the left */}
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg flex items-center justify-center">
                            <Edit className="w-6 h-6 text-white" />
                        </div>

                        {/* Right side: title */}
                        <div className="space-y-2">
                            {/* Title */}
                            <h2 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600">
                                Edit Client Information
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Update client details and preferences
                            </p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-4">
                    <div className="grid grid-cols-1 gap-6">
                        {/* Full Name Field */}
                        <div className="group p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/20 border border-blue-200/50 dark:border-blue-700/30 hover:shadow-lg transition-all duration-300 backdrop-blur-sm">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 shadow-md group-hover:shadow-lg transition-shadow duration-300">
                                        <User className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Full Name</p>
                                        <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Client's complete name</p>
                                    </div>
                                </div>
                                <Input
                                    id="name"
                                    value={editForm.full_name || ''}
                                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                    placeholder="Enter client's full name"
                                    className="h-12 text-base bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-blue-200/50 dark:border-blue-800/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all duration-300 shadow-sm hover:shadow-md"
                                />
                            </div>
                        </div>

                        {/* Email Field */}
                        <div className="group p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/20 border border-emerald-200/50 dark:border-emerald-700/30 hover:shadow-lg transition-all duration-300 backdrop-blur-sm">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md group-hover:shadow-lg transition-shadow duration-300">
                                        <Mail className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Email Address</p>
                                        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Contact email for communication</p>
                                    </div>
                                </div>
                                <Input
                                    id="email"
                                    type="email"
                                    value={editForm.email || ''}
                                    readOnly
                                    placeholder="client@example.com"
                                    className="h-12 text-base bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-sm border-emerald-200/50 dark:border-emerald-800/50 rounded-xl cursor-not-allowed transition-all duration-300 shadow-sm"
                                />
                            </div>
                        </div>

                        {/* Phone Field */}
                        <div className="group p-4 rounded-xl bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/20 border border-purple-200/50 dark:border-purple-700/30 hover:shadow-lg transition-all duration-300 backdrop-blur-sm">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 shadow-md group-hover:shadow-lg transition-shadow duration-300">
                                        <Phone className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">Phone Number</p>
                                        <p className="text-sm font-semibold text-purple-800 dark:text-purple-300">Primary contact number</p>
                                    </div>
                                </div>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={editForm.phone || ''}
                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                    placeholder="+1 (555) 123-4567"
                                    className="h-12 text-base bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-purple-200/50 dark:border-purple-800/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition-all duration-300 shadow-sm hover:shadow-md"
                                />
                            </div>
                        </div>

                        {/* Fitness Goal Field */}
                        <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/20 border border-orange-200/50 dark:border-orange-700/30 hover:shadow-lg transition-all duration-300 backdrop-blur-sm">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 shadow-md group-hover:shadow-lg transition-shadow duration-300">
                                        <Target className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide">Fitness Goal</p>
                                        <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">Primary training objective</p>
                                    </div>
                                </div>
                                <Select
                                    value={editForm.goal || ''}
                                    onValueChange={(value) => setEditForm({ ...editForm, goal: value })}
                                >
                                    <SelectTrigger className="w-full h-12 text-base bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-orange-200/50 dark:border-orange-800/50 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-400 transition-all duration-300 shadow-sm hover:shadow-md">
                                        <SelectValue placeholder="Choose fitness goal" />
                                    </SelectTrigger>

                                    <SelectContent className="w-full rounded-xl border-orange-200/50 dark:border-orange-800/50 backdrop-blur-xl bg-white/95 dark:bg-gray-800/95">
                                        <SelectItem value="lean body" className="rounded-lg text-base py-3 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                                            <div className="flex items-center gap-2">
                                                <Move className="w-4 h-4 text-blue-500" />
                                                <span>Lean Body</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="bulking" className="rounded-lg text-base py-3 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                                            <div className="flex items-center gap-2">
                                                <Dumbbell className="w-4 h-4 text-yellow-500" />
                                                <span>Bulking</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="cutting" className="rounded-lg text-base py-3 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                                            <div className="flex items-center gap-2">
                                                <Flame className="w-4 h-4 text-red-500" />
                                                <span>Cutting</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    className="bg-white/20 border-white/30 text-white hover:bg-white/30 hover:border-white/50 backdrop-blur-sm"
                >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                </Button>
                <Button
                    size="sm"
                    onClick={handleSave}
                    className="bg-green-500/80 hover:bg-green-600 text-white border-0"
                >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                </Button>
            </div>
        </div>
    );
};
'use client';

import { Search, Bell, Settings, User, LogOut, AlertTriangle, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { NotificationBell } from '../layout/NotificationBell';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { getSiteSettings } from '@/lib/data';
import { toggleMaintenanceMode } from '@/app/actions/admin';
import { useToast } from '@/hooks/use-toast';

interface AdminHeaderProps {
    onMenuClick?: () => void;
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
    const [isMaintenance, setIsMaintenance] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        async function fetchSettings() {
            const settings = await getSiteSettings();
            setIsMaintenance(settings.maintenance_mode);
        }
        fetchSettings();
    }, []);

    const handleToggleMaintenance = async (checked: boolean) => {
        setLoading(true);
        try {
            const result = await toggleMaintenanceMode(checked);
            if (result.status === 'success') {
                setIsMaintenance(checked);
                toast({
                    title: result.message,
                    variant: checked ? "destructive" : "default",
                });
            } else {
                toast({
                    title: "Erreur",
                    description: result.message,
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Erreur",
                description: "Une erreur est survenue.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 lg:gap-4 border-b bg-background/60 backdrop-blur-xl px-3 lg:px-8">
            <div className="flex flex-1 items-center gap-2 lg:gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onMenuClick}
                    className="lg:hidden rounded-xl hover:bg-primary/5 h-9 w-9"
                >
                    <Menu className="h-5 w-5" />
                </Button>

                <div className="lg:hidden font-bold tracking-tight truncate max-w-[100px] xs:max-w-none text-sm">
                    Admin Suite
                </div>
                <div className="relative w-full max-w-sm hidden md:block">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Recherche globale (entreprises, avis, users)..."
                        className="pl-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary/20 rounded-xl h-10"
                    />
                </div>
            </div>

            <div className="flex items-center gap-1.5 xs:gap-3 lg:gap-6">
                {/* Quick Maintenance Toggle */}
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-border/50 transition-all hover:bg-slate-200 dark:hover:bg-slate-700">
                    <div className={isMaintenance ? "text-amber-500 animate-pulse" : "text-slate-400"}>
                        <AlertTriangle className="h-3.5 w-3.5" />
                    </div>
                    <Label htmlFor="maintenance-mode" className="hidden sm:block text-[10px] font-black uppercase tracking-widest cursor-pointer whitespace-nowrap">
                        {isMaintenance ? "Maint." : "Public"}
                    </Label>
                    <Switch
                        id="maintenance-mode"
                        checked={isMaintenance}
                        onCheckedChange={handleToggleMaintenance}
                        disabled={loading}
                        className="scale-75 data-[state=checked]:bg-amber-500"
                    />
                </div>

                <div className="h-6 w-[1px] bg-border/50 hidden sm:block" />

                <div className="flex items-center gap-1.5 xs:gap-2 lg:gap-4">
                    <ThemeToggle />
                    <NotificationBell />

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-9 w-9 lg:h-10 lg:w-10 rounded-full border border-border/50 p-0 overflow-hidden ring-offset-background transition-all hover:ring-2 hover:ring-primary/20">
                                <Avatar className="h-full w-full">
                                    <AvatarImage src="" alt="Admin" />
                                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-bold">
                                        AD
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 mt-2 rounded-xl" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal p-4">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-bold leading-none">Administrateur</p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        admin@avis.ma
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="p-3 cursor-pointer rounded-lg mx-1 focus:bg-primary/5">
                                <User className="mr-2 h-4 w-4" />
                                <span>Mon Profil</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="p-3 cursor-pointer rounded-lg mx-1 focus:bg-primary/5">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Paramètres</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="p-3 cursor-pointer rounded-lg mx-1 text-destructive focus:bg-destructive/5 focus:text-destructive">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Déconnexion</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}

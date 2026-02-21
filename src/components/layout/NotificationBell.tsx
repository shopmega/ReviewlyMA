'use client';

import { useState, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getNotifications, markAsRead, markAllAsRead, Notification } from '@/app/actions/notifications';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    const fetchNotifications = async () => {
        const data = await getNotifications();
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read && n.user_id !== null).length);
    };

    // Initial fetch and poller
    useEffect(() => {
        fetchNotifications();

        // Poll every 60 seconds
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleNotificationClick = async (n: Notification) => {
        if (!n.is_read && n.user_id !== null) {
            await markAsRead(n.id);
            // Optimistic update
            setNotifications(prev => prev.map(item =>
                item.id === n.id ? { ...item, is_read: true } : item
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }

        if (n.link) {
            setIsOpen(false);
            router.push(n.link);
        }
    };

    const handleMarkAllRead = async () => {
        await markAllAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background animate-pulse" />
                    )}
                    <span className="sr-only">Notifications</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium leading-none">Notifications</p>
                            {unreadCount > 0 && (
                                <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary" onClick={handleMarkAllRead}>
                                    Tout marquer comme lu
                                </Button>
                            )}
                        </div>
                        <p className="text-xs leading-none text-muted-foreground">
                            {unreadCount} non lues
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                            Aucune notification
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <DropdownMenuItem
                                key={n.id}
                                className={cn(
                                    "flex flex-col items-start p-4 cursor-pointer focus:bg-accent",
                                    !n.is_read && n.user_id !== null && "bg-accent/40"
                                )}
                                onClick={() => handleNotificationClick(n)}
                            >
                                <div className="flex w-full justify-between items-start gap-2">
                                    <div className="font-medium text-sm leading-tight mb-1">
                                        {n.title}
                                        {!n.is_read && n.user_id !== null && <span className="ml-2 inline-block w-1.5 h-1.5 bg-primary rounded-full align-middle" />}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                    {n.message}
                                </p>
                            </DropdownMenuItem>
                        ))
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

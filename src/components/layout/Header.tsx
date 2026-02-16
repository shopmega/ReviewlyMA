'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { LayoutDashboard, Store, User, LogOut, Search, MapPin, Sparkles, ChevronDown, Menu, X, Bell, Heart, Briefcase, Building2, UserCircle, Home, BookOpen, Pencil, Settings, ChevronRight, Info } from 'lucide-react';
import { isPaidTier } from '@/lib/tier-utils';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '../shared/ThemeToggle';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';
import { createClient } from '@/lib/supabase/client';
import { getSiteSettings, SiteSettings } from '@/lib/data';
import { useBusiness } from '@/contexts/BusinessContext';
import { NotificationBell } from './NotificationBell';

const navLinks = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/businesses', label: 'Établissements', icon: Search },
  { href: '/categories', label: 'Catégories', icon: BookOpen },
  { href: '/villes', label: 'Villes', icon: MapPin },
  { href: '/pour-les-pros', label: 'Pour les pros', icon: Briefcase },
];

export function Header({ settings }: { settings: SiteSettings }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentBusiness, isMultiBusiness, isLoading: businessLoading } = useBusiness();

  // Handle scroll effect for transparent header on home
  const [isScrolled, setIsScrolled] = useState(false);
  const isHome = pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [hasClaim, setHasClaim] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const siteName = settings.site_name || 'CityGuide App';

  useEffect(() => {
    const supabase = createClient();

    // Check active session and fetch profile/claims
    const fetchData = async (userId: string) => {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
      setProfile(profileData);

      if (profileData?.role === 'user') {
        const { data: claims } = await supabase.from('business_claims').select('id').eq('user_id', userId).limit(1);
        setHasClaim(!!(claims && claims.length > 0));
      }
    };

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchData(user.id);
      }
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      if (newUser) {
        fetchData(newUser.id);
      } else {
        setProfile(null);
        setHasClaim(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdminRoute = pathname.startsWith('/admin');
  const isDashboard = pathname.startsWith('/dashboard');
  const isMaintenance = pathname === '/maintenance';

  // Admin routes and maintenance page don't show the main Header
  if (isAdminRoute || isMaintenance) {
    return null;
  }

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (isDashboard) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-border">
        <div className="container flex h-16 items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2 hover:opacity-80 transition-opacity">
            {settings.site_logo_url ? (
              <img src={settings.site_logo_url} alt={siteName} className="h-8 w-auto" />
            ) : (
              <span className="font-bold text-xl tracking-tight font-headline text-foreground">
                {siteName.includes(' ') ? (
                  <>
                    {siteName.substring(0, siteName.lastIndexOf(' '))} <span className="text-primary">{siteName.substring(siteName.lastIndexOf(' ') + 1)}</span>
                  </>
                ) : (
                  siteName
                )}
              </span>
            )}
          </Link>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <NotificationBell />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-border p-0 overflow-hidden shadow-sm">
                  <Avatar className="h-full w-full">
                    <AvatarImage src={profile?.avatar_url || ""} alt="User" />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">{profile?.full_name?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2 rounded-xl border-border">
                <DropdownMenuLabel className="mb-2 px-2">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground leading-none">{profile?.full_name || 'Utilisateur'}</p>
                      {profile?.tier === 'gold' && (
                        <Badge variant="success" className="h-4 px-1 text-[8px] font-bold">GOLD</Badge>
                      )}
                      {profile?.tier === 'growth' && (
                        <Badge variant="secondary" className="h-4 px-1 text-[8px] font-bold">GROWTH</Badge>
                      )}
                    </div>
                    <p className="text-xs leading-none text-muted-foreground font-medium">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(profile?.role === 'pro' || profile?.role === 'admin') && (
                  <DropdownMenuItem asChild className="rounded-lg">
                    <Link href="/dashboard" className="flex items-center">
                      <LayoutDashboard className="mr-2 h-4 w-4 text-primary" />
                      <span>Tableau de bord {profile?.tier === 'gold' ? 'gold' : ''}</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                {profile?.role === 'admin' && (
                  <DropdownMenuItem asChild className="rounded-lg text-destructive focus:text-destructive focus:bg-destructive/10">
                    <Link href="/admin" className="flex items-center">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Administration</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild className="rounded-lg mt-1">
                  <Link href="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Mon Profil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="rounded-lg text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    );
  }

  // Dynamic Header Classes
  const headerClasses = cn(
    "sticky top-0 z-50 w-full transition-all duration-300",
    isHome && !isScrolled
      ? "bg-transparent border-transparent py-4 text-foreground" // Added text-foreground to ensure visibility
      : "glass border-b border-white/10 py-2 text-foreground"
  );

  return (
    <header className={headerClasses}>
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo Section */}
        <Link href="/" className="flex items-center space-x-2 group shrink-0">
          {settings.site_logo_url ? (
            <img src={settings.site_logo_url} alt={siteName} className="h-10 w-auto transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <div className="flex flex-col">
              <span className="font-bold text-2xl tracking-tighter font-headline text-foreground leading-none group-hover:text-primary transition-colors duration-300">
                {siteName.split(' ')[0]}
                {siteName.split(' ').length > 1 && (
                  <span className="text-primary ml-1">{siteName.split(' ').slice(1).join(' ')}</span>
                )}
              </span>
            </div>
          )}
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center justify-center flex-1">
          <nav className="flex items-center gap-1 bg-secondary/30 backdrop-blur-md px-2 py-1.5 rounded-full border border-white/10 shadow-inner">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium px-5 py-2 rounded-full transition-all duration-300 relative overflow-hidden',
                  (pathname.startsWith(link.href) && link.href !== '/') || pathname === link.href
                    ? 'bg-background text-primary shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center justify-end gap-3 shrink-0">
          <div className="hidden md:flex">
            <Button asChild variant="outline" className="rounded-full border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/50 transition-all font-medium">
              <Link href="/review">
                <Pencil className="mr-2 h-4 w-4" />
                Écrire un avis
              </Link>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {user && <NotificationBell />}
            <ThemeToggle />

            {/* Mobile menu trigger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 hover:bg-accent">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[310px] sm:w-[350px] border-l border-white/10 glass p-0 overflow-hidden">
                <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
                <SheetDescription className="sr-only">Accédez aux différentes sections du site depuis ce menu mobile.</SheetDescription>

                <div className="flex flex-col h-full bg-background/95 backdrop-blur-xl">
                  {/* Drawer Header */}
                  <div className="px-6 py-8 border-b border-border/50 bg-gradient-to-br from-primary/10 via-transparent to-transparent">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <Store className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold font-headline text-foreground leading-none">{siteName}</h2>
                        <p className="text-xs text-muted-foreground mt-1.5 font-medium">Guide & Avis Entreprises</p>
                      </div>
                    </div>

                    {user ? (
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                        <Avatar className="h-10 w-10 border border-primary/20">
                          <AvatarImage src={profile?.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{profile?.full_name || 'Utilisateur'}</p>
                          <p className="text-[10px] text-muted-foreground truncate opacity-70">{user.email}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" asChild>
                          <Link href="/dashboard/settings"><Settings className="w-4 h-4" /></Link>
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground font-medium px-1 italic">Explorez les meilleures adresses du Maroc.</p>
                    )}
                  </div>

                  {/* Navigation Links */}
                  <div className="flex-1 overflow-y-auto pt-4 pb-6 px-4 custom-scrollbar">
                    <nav className="flex flex-col gap-1.5">
                      <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-2">Navigation</p>
                      {navLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                              "flex items-center justify-between p-3.5 rounded-2xl text-sm font-semibold transition-all group",
                              isActive
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                            )}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                                isActive ? "bg-white/20" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white"
                              )}>
                                <Icon className="w-4.5 h-4.5" />
                              </div>
                              <span>{link.label}</span>
                            </div>
                            <ChevronRight className={cn("w-4 h-4 opacity-50 transition-transform group-hover:translate-x-1", isActive && "opacity-100")} />
                          </Link>
                        );
                      })}
                    </nav>

                    <div className="mt-8 space-y-4 px-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Plus</p>
                      <Link href="/about" className="flex items-center gap-3 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors py-1">
                        <Info className="w-4 h-4" />
                        À propos
                      </Link>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="p-6 border-t border-border/50 bg-secondary/10 backdrop-blur-md">
                    <div className="grid gap-3">
                      <Button asChild className="w-full h-12 rounded-xl text-sm font-bold shadow-xl shadow-primary/20 group overflow-hidden relative" onClick={() => setMobileMenuOpen(false)}>
                        <Link href="/review">
                          <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-600 to-primary group-hover:scale-110 transition-transform duration-500 opacity-90" />
                          <span className="relative flex items-center justify-center gap-2">
                            <Pencil className="h-4 w-4" />
                            Donner mon avis
                          </span>
                        </Link>
                      </Button>

                      {!user ? (
                        <div className="grid grid-cols-2 gap-3">
                          <Button variant="outline" asChild className="h-11 rounded-xl border-border/50 font-bold text-xs" onClick={() => setMobileMenuOpen(false)}>
                            <Link href="/login">Connexion</Link>
                          </Button>
                          <Button variant="secondary" asChild className="h-11 rounded-xl font-bold text-xs bg-white text-black hover:bg-slate-100 shadow-sm" onClick={() => setMobileMenuOpen(false)}>
                            <Link href="/signup">S'inscrire</Link>
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" className="h-11 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/5 font-bold text-xs" onClick={async () => {
                          const supabase = createClient();
                          await supabase.auth.signOut();
                          window.location.reload();
                        }}>
                          <LogOut className="h-4 w-4 mr-2" />
                          Déconnexion
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 border border-border/50 shadow-sm hover:ring-2 hover:ring-primary/20 transition-all">
                    <Avatar className="h-full w-full">
                      <AvatarImage src={profile?.avatar_url || undefined} alt="User" />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white font-bold">
                        {profile?.full_name?.substring(0, 1).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {profile?.tier && profile.tier !== 'none' && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] text-white ring-2 ring-background shadow-sm">
                        ★
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl border-white/10 glass shadow-xl mt-2 animate-in fade-in zoom-in-95 duration-200">
                  <DropdownMenuLabel className="mb-2 px-3 py-2">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground leading-none">{profile?.full_name || 'Utilisateur'}</p>
                        {profile?.tier === 'gold' && (
                          <Badge variant="default" className="h-4 px-1.5 text-[9px] font-bold bg-gradient-to-r from-primary to-purple-600 border-none">GOLD</Badge>
                        )}
                        {profile?.tier === 'growth' && (
                          <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-bold border-none">GROWTH</Badge>
                        )}
                      </div>
                      <p className="text-xs leading-none text-muted-foreground font-medium truncate">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border/50" />

                  {(profile?.role === 'pro' || profile?.role === 'admin') && (
                    <DropdownMenuItem asChild className="rounded-xl my-1 focus:bg-primary/10 focus:text-primary cursor-pointer">
                      <Link href="/dashboard" className="flex items-center py-2.5 px-3">
                        <LayoutDashboard className="mr-3 h-4 w-4 text-primary" />
                        <span className="font-medium">Tableau de bord {isPaidTier(profile?.tier) ? 'PRO' : ''}</span>
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {profile?.role === 'admin' && (
                    <DropdownMenuItem asChild className="rounded-xl my-1 focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                      <Link href="/admin" className="flex items-center py-2.5 px-3">
                        <LayoutDashboard className="mr-3 h-4 w-4" />
                        <span className="font-medium">Administration</span>
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem asChild className="rounded-xl my-1 focus:bg-accent focus:text-foreground cursor-pointer">
                    <Link href="/profile" className="flex items-center py-2.5 px-3">
                      <User className="mr-3 h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Mon Profil</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild className="rounded-xl my-1 focus:bg-accent focus:text-foreground cursor-pointer">
                    <Link href="/suggest" className="flex items-center py-2.5 px-3">
                      <Store className="mr-3 h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Suggérer un lieu</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem onClick={handleLogout} className="rounded-xl my-1 text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                    <div className="flex items-center py-2 px-3">
                      <LogOut className="mr-3 h-4 w-4" />
                      <span className="font-medium">Déconnexion</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" asChild className="rounded-full px-5 hover:bg-secondary/50 font-medium">
                  <Link href="/login">Connexion</Link>
                </Button>
                <Button asChild className="rounded-full shadow-lg shadow-primary/25 px-6 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 border-0 transition-all hover:scale-105 active:scale-95 duration-300">
                  <Link href="/signup">S'inscrire</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header >
  );
}

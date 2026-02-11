'use client';

import { useState } from 'react';
import { 
  Search, 
  MapPin, 
  Star, 
  Menu, 
  Bell, 
  LayoutDashboard,
  TrendingUp,
  MessageSquare,
  Settings,
  ChevronRight,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MoreHorizontal,
  Filter,
  ArrowRight,
  Phone,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Mock Data
const businesses = [
  { id: 1, name: "Le Gourmet Parisien", category: "Restaurant", rating: 4.8, reviews: 124, img: "https://picsum.photos/seed/food1/400/300" },
  { id: 2, name: "Spa Zenith", category: "Bien-être", rating: 4.9, reviews: 85, img: "https://picsum.photos/seed/spa1/400/300" },
  { id: 3, name: "Tech Repar", category: "Services", rating: 4.5, reviews: 42, img: "https://picsum.photos/seed/tech1/400/300" },
  { id: 4, name: "Café des Arts", category: "Café", rating: 4.2, reviews: 210, img: "https://picsum.photos/seed/cafe/400/300" },
];

const recentReviews = [
  { id: 1, user: "Sophie M.", rating: 5, comment: "Service impeccable !", date: "il y a 2h" },
  { id: 2, user: "Thomas D.", rating: 4, comment: "Très bon rapport qualité/prix.", date: "il y a 5h" },
  { id: 3, user: "Amélie P.", rating: 5, comment: "Ambiance top.", date: "il y a 1j" },
];

export default function AppPreview() {
  const [activeView, setActiveView] = useState<'public' | 'dashboard'>('public');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      
      {/* --- GLOBAL NAVIGATION (App Bar) --- */}
      <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 font-bold text-xl text-slate-900">
            <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <MapPin className="h-5 w-5" />
            </div>
            <span>CityGuide</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-500">
            <a href="#" className="hover:text-indigo-600 transition-colors">Explorer</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Pour les Pros</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">À propos</a>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900">
              <Bell className="h-5 w-5" />
            </Button>
            <Avatar className="h-9 w-9 border border-slate-200">
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            {/* Mobile Toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden text-slate-900"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </nav>

      {/* --- MAIN PREVIEW CONTAINER --- */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        
        {/* View Switcher */}
        <div className="flex justify-center mb-8">
          <div className="bg-white p-1 rounded-xl border border-slate-200 inline-flex shadow-sm">
            <button
              onClick={() => setActiveView('public')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeView === 'public' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Public Home View
            </button>
            <button
              onClick={() => setActiveView('dashboard')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeView === 'dashboard' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Admin / Dashboard View
            </button>
          </div>
        </div>

        {/* --- VIEW 1: PUBLIC HOME --- */}
        {activeView === 'public' && (
          <div className="space-y-16 animate-in fade-in duration-500">
            
            {/* Hero Section */}
            <section className="text-center py-12 md:py-20">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
                Explorez les meilleures <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-600">adresses de votre ville</span>
              </h1>
              
              {/* Search Input */}
              <div className="max-w-2xl mx-auto relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <Input 
                  placeholder="Que cherchez-vous ? (ex: Sushi, Plombier...)" 
                  className="h-14 pl-12 pr-32 rounded-2xl border-slate-200 text-lg shadow-sm focus:ring-2 focus:ring-indigo-600" 
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Button className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-500/20">
                    Rechercher
                  </Button>
                </div>
              </div>
            </section>

            {/* Business Grid */}
            <section>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Tendances du moment</h2>
                <Button variant="outline" className="rounded-full text-slate-600 border-slate-200">
                  <Filter className="mr-2 h-4 w-4" /> Filtres
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {businesses.map((biz) => (
                  <Card key={biz.id} className="group overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer">
                    <div className="relative h-48 overflow-hidden">
                      <img src={biz.img} alt={biz.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <Badge className="absolute top-3 left-3 bg-white/90 text-slate-900 border-none shadow-sm">
                        {biz.category}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{biz.name}</h3>
                        <div className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md text-emerald-700 font-bold text-xs">
                          <Star className="h-3 w-3 fill-emerald-700" /> {biz.rating}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-slate-500">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Paris 3e</span>
                        <span>{biz.reviews} avis</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* --- VIEW 2: ADMIN / DASHBOARD --- */}
        {activeView === 'dashboard' && (
          <div className="flex gap-8 lg:gap-12">
            
            {/* Sidebar */}
            <aside className="hidden lg:block w-64 flex-shrink-0 space-y-6">
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
                    <LayoutDashboard className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Admin Panel</h4>
                    <p className="text-xs text-slate-500">admin@cityguide.com</p>
                  </div>
                </CardContent>
              </Card>

              <nav className="space-y-1">
                <div className="px-3 py-2.5 rounded-xl bg-slate-100 text-slate-900 font-medium flex items-center gap-3">
                  <LayoutDashboard className="h-5 w-5 text-indigo-600" /> Vue d'ensemble
                </div>
                <div className="px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium flex items-center gap-3 transition-colors">
                  <MessageSquare className="h-5 w-5" /> Avis
                </div>
                <div className="px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium flex items-center gap-3 transition-colors">
                  <Users className="h-5 w-5" /> Utilisateurs
                </div>
                <div className="px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium flex items-center gap-3 transition-colors">
                  <Settings className="h-5 w-5" /> Paramètres
                </div>
              </nav>
            </aside>

            {/* Main Dashboard Content */}
            <main className="flex-1 min-w-0 space-y-8 animate-in fade-in duration-500">
              
              {/* Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Vues du profil" value="12.4k" icon={<Eye className="h-4 w-4 text-indigo-600" />} trend="+12%" positive />
                <StatCard title="Note Moyenne" value="4.8" icon={<Star className="h-4 w-4 text-amber-500" />} trend="Top 5%" positive />
                <StatCard title="Avis reçus" value="124" icon={<MessageSquare className="h-4 w-4 text-emerald-500" />} trend="+3 ce sem." positive />
                <StatCard title="Revenus" value="2,400€" icon={<TrendingUp className="h-4 w-4 text-rose-500" />} trend="+8%" positive />
              </div>

              {/* Recent Reviews Table */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="flex justify-between items-center pb-4">
                  <div>
                    <CardTitle className="text-slate-900">Avis récents</CardTitle>
                    <CardDescription>Gérez la réputation de vos entreprises.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full">Tout voir</Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {recentReviews.map((review) => (
                      <div key={review.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                            {review.user.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{review.user}</p>
                            <div className="flex items-center gap-2">
                              <div className="flex text-amber-400">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'fill-amber-400' : 'fill-slate-200 text-slate-200'}`} />
                                ))}
                              </div>
                              <span className="text-xs text-slate-400">{review.date}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500">
                            <Reply className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

            </main>
          </div>
        )}

        {/* --- COMPONENT SHOWCASE (To verify Design Tokens) --- */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-lg">Design System Token Showcase</CardTitle>
            <CardDescription>Verifying all UI components against defined specifications.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Buttons */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Buttons</h3>
                <div className="flex flex-wrap gap-3">
                  <Button className="rounded-full">Primary Action</Button>
                  <Button variant="secondary" className="rounded-full">Secondary</Button>
                  <Button variant="outline" className="rounded-xl">Outline</Button>
                  <Button variant="ghost" className="rounded-xl">Ghost</Button>
                  <Button variant="destructive" className="rounded-full">Alert</Button>
                </div>
              </div>
              
              {/* Badges */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Badges</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-emerald-100 text-emerald-700 border-none rounded-full">Success</Badge>
                  <Badge className="bg-amber-100 text-amber-700 border-none rounded-full">Warning</Badge>
                  <Badge className="bg-rose-100 text-rose-700 border-none rounded-full">Error</Badge>
                  <Badge variant="outline" className="rounded-full">Neutral</Badge>
                </div>
              </div>

              {/* Inputs */}
              <div className="space-y-4 md:col-span-2">
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Inputs</h3>
                <div className="flex gap-4">
                  <Input placeholder="Search..." className="rounded-xl border-slate-200" />
                  <Input type="date" className="rounded-xl border-slate-200" />
                  <Input disabled value="Disabled Input" className="rounded-xl bg-slate-100 border-transparent" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

// --- SUB-COMPONENTS (For Preview) ---

function StatCard({ title, value, icon, trend, positive }: any) {
  return (
    <Card className="bg-white border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        {icon}
      </div>
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{value}</h3>
        {trend && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {trend}
          </span>
        )}
      </div>
      {positive && (
        <div className="mt-2 flex items-center text-xs text-slate-400">
          <ArrowRight className="h-3 w-3 mr-1" /> vs mois dernier
        </div>
      )}
    </Card>
  );
}

function Reply(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 17 4 7"></polyline><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 7.6-4.7z"></path><polyline points="22 17 13.5 17 13.5 9 22 9"></polyline></svg>;
}

function Eye(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10-7-10-7-10-7z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
}
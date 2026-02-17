'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { updateSiteSettings } from "@/app/actions/admin";
import {
    Loader2,
    Save,
    Globe,
    Mail,
    Link as LinkIcon,
    Shield,
    Bell,
    Zap,
    Settings,
    Palette,
    Database,
    Lock,
    Share2,
    Activity,
    Cpu,
    Layers,
    ChevronRight,
    DollarSign,
    Users as UsersIcon,
    ShieldCheck,
    Crown,
    AlertTriangle,
    ChevronUp,
    ChevronDown,
    Layout,
    CreditCard
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type SiteSettings = {
    id: string;
    site_name: string;
    site_description: string | null;
    contact_email: string | null;
    support_phone: string | null;
    facebook_url: string | null;
    twitter_url: string | null;
    instagram_url: string | null;
    linkedin_url: string | null;
    maintenance_mode: boolean;
    allow_new_registrations: boolean;
    require_email_verification: boolean;
    default_language: string;
    enable_reviews: boolean;
    enable_salaries: boolean;
    enable_interviews: boolean;
    enable_messaging: boolean;
    enable_claims: boolean;
    tier_growth_monthly_price?: number;
    tier_growth_annual_price?: number;
    tier_pro_monthly_price?: number;
    tier_pro_annual_price?: number;
    // Keeping legacy for compatibility temporarily
    premium_annual_price?: number;
    premium_monthly_price?: number;
    premium_enabled: boolean;
    premium_description: string;
    site_logo_url: string | null;
    google_analytics_id: string | null;
    facebook_pixel_id: string | null;
    adsense_enabled: boolean;
    adsense_client_id: string | null;
    adsense_auto_ads_enabled: boolean;
    office_address: string | null;
    office_phone: string | null;
    copyright_text: string | null;
    home_sections_config: { id: string; visible: boolean }[];
    popular_searches_config: { label: string; href: string }[];
    email_provider: string | null;
    resend_api_key: string | null;
    sendgrid_api_key: string | null;
    mailjet_api_key: string | null;
    mailjet_api_secret: string | null;
    email_from: string | null;

    // Payment settings
    payment_bank_name: string | null;
    payment_rib_number: string | null;
    payment_beneficiary: string | null;
    payment_chari_url: string | null;
    payment_methods_enabled: string[] | null;
    partner_app_name: string | null;
    partner_app_url: string | null;
};

const defaultSettings: SiteSettings = {
    id: 'main',
    site_name: 'Avis Platform',
    site_description: '',
    contact_email: '',
    support_phone: '',
    facebook_url: '',
    twitter_url: '',
    instagram_url: '',
    linkedin_url: '',
    maintenance_mode: false,
    allow_new_registrations: true,
    require_email_verification: true,
    default_language: 'fr',
    enable_reviews: true,
    enable_salaries: true,
    enable_interviews: true,
    enable_messaging: false,
    enable_claims: true,
    tier_growth_monthly_price: 99.00,
    tier_growth_annual_price: 990.00,
    tier_pro_monthly_price: 299.00,
    tier_pro_annual_price: 2900.00,
    premium_enabled: true,
    premium_description: 'Devenez membre Premium et bénéficiez de fonctionnalités exclusives pour propulser votre entreprise.',
    site_logo_url: '',
    google_analytics_id: '',
    facebook_pixel_id: '',
    adsense_enabled: false,
    adsense_client_id: '',
    adsense_auto_ads_enabled: false,
    office_address: '',
    office_phone: '',
    copyright_text: '',
    home_sections_config: [
        { id: 'hero', visible: true },
        { id: 'stats', visible: true },
        { id: 'collections', visible: true },
        { id: 'categories', visible: true },
        { id: 'cities', visible: true },
        { id: 'featured', visible: true },
    ],
    popular_searches_config: [
        { label: 'Entreprises à Casablanca', href: '/businesses?search=Entreprise&city=Casablanca' },
        { label: 'Sociétés de services', href: '/businesses?search=Services' },
        { label: 'Entreprises à Rabat', href: '/businesses?category=Entreprises&city=Rabat' },
    ],
    email_provider: 'console',
    resend_api_key: '',
    sendgrid_api_key: '',
    mailjet_api_key: '',
    mailjet_api_secret: '',
    email_from: 'noreply@example.com',

    // Default payment settings
    payment_bank_name: 'BMCE Bank',
    payment_rib_number: '011 780 0000 1234567890 12 34',
    payment_beneficiary: 'Platform SARL',
    payment_chari_url: 'https://chari.ma/avis',
    payment_methods_enabled: ['bank_transfer'],
    partner_app_name: 'MOR RH',
    partner_app_url: 'https://monrh.vercel.app/',
};

export default function SettingsPage() {
    const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        async function fetchSettings() {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('site_settings')
                .select('*')
                .eq('id', 'main')
                .single();

            if (!error && data) {
                setSettings(data);
            }
            setLoading(false);
        }
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);

        try {
            const result = await updateSiteSettings(settings);

            if (result.status === 'error') {
                toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
            } else {
                toast({
                    title: 'Configuration sauvegardée',
                    description: result.message,
                    className: "bg-emerald-500 text-white border-0 font-bold"
                });
            }
        } catch (err: any) {
            toast({ title: 'Erreur', description: 'Une erreur imprévue est survenue.', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const updateSetting = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 space-y-4">
                <div className="h-12 w-12 border-b-2 border-primary border-t-2 border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground font-black animate-pulse uppercase tracking-widest text-[10px]">Loading System...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
                <div className="space-y-2">
                    <Badge className="bg-primary/10 text-primary border-none font-bold px-3 py-1 uppercase tracking-wider text-[10px]">Configuration Noyau</Badge>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                        Paramètres <span className="text-primary italic">Système</span>
                    </h1>
                    <p className="text-muted-foreground font-medium flex items-center gap-2">
                        <Settings className="h-4 w-4" /> Contrôle global des modules et de l'aspect de la plateforme
                    </p>
                </div>

                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-primary hover:bg-primary/90 text-white font-black px-8 h-12 rounded-2xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                >
                    {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    Enregistrer les modifications
                </Button>
            </div>

            <Tabs defaultValue="general" className="flex flex-col lg:flex-row gap-10">
                <aside className="lg:w-72 flex-shrink-0">
                    <TabsList className="flex flex-col h-auto bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-border/10 p-2 w-full rounded-[2rem] shadow-xl">
                        <TabsTrigger value="general" className="justify-start px-6 py-4 h-auto w-full data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-2xl font-black uppercase tracking-widest text-[10px] mb-1">
                            <Globe className="h-4 w-4 mr-3" />
                            Général & SEO
                        </TabsTrigger>
                        <TabsTrigger value="features" className="justify-start px-6 py-4 h-auto w-full data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-2xl font-black uppercase tracking-widest text-[10px] mb-1">
                            <Cpu className="h-4 w-4 mr-3" />
                            Modules Applicatifs
                        </TabsTrigger>
                        <TabsTrigger value="premium" className="justify-start px-6 py-4 h-auto w-full data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-2xl font-black uppercase tracking-widest text-[10px] mb-1">
                            <Zap className="h-4 w-4 mr-3 text-amber-500 fill-amber-500" />
                            Abonnements
                        </TabsTrigger>
                        <TabsTrigger value="payments" className="justify-start px-6 py-4 h-auto w-full data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-2xl font-black uppercase tracking-widest text-[10px] mb-1">
                            <CreditCard className="h-4 w-4 mr-3 text-green-500" />
                            Paiements
                        </TabsTrigger>

                        <TabsTrigger value="home" className="justify-start px-6 py-4 h-auto w-full data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-2xl font-black uppercase tracking-widest text-[10px] mb-1">
                            <Layout className="h-4 w-4 mr-3" />
                            Accueil
                        </TabsTrigger>
                        <TabsTrigger value="contact" className="justify-start px-6 py-4 h-auto w-full data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-2xl font-black uppercase tracking-widest text-[10px] mb-1">
                            <Mail className="h-4 w-4 mr-3" />
                            Communication
                        </TabsTrigger>
                        <TabsTrigger value="email" className="justify-start px-6 py-4 h-auto w-full data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-2xl font-black uppercase tracking-widest text-[10px] mb-1">
                            <Mail className="h-4 w-4 mr-3" />
                            Configuration Email
                        </TabsTrigger>
                        <TabsTrigger value="social" className="justify-start px-6 py-4 h-auto w-full data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-2xl font-black uppercase tracking-widest text-[10px] mb-1">
                            <Share2 className="h-4 w-4 mr-3" />
                            Réseaux Sociaux
                        </TabsTrigger>
                        <TabsTrigger value="partner" className="justify-start px-6 py-4 h-auto w-full data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all rounded-2xl font-black uppercase tracking-widest text-[10px] mb-1">
                            <LinkIcon className="h-4 w-4 mr-3" />
                            Partenaire RH
                        </TabsTrigger>
                        <TabsTrigger value="security" className="justify-start px-6 py-4 h-auto w-full data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-2xl font-black uppercase tracking-widest text-[10px]">
                            <Lock className="h-4 w-4 mr-3" />
                            Accès & Sécurité
                        </TabsTrigger>
                    </TabsList>

                    <div className="mt-8 p-6 bg-indigo-500/5 rounded-[2rem] border border-indigo-500/10 space-y-4">
                        <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-indigo-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Statut du Noyau</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-muted-foreground uppercase opacity-60">Version</span>
                                <span className="text-slate-900 dark:text-white">v3.4.0-pro</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-muted-foreground uppercase opacity-60">Uptime</span>
                                <span className="text-emerald-500">99.98%</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-muted-foreground uppercase opacity-60">Update Channel</span>
                                <span className="text-indigo-500">STABLE</span>
                            </div>
                        </div>
                    </div>
                </aside>

                <div className="flex-grow animate-in slide-in-from-right-4 duration-700">
                    <TabsContent value="home" className="mt-0 space-y-8">
                        <Card className="border-0 shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="p-8 border-b border-border/10">
                                <CardTitle className="text-2xl font-black tracking-tight">Agencement de l'Accueil</CardTitle>
                                <CardDescription className="text-slate-600 dark:text-slate-400 font-medium text-lg">Gérez la visibilité et l'ordre des sections de votre page d'accueil.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-10 space-y-8">
                                <div className="space-y-4">
                                    {settings.home_sections_config?.map((section, index) => (
                                        <div key={section.id} className="flex items-center justify-between p-6 bg-white/50 dark:bg-slate-800/50 border border-border/10 rounded-[2rem] shadow-sm transform transition-all hover:scale-[1.01]">
                                            <div className="flex items-center gap-6">
                                                <div className="flex flex-col gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full hover:bg-primary/10 text-primary"
                                                        disabled={index === 0}
                                                        onClick={() => {
                                                            const newConfig = [...settings.home_sections_config];
                                                            [newConfig[index], newConfig[index - 1]] = [newConfig[index - 1], newConfig[index]];
                                                            setSettings({ ...settings, home_sections_config: newConfig });
                                                        }}
                                                    >
                                                        <ChevronUp className="h-5 w-5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full hover:bg-primary/10 text-primary"
                                                        disabled={index === settings.home_sections_config.length - 1}
                                                        onClick={() => {
                                                            const newConfig = [...settings.home_sections_config];
                                                            [newConfig[index], newConfig[index + 1]] = [newConfig[index + 1], newConfig[index]];
                                                            setSettings({ ...settings, home_sections_config: newConfig });
                                                        }}
                                                    >
                                                        <ChevronDown className="h-5 w-5" />
                                                    </Button>
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-lg capitalize">{section.id.replace('_', ' ')}</h4>
                                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter opacity-70">Bloc Section #{index + 1}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2 mr-4">
                                                    <span className={cn("text-[10px] font-black uppercase", section.visible ? "text-emerald-500" : "text-slate-400")}>
                                                        {section.visible ? 'Actif' : 'Masqué'}
                                                    </span>
                                                    <Switch
                                                        checked={section.visible}
                                                        onCheckedChange={(checked) => {
                                                            const newConfig = [...settings.home_sections_config];
                                                            newConfig[index] = { ...newConfig[index], visible: checked };
                                                            setSettings({ ...settings, home_sections_config: newConfig });
                                                        }}
                                                        className="data-[state=checked]:bg-emerald-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-6 bg-primary/5 border border-primary/10 rounded-3xl flex items-start gap-4">
                                    <div className="p-2 bg-primary/10 rounded-xl">
                                        <AlertTriangle className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white mb-1">Note Importante</p>
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                                            L'ordre défini ici sera appliqué instantanément sur le site après avoir cliqué sur "Enregistrer les modifications". Certains blocs comme "Hero" sont recommandés en première position.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="p-8 border-b border-border/10">
                                <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                                    <Zap className="h-6 w-6 text-primary" />
                                    Recherches Populaires
                                </CardTitle>
                                <CardDescription className="text-slate-600 dark:text-slate-400 font-medium">Gérez les raccourcis de recherche affichés sous la barre de recherche principale.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-10 space-y-6">
                                <div className="space-y-4">
                                    {settings.popular_searches_config?.map((search, index) => (
                                        <div key={index} className="flex flex-col md:flex-row gap-4 p-6 bg-white/50 dark:bg-slate-800/50 border border-border/10 rounded-[2rem] shadow-sm transform transition-all group">
                                            <div className="flex-1 space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 text-primary">Libellé du tag</Label>
                                                <Input
                                                    value={search.label}
                                                    onChange={(e) => {
                                                        const newConfig = [...settings.popular_searches_config];
                                                        newConfig[index].label = e.target.value;
                                                        setSettings({ ...settings, popular_searches_config: newConfig });
                                                    }}
                                                    placeholder="ex: Restaurants à Casablanca"
                                                    className="h-12 rounded-xl bg-white/50 dark:bg-slate-950/50 border-border/10 font-bold"
                                                />
                                            </div>
                                            <div className="flex-[2] space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Lien vers les résultats (Href)</Label>
                                                <Input
                                                    value={search.href}
                                                    onChange={(e) => {
                                                        const newConfig = [...settings.popular_searches_config];
                                                        newConfig[index].href = e.target.value;
                                                        setSettings({ ...settings, popular_searches_config: newConfig });
                                                    }}
                                                    placeholder="/businesses?category=Restaurants&city=Casablanca"
                                                    className="h-12 rounded-xl bg-white/50 dark:bg-slate-950/50 border-border/10 font-medium"
                                                />
                                            </div>
                                            <div className="flex items-end pb-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-10 w-10 text-rose-500 hover:bg-rose-500/10 rounded-full"
                                                    onClick={() => {
                                                        const newConfig = settings.popular_searches_config.filter((_, i) => i !== index);
                                                        setSettings({ ...settings, popular_searches_config: newConfig });
                                                    }}
                                                >
                                                    <Zap className="h-4 w-4 fill-rose-500" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <Button
                                    variant="outline"
                                    className="w-full h-14 rounded-2xl border-dashed border-2 border-primary/20 text-primary font-black hover:bg-primary/5 transition-all text-[10px] uppercase tracking-widest"
                                    onClick={() => {
                                        const newConfig = [...(settings.popular_searches_config || []), { label: '', href: '' }];
                                        setSettings({ ...settings, popular_searches_config: newConfig });
                                    }}
                                >
                                    + Ajouter un tag de recherche
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="general" className="mt-0 space-y-8">
                        <Card className="border-0 shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="p-8 border-b border-border/10">
                                <CardTitle className="text-2xl font-black tracking-tight">Identité de Plateforme</CardTitle>
                                <CardDescription className="text-slate-600 dark:text-slate-400 font-medium">Définissez le nom et les métadonnées SEO globales du service.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <Label htmlFor="site_name" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Nom public du service</Label>
                                        <Input
                                            id="site_name"
                                            value={settings.site_name}
                                            onChange={(e) => updateSetting('site_name', e.target.value)}
                                            placeholder="Nom du site"
                                            className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 focus:ring-primary/20 font-black text-lg"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="default_language" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Locale par défaut</Label>
                                        <Input
                                            id="default_language"
                                            value={settings.default_language}
                                            onChange={(e) => updateSetting('default_language', e.target.value)}
                                            placeholder="fr"
                                            className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 focus:ring-primary/20 font-bold"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <Label htmlFor="site_description" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Balise Meta Description (SEO)</Label>
                                    <Textarea
                                        id="site_description"
                                        value={settings.site_description || ''}
                                        onChange={(e) => updateSetting('site_description', e.target.value)}
                                        placeholder="Décrivez votre plateforme en 160 caractères..."
                                        rows={4}
                                        className="resize-none rounded-3xl bg-white/50 dark:bg-slate-950/50 border-border/20 focus:ring-primary/20 p-6 font-medium leading-relaxed"
                                    />
                                    <div className="flex items-center gap-2 p-3 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                                        <Globe className="h-4 w-4 text-indigo-500" />
                                        <p className="text-[10px] font-bold text-muted-foreground italic">Cette description sera utilisée par Google et Bing pour l'indexation de votre page d'accueil.</p>
                                    </div>
                                </div>

                                <Separator className="bg-border/10" />

                                <div className="space-y-6">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                        <Palette className="h-4 w-4" /> Branding & Media
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <Label htmlFor="site_logo_url" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">URL du Logo (SVG ou PNG)</Label>
                                            <Input
                                                id="site_logo_url"
                                                value={settings.site_logo_url || ''}
                                                onChange={(e) => updateSetting('site_logo_url', e.target.value)}
                                                placeholder="/logo.svg"
                                                className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-bold"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Separator className="bg-border/10" />

                                <div className="space-y-6">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                        <Activity className="h-4 w-4" /> Analytics & Tracking
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <Label htmlFor="google_analytics_id" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Google Analytics (G-XXXXXXX)</Label>
                                            <Input
                                                id="google_analytics_id"
                                                value={settings.google_analytics_id || ''}
                                                onChange={(e) => updateSetting('google_analytics_id', e.target.value)}
                                                placeholder="G-XXXXXXXXXX"
                                                className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-bold"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <Label htmlFor="facebook_pixel_id" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Meta Pixel ID</Label>
                                            <Input
                                                id="facebook_pixel_id"
                                                value={settings.facebook_pixel_id || ''}
                                                onChange={(e) => updateSetting('facebook_pixel_id', e.target.value)}
                                                placeholder="ID de votre pixel..."
                                                className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-bold"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <Label htmlFor="adsense_client_id" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Google AdSense Client ID</Label>
                                            <Input
                                                id="adsense_client_id"
                                                value={settings.adsense_client_id || ''}
                                                onChange={(e) => updateSetting('adsense_client_id', e.target.value)}
                                                placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                                                className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-bold"
                                            />
                                        </div>
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/50 dark:bg-slate-950/50 border border-border/20">
                                                <div>
                                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Activer AdSense</Label>
                                                </div>
                                                <Switch
                                                    checked={settings.adsense_enabled}
                                                    onCheckedChange={(checked) => updateSetting('adsense_enabled', checked)}
                                                    className="data-[state=checked]:bg-emerald-500"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/50 dark:bg-slate-950/50 border border-border/20">
                                                <div>
                                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Auto Ads</Label>
                                                </div>
                                                <Switch
                                                    checked={settings.adsense_auto_ads_enabled}
                                                    onCheckedChange={(checked) => updateSetting('adsense_auto_ads_enabled', checked)}
                                                    className="data-[state=checked]:bg-emerald-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="features" className="mt-0 space-y-8">
                        <Card className="border-0 shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="p-8 border-b border-border/10">
                                <CardTitle className="text-2xl font-black tracking-tight">Gestion des Modules</CardTitle>
                                <CardDescription className="text-slate-600 dark:text-slate-400 font-medium">Activez ou désactivez les fonctionnalités applicatives majeures en un clic.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[
                                    { id: 'enable_reviews', label: 'Moteur d\'avis', desc: 'Gestion des notes et commentaires utilisateurs', icon: <Layers className="h-5 w-5" /> },
                                    { id: 'enable_salaries', label: 'Section Salaires', desc: 'Base de données anonyme des rémunérations', icon: <DollarSign className="h-5 w-5" /> },
                                    { id: 'enable_interviews', label: 'Processus de Recrutement', desc: 'Retours d\'expérience sur les entretiens', icon: <UsersIcon className="h-5 w-5" /> },
                                    { id: 'enable_claims', label: 'Claims Engine', desc: 'Système de revendication d\'entreprises', icon: <ShieldCheck className="h-5 w-5" /> },
                                    { id: 'enable_messaging', label: 'Real-time Chat', desc: 'Messagerie instantanée propriétaire (Bêta)', badge: 'Bêta', icon: <Mail className="h-5 w-5" /> },
                                ].map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-6 rounded-[2rem] border border-border/10 bg-white/40 dark:bg-slate-950/20 hover:bg-white/70 dark:hover:bg-slate-950/40 transition-all group">
                                        <div className="flex gap-4 items-center">
                                            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                                                {item.icon}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Label className="text-sm font-black cursor-pointer group-hover:text-primary transition-colors uppercase tracking-tight">{item.label}</Label>
                                                    {item.badge && <Badge className="bg-amber-500 text-white border-none font-bold text-[8px] uppercase px-2 h-4">{item.badge}</Badge>}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground font-medium">{item.desc}</p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={settings[item.id as keyof SiteSettings] as boolean}
                                            onCheckedChange={(checked) => updateSetting(item.id as keyof SiteSettings, checked)}
                                            className="data-[state=checked]:bg-emerald-500"
                                        />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="premium" className="mt-0 space-y-8">
                        <Card className="border-0 shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="p-8 border-b border-border/10">
                                <CardTitle className="text-2xl font-black tracking-tight">Configuration Commerciale</CardTitle>
                                <CardDescription className="text-slate-600 dark:text-slate-400 font-medium">Gérez les prix des abonnements et le contenu du pack Premium.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-10">
                                <div className="flex items-center justify-between p-6 bg-gradient-to-r from-amber-500/10 to-transparent rounded-[2rem] border border-amber-500/20">
                                    <div className="flex gap-4 items-center">
                                        <div className="h-12 w-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
                                            <Crown className="h-6 w-6" />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest text-[10px]">Abonnements Premium</h4>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Permettre aux entreprises de passer au forfait supérieur</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={settings.premium_enabled}
                                        onCheckedChange={(checked) => updateSetting('premium_enabled', checked)}
                                        className="data-[state=checked]:bg-amber-500"
                                    />
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <Label htmlFor="tier_growth_monthly_price" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Growth Mensuel (MAD)</Label>
                                            <div className="relative">
                                                <Input
                                                    id="tier_growth_monthly_price"
                                                    type="number"
                                                    value={settings.tier_growth_monthly_price ?? 99}
                                                    onChange={(e) => updateSetting('tier_growth_monthly_price', parseFloat(e.target.value) || 0)}
                                                    className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 pl-12 font-black tabular-nums text-lg"
                                                />
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black">€</span>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <Label htmlFor="tier_growth_annual_price" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Growth Annuel (MAD)</Label>
                                            <div className="relative">
                                                <Input
                                                    id="tier_growth_annual_price"
                                                    type="number"
                                                    value={settings.tier_growth_annual_price ?? 990}
                                                    onChange={(e) => updateSetting('tier_growth_annual_price', parseFloat(e.target.value) || 0)}
                                                    className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 pl-12 font-black tabular-nums text-lg"
                                                />
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black">€</span>
                                            </div>
                                        </div>
                                    </div>

                                    <Separator className="bg-border/10" />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <Label htmlFor="tier_pro_monthly_price" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Pro Mensuel (MAD)</Label>
                                            <div className="relative">
                                                <Input
                                                    id="tier_pro_monthly_price"
                                                    type="number"
                                                    value={settings.tier_pro_monthly_price ?? 299}
                                                    onChange={(e) => updateSetting('tier_pro_monthly_price', parseFloat(e.target.value) || 0)}
                                                    className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 pl-12 font-black tabular-nums text-lg"
                                                />
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black">€</span>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <Label htmlFor="tier_pro_annual_price" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Pro Annuel (MAD)</Label>
                                            <div className="relative">
                                                <Input
                                                    id="tier_pro_annual_price"
                                                    type="number"
                                                    value={settings.tier_pro_annual_price ?? 2900}
                                                    onChange={(e) => updateSetting('tier_pro_annual_price', parseFloat(e.target.value) || 0)}
                                                    className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 pl-12 font-black tabular-nums text-lg"
                                                />
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black">€</span>
                                            </div>
                                            <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest text-right px-2">Économie suggérée: 20%</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="premium_description" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Argumentaire de Vente</Label>
                                    <Textarea
                                        id="premium_description"
                                        value={settings.premium_description}
                                        onChange={(e) => updateSetting('premium_description', e.target.value)}
                                        placeholder="Pourquoi passer à Premium ?..."
                                        rows={4}
                                        className="resize-none rounded-3xl bg-white/50 dark:bg-slate-950/50 border-border/20 p-6 font-medium leading-relaxed"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="payments" className="mt-0 space-y-8">
                        <Card className="border-0 shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="p-8 border-b border-border/10">
                                <CardTitle className="text-2xl font-black tracking-tight">Configuration des Paiements</CardTitle>
                                <CardDescription className="text-slate-600 dark:text-slate-400 font-medium">Détails bancaires affichés aux utilisateurs pour les paiements hors-ligne.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <Label htmlFor="payment_bank_name" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Nom de la Banque</Label>
                                        <Input
                                            id="payment_bank_name"
                                            value={settings.payment_bank_name || ''}
                                            onChange={(e) => updateSetting('payment_bank_name', e.target.value)}
                                            placeholder="Ex: BMCE Bank"
                                            className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="payment_rib_number" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Numéro de Compte (RIB)</Label>
                                        <Input
                                            id="payment_rib_number"
                                            value={settings.payment_rib_number || ''}
                                            onChange={(e) => updateSetting('payment_rib_number', e.target.value)}
                                            placeholder="Ex: 011 780 0000 1234567890 12 34"
                                            className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-bold font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="payment_beneficiary" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Bénéficiaire</Label>
                                    <Input
                                        id="payment_beneficiary"
                                        value={settings.payment_beneficiary || ''}
                                        onChange={(e) => updateSetting('payment_beneficiary', e.target.value)}
                                        placeholder="Ex: Platform SARL"
                                        className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-bold"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="payment_chari_url" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Lien Chari.ma</Label>
                                    <Input
                                        id="payment_chari_url"
                                        value={settings.payment_chari_url || ''}
                                        onChange={(e) => updateSetting('payment_chari_url', e.target.value)}
                                        placeholder="Ex: https://chari.ma/avis"
                                        className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-bold"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Méthodes de Paiement Activées</Label>
                                    <div className="flex flex-wrap gap-3 pt-2">
                                        {['bank_transfer', 'chari_ma', 'paypal', 'stripe'].map((method) => (
                                            <div key={method} className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id={`payment_method_${method}`}
                                                    checked={(settings.payment_methods_enabled || []).includes(method)}
                                                    onChange={(e) => {
                                                        const currentMethods = settings.payment_methods_enabled || [];
                                                        let newMethods;
                                                        if (e.target.checked) {
                                                            newMethods = [...currentMethods, method];
                                                        } else {
                                                            newMethods = currentMethods.filter(m => m !== method);
                                                        }
                                                        updateSetting('payment_methods_enabled', newMethods);
                                                    }}
                                                    className="h-4 w-4 rounded border-border/30 text-primary focus:ring-primary"
                                                />
                                                <Label htmlFor={`payment_method_${method}`} className="text-sm font-medium">
                                                    {method === 'bank_transfer' && 'Virement Bancaire'}
                                                    {method === 'chari_ma' && 'Chari.ma'}
                                                    {method === 'paypal' && 'PayPal'}
                                                    {method === 'stripe' && 'Stripe'}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-6 bg-green-500/5 border border-green-500/10 rounded-3xl flex items-start gap-4">
                                    <div className="p-2 bg-green-500/10 rounded-xl">
                                        <AlertTriangle className="h-5 w-5 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white mb-1">Information</p>
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                                            Ces coordonnées seront affichées aux utilisateurs sur la page d'abonnement Premium.
                                            Elles leur permettront d'effectuer les virements bancaires pour activer leurs abonnements.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="contact" className="mt-0 space-y-8">
                        <Card className="border-0 shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="p-8 border-b border-border/10">
                                <CardTitle className="text-2xl font-black tracking-tight">Support Technique</CardTitle>
                                <CardDescription className="text-slate-600 dark:text-slate-400 font-medium">Coordonnées utilisées pour les emails automatiques et le footer.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <Label htmlFor="contact_email" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Email de relation client</Label>
                                        <Input
                                            id="contact_email"
                                            type="email"
                                            value={settings.contact_email || ''}
                                            onChange={(e) => updateSetting('contact_email', e.target.value)}
                                            placeholder="hello@platform.com"
                                            className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="support_phone" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Ligne Directe Support</Label>
                                        <Input
                                            id="support_phone"
                                            value={settings.support_phone || ''}
                                            onChange={(e) => updateSetting('support_phone', e.target.value)}
                                            placeholder="+212 5XX XX XX XX"
                                            className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="office_address" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Adresse des bureaux (Footer)</Label>
                                    <Input
                                        id="office_address"
                                        value={settings.office_address || ''}
                                        onChange={(e) => updateSetting('office_address', e.target.value)}
                                        placeholder="Ex: 123 Boulevard d'Anfa, Casablanca"
                                        className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-bold"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="copyright_text" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Texte de Copyright</Label>
                                    <Input
                                        id="copyright_text"
                                        value={settings.copyright_text || ''}
                                        onChange={(e) => updateSetting('copyright_text', e.target.value)}
                                        placeholder="&copy; 2024 Platform. Tous droits réservés."
                                        className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-bold"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="email" className="mt-0 space-y-8">
                        <Card className="border-0 shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="p-8 border-b border-border/10">
                                <CardTitle className="text-2xl font-black tracking-tight">Configuration Email</CardTitle>
                                <CardDescription className="text-slate-600 dark:text-slate-400 font-medium">Paramètres de configuration pour l'envoi d'emails transactionnels.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8">
                                <div className="space-y-3">
                                    <Label htmlFor="email_provider" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Fournisseur Email</Label>
                                    <select
                                        id="email_provider"
                                        value={settings.email_provider || 'console'}
                                        onChange={(e) => updateSetting('email_provider', e.target.value)}
                                        className="w-full h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-bold focus:ring-1 focus:ring-primary focus:border-primary/30 appearance-none px-4"
                                    >
                                        <option value="console">Console (Développement)</option>
                                        <option value="resend">Resend</option>
                                        <option value="sendgrid">SendGrid</option>
                                        <option value="mailjet">Mailjet</option>
                                        <option value="ses">Amazon SES</option>
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="email_from" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Adresse Expéditeur</Label>
                                    <Input
                                        id="email_from"
                                        type="email"
                                        value={settings.email_from || ''}
                                        onChange={(e) => updateSetting('email_from', e.target.value)}
                                        placeholder="noreply@example.com"
                                        className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-bold"
                                    />
                                </div>

                                {(settings.email_provider === 'resend') && (
                                    <div className="space-y-3">
                                        <Label htmlFor="resend_api_key" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Clé API Resend</Label>
                                        <Input
                                            id="resend_api_key"
                                            type="password"
                                            value={settings.resend_api_key || ''}
                                            onChange={(e) => updateSetting('resend_api_key', e.target.value)}
                                            placeholder="red_..."
                                            className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-bold"
                                        />
                                        <p className="text-xs text-muted-foreground font-medium">
                                            Vous pouvez obtenir cette clé dans votre tableau de bord Resend.
                                        </p>
                                    </div>
                                )}

                                {(settings.email_provider === 'sendgrid') && (
                                    <div className="space-y-3">
                                        <Label htmlFor="sendgrid_api_key" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Clé API SendGrid</Label>
                                        <Input
                                            id="sendgrid_api_key"
                                            type="password"
                                            value={settings.sendgrid_api_key || ''}
                                            onChange={(e) => updateSetting('sendgrid_api_key', e.target.value)}
                                            placeholder="SG."
                                            className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-bold"
                                        />
                                        <p className="text-xs text-muted-foreground font-medium">
                                            Vous pouvez obtenir cette clé dans votre tableau de bord SendGrid.
                                        </p>
                                    </div>
                                )}

                                {(settings.email_provider === 'mailjet') && (
                                    <div className="space-y-3">
                                        <Label htmlFor="mailjet_api_key" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Clé API Mailjet</Label>
                                        <Input
                                            id="mailjet_api_key"
                                            type="password"
                                            value={settings.mailjet_api_key || ''}
                                            onChange={(e) => updateSetting('mailjet_api_key', e.target.value)}
                                            placeholder="API Key..."
                                            className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-bold"
                                        />
                                        <p className="text-xs text-muted-foreground font-medium">
                                            Vous pouvez obtenir cette clé dans votre tableau de bord Mailjet.
                                        </p>
                                    </div>
                                )}

                                {(settings.email_provider === 'mailjet') && (
                                    <div className="space-y-3">
                                        <Label htmlFor="mailjet_api_secret" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Clé Secrète Mailjet</Label>
                                        <Input
                                            id="mailjet_api_secret"
                                            type="password"
                                            value={settings.mailjet_api_secret || ''}
                                            onChange={(e) => updateSetting('mailjet_api_secret', e.target.value)}
                                            placeholder="API Secret..."
                                            className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-bold"
                                        />
                                        <p className="text-xs text-muted-foreground font-medium">
                                            Vous pouvez obtenir cette clé dans votre tableau de bord Mailjet.
                                        </p>
                                    </div>
                                )}

                                <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl flex items-start gap-4">
                                    <div className="p-2 bg-blue-500/10 rounded-xl">
                                        <AlertTriangle className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white mb-1">Important</p>
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                                            Les clés API sont stockées dans la base de données. Assurez-vous que votre environnement est sécurisé.
                                            En production, il est préférable d'utiliser les variables d'environnement.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="social" className="mt-0 space-y-8">
                        <Card className="border-0 shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="p-8 border-b border-border/10">
                                <CardTitle className="text-2xl font-black tracking-tight">Écosystème Social</CardTitle>
                                <CardDescription className="text-slate-600 dark:text-slate-400 font-medium">Connectez vos profils officiels pour la réassurance utilisateur.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                {[
                                    { id: 'facebook_url', label: 'Lien Facebook', placeholder: 'facebook.com/platform' },
                                    { id: 'instagram_url', label: 'Lien Instagram', placeholder: 'instagram.com/platform' },
                                    { id: 'twitter_url', label: 'Lien X (Twitter)', placeholder: 'x.com/platform' },
                                    { id: 'linkedin_url', label: 'Lien LinkedIn', placeholder: 'linkedin.com/company/platform' },
                                ].map((field) => (
                                    <div key={field.id} className="space-y-3">
                                        <Label htmlFor={field.id} className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">{field.label}</Label>
                                        <div className="relative group">
                                            <Input
                                                id={field.id}
                                                value={settings[field.id as keyof SiteSettings] as string || ''}
                                                onChange={(e) => updateSetting(field.id as keyof SiteSettings, e.target.value)}
                                                placeholder={field.placeholder}
                                                className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 pl-14 font-medium transition-all group-focus-within:border-primary/50"
                                            />
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                                                <LinkIcon className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="partner" className="mt-0 space-y-8">
                        <Card className="border-0 shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="p-8 border-b border-border/10">
                                <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3 text-indigo-600">
                                    <LinkIcon className="h-7 w-7" />
                                    Gestion du Partenaire RH
                                </CardTitle>
                                <CardDescription className="text-slate-600 dark:text-slate-400 font-medium">Configurez l'application partenaire (ex: MOR RH) affichée sur la plateforme.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <Label htmlFor="partner_app_name" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Nom du Partenaire</Label>
                                        <Input
                                            id="partner_app_name"
                                            value={settings.partner_app_name || ''}
                                            onChange={(e) => updateSetting('partner_app_name', e.target.value)}
                                            placeholder="Ex: MOR RH"
                                            className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-black text-lg"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="partner_app_url" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">URL de l'Application</Label>
                                        <Input
                                            id="partner_app_url"
                                            value={settings.partner_app_url || ''}
                                            onChange={(e) => updateSetting('partner_app_url', e.target.value)}
                                            placeholder="https://..."
                                            className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-bold"
                                        />
                                    </div>
                                </div>
                                <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-3xl flex items-start gap-4">
                                    <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-600">
                                        <Globe className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white mb-1">Configuration des outils</p>
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                                            Ces paramètres contrôlent le branding et les liens dans la section "Employee Toolkit" de la page d'accueil et le widget dans la barre latérale des entreprises.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="security" className="mt-0 space-y-8">
                        <Card className="border-0 shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="p-8 border-b border-border/10">
                                <CardTitle className="text-2xl font-black tracking-tight">Politiques de Sécurité</CardTitle>
                                <CardDescription className="text-slate-600 dark:text-slate-400 font-medium">Contrôlez l'exposition publique et les flux d'inscription.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6">
                                {[
                                    { id: 'maintenance_mode', label: 'Mode Maintenance Actif', desc: 'Le site sera inaccessible pour les visiteurs. Utile pour les mises à jour critiques.', warning: true },
                                    { id: 'allow_new_registrations', label: 'Ouverture des Inscriptions', desc: 'Permettre à de nouveaux utilisateurs de rejoindre la plateforme.' },
                                    { id: 'require_email_verification', label: 'Validation Double Opt-in', desc: 'Forcer la vérification de l\'adresse email avant de permettre l\'interaction.' },
                                ].map((item) => (
                                    <div key={item.id} className={cn(
                                        "flex items-center justify-between p-8 rounded-[2rem] border transition-all cursor-pointer",
                                        item.warning ? "bg-rose-500/5 border-rose-500/10 hover:bg-rose-500/10" : "bg-white/40 dark:bg-slate-950/20 border-border/10 hover:bg-white/70 dark:hover:bg-slate-950/40"
                                    )}>
                                        <div className="space-y-1 pr-10">
                                            <div className="flex items-center gap-2">
                                                <Label className={cn("text-base font-black uppercase tracking-tight", item.warning ? "text-rose-600" : "text-slate-900 dark:text-white")}>{item.label}</Label>
                                                {item.warning && <AlertTriangle className="h-4 w-4 text-rose-500 animate-pulse" />}
                                            </div>
                                            <p className="text-xs text-muted-foreground font-medium leading-relaxed">{item.desc}</p>
                                        </div>
                                        <Switch
                                            checked={settings[item.id as keyof SiteSettings] as boolean}
                                            onCheckedChange={(checked) => updateSetting(item.id as keyof SiteSettings, checked)}
                                            className={cn("data-[state=checked]:bg-primary", item.warning ? "data-[state=checked]:bg-rose-500" : "")}
                                        />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}

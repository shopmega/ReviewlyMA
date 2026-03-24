'use client';

import { useEffect, useState, type ReactNode } from "react";
import { Activity, AlertTriangle, CheckCircle2, Cpu, CreditCard, DollarSign, Globe, Layout, Link as LinkIcon, Loader2, Lock, Mail, Save, Settings, Share2, Zap } from "lucide-react";

import { updateSiteSettings } from "@/app/actions/admin";
import { ContactSettingsTab, EmailSettingsTab, FeaturesSettingsTab, GeneralSettingsTab, HomeSettingsTab, PaymentsSettingsTab, PartnerSettingsTab, PremiumSettingsTab, SalaryValidationSettingsTab, SecuritySettingsTab, SocialSettingsTab } from "@/components/admin/settings/AdminSettingsTabPanels";
import { useI18n } from "@/components/providers/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getDefaultSettings, normalizeSiteSettings, type SiteSettings } from "@/lib/data/settings";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const defaultSettings = getDefaultSettings();

function SidebarNav({ items }: { items: Array<{ value: string; label: ReactNode; icon: ReactNode; activeClassName?: string }> }) {
    return (
        <TabsList className="flex h-auto w-full flex-col rounded-[2rem] border border-border/10 bg-white/40 p-2 shadow-xl backdrop-blur-xl dark:bg-slate-900/40">
            {items.map((item, index) => (
                <TabsTrigger key={item.value} value={item.value} className={cn("justify-start px-6 py-4 h-auto w-full rounded-2xl font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white", index === items.length - 1 ? "" : "mb-1", item.activeClassName)}>
                    {item.icon}
                    {item.label}
                </TabsTrigger>
            ))}
        </TabsList>
    );
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [saving, setSaving] = useState(false);
    const [salaryRolesText, setSalaryRolesText] = useState((defaultSettings.salary_roles || []).join("\n"));
    const [salaryDepartmentsText, setSalaryDepartmentsText] = useState((defaultSettings.salary_departments || []).join("\n"));
    const [salaryIntervalsText, setSalaryIntervalsText] = useState(JSON.stringify(defaultSettings.salary_intervals || [], null, 2));
    const { toast } = useToast();
    const { t } = useI18n();

    useEffect(() => {
        async function fetchSettings() {
            const supabase = createClient();
            const { data, error } = await supabase.from("site_settings").select("*").eq("id", "main").maybeSingle();
            if (error) {
                setLoadFailed(true);
                toast({ title: t("common.error", "Erreur"), description: t("adminSettings.toast.loadError", "Impossible de charger les parametres actuels."), variant: "destructive" });
            } else if (data) {
                const normalized = normalizeSiteSettings(data) as SiteSettings;
                setSettings(normalized);
                setSalaryRolesText((normalized.salary_roles || []).join("\n"));
                setSalaryDepartmentsText((normalized.salary_departments || []).join("\n"));
                setSalaryIntervalsText(JSON.stringify(normalized.salary_intervals || [], null, 2));
                setLoadFailed(false);
            } else {
                setLoadFailed(true);
            }
            setLoading(false);
        }
        fetchSettings();
    }, [t, toast]);

    const updateSetting = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
        setSettings((current) => ({ ...current, [key]: value }));
    };

    const handleSave = async () => {
        if (loadFailed) {
            toast({ title: t("adminSettings.toast.saveBlockedTitle", "Sauvegarde bloquee"), description: t("adminSettings.toast.saveBlockedDesc", "Rechargez la page avant de sauvegarder."), variant: "destructive" });
            return;
        }
        setSaving(true);
        try {
            const parsed = JSON.parse(salaryIntervalsText);
            if (!Array.isArray(parsed)) throw new Error("invalid");
            const salaryIntervals = parsed.filter((item: any) => item && typeof item.id === "string" && typeof item.label === "string" && Number.isFinite(Number(item.min)) && Number.isFinite(Number(item.max)) && Number(item.max) >= Number(item.min)).map((item: any) => ({ id: item.id, label: item.label, min: Number(item.min), max: Number(item.max) }));
            if (salaryIntervals.length === 0) throw new Error("invalid");

            const nextSettings: SiteSettings = {
                ...settings,
                salary_roles: salaryRolesText.split("\n").map((value) => value.trim()).filter(Boolean),
                salary_departments: salaryDepartmentsText.split("\n").map((value) => value.trim()).filter(Boolean),
                salary_intervals: salaryIntervals,
            };
            const result = await updateSiteSettings(nextSettings);
            if (result.status !== "success") {
                toast({ title: t("common.error", "Erreur"), description: result.message || t("adminSettings.toast.saveError", "Impossible de sauvegarder les parametres."), variant: "destructive" });
                return;
            }
            setSettings(nextSettings);
            toast({ title: t("common.success", "Succes"), description: result.message || t("adminSettings.toast.saveSuccess", "Les parametres ont ete sauvegardes.") });
        } catch {
            toast({ title: t("common.error", "Erreur"), description: t("adminSettings.toast.salaryIntervalsError", "Le JSON des intervalles de salaire est invalide."), variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="mr-3 h-5 w-5 animate-spin text-primary" />{t("adminSettings.loading.title", "Chargement des parametres")}</div>;
    }

    const sidebarItems = [
        { value: "general", label: t("adminSettings.tabs.general", "General & SEO"), icon: <Globe className="mr-3 h-4 w-4" /> },
        { value: "features", label: t("adminSettings.tabs.features", "Modules Applicatifs"), icon: <Cpu className="mr-3 h-4 w-4" /> },
        { value: "premium", label: t("adminSettings.tabs.subscriptions", "Abonnements"), icon: <Zap className="mr-3 h-4 w-4 text-amber-500 fill-amber-500" /> },
        { value: "payments", label: t("adminSettings.tabs.payments", "Paiements"), icon: <CreditCard className="mr-3 h-4 w-4 text-green-500" /> },
        { value: "salary-config", label: t("adminSettings.tabs.salaries", "Salaires"), icon: <DollarSign className="mr-3 h-4 w-4 text-primary" /> },
        { value: "home", label: t("adminSettings.tabs.home", "Accueil"), icon: <Layout className="mr-3 h-4 w-4" /> },
        { value: "contact", label: t("adminSettings.tabs.communication", "Communication"), icon: <Mail className="mr-3 h-4 w-4" /> },
        { value: "email", label: t("adminSettings.tabs.email", "Configuration Email"), icon: <Mail className="mr-3 h-4 w-4" /> },
        { value: "social", label: t("adminSettings.tabs.social", "Reseaux Sociaux"), icon: <Share2 className="mr-3 h-4 w-4" /> },
        { value: "partner", label: t("adminSettings.tabs.partner", "Partenaire RH"), icon: <LinkIcon className="mr-3 h-4 w-4" />, activeClassName: "data-[state=active]:bg-indigo-600" },
        { value: "security", label: t("adminSettings.tabs.security", "Acces & Securite"), icon: <Lock className="mr-3 h-4 w-4" /> },
    ];

    return (
        <div className="space-y-10">
            <section className="rounded-[2.5rem] border border-border/10 bg-white/50 p-8 shadow-2xl backdrop-blur-xl dark:bg-slate-900/40">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-4">
                        <Badge className="rounded-full bg-primary/10 px-4 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-primary shadow-none"><Settings className="mr-2 h-3.5 w-3.5" />{t("adminSettings.badge", "Configuration plateforme")}</Badge>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white lg:text-4xl">{t("adminSettings.title", "Parametres de la plateforme")}</h1>
                            <p className="max-w-3xl text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">{t("adminSettings.description", "Centralisez les reglages produit, paiements, communication et securite depuis une seule console admin.")}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {loadFailed ? <Badge variant="destructive" className="rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest"><AlertTriangle className="mr-2 h-3.5 w-3.5" />{t("adminSettings.status.loadFailed", "Chargement incomplet")}</Badge> : <Badge className="rounded-full bg-emerald-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 shadow-none"><CheckCircle2 className="mr-2 h-3.5 w-3.5" />{t("adminSettings.status.ready", "Pret a modifier")}</Badge>}
                        <Button onClick={handleSave} disabled={saving} size="lg" className="h-14 rounded-2xl px-6 font-black uppercase tracking-widest">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{saving ? t("common.saving", "Sauvegarde...") : t("common.save", "Enregistrer")}</Button>
                    </div>
                </div>
            </section>

            <Tabs defaultValue="general" className="flex flex-col gap-10 lg:flex-row">
                <aside className="shrink-0 lg:w-72">
                    <SidebarNav items={sidebarItems} />
                    <div className="mt-8 rounded-[2rem] border border-indigo-500/10 bg-indigo-500/5 p-6">
                        <div className="mb-4 flex items-center gap-2"><Activity className="h-4 w-4 text-indigo-500" /><span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{t("adminSettings.systemStatus", "Statut Systeme")}</span></div>
                        <div className="space-y-2 text-[10px] font-bold">
                            <div className="flex justify-between"><span className="text-muted-foreground uppercase opacity-60">{t("adminSettings.status.maintenance", "Maintenance")}</span><span className={settings.maintenance_mode ? "text-rose-500" : "text-emerald-500"}>{settings.maintenance_mode ? t("adminSettings.status.activeMaintenance", "ACTIVE") : t("adminSettings.status.off", "OFF")}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground uppercase opacity-60">{t("adminSettings.status.registrations", "Inscriptions")}</span><span className={settings.allow_new_registrations ? "text-emerald-500" : "text-amber-500"}>{settings.allow_new_registrations ? t("adminSettings.status.open", "OUVERTES") : t("adminSettings.status.closed", "FERMEES")}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground uppercase opacity-60">{t("adminSettings.status.premium", "Premium")}</span><span className={settings.premium_enabled ? "text-amber-500" : "text-slate-400"}>{settings.premium_enabled ? t("adminSettings.status.active", "ACTIF") : t("adminSettings.status.off", "OFF")}</span></div>
                        </div>
                    </div>
                </aside>

                <div className="flex-grow space-y-8">
                    <GeneralSettingsTab settings={settings} onSettingChange={(key, value) => updateSetting(key as never, value as never)} t={t} />
                    <FeaturesSettingsTab settings={settings} onSettingChange={(key, value) => updateSetting(key as never, value as never)} t={t} />
                    <PremiumSettingsTab settings={settings} onSettingChange={(key, value) => updateSetting(key as never, value as never)} t={t} />
                    <PaymentsSettingsTab settings={settings} onSettingChange={(key, value) => updateSetting(key as never, value as never)} t={t} />
                    <SalaryValidationSettingsTab salaryRolesText={salaryRolesText} salaryDepartmentsText={salaryDepartmentsText} salaryIntervalsText={salaryIntervalsText} onSalaryRolesChange={setSalaryRolesText} onSalaryDepartmentsChange={setSalaryDepartmentsText} onSalaryIntervalsChange={setSalaryIntervalsText} t={t} />
                    <HomeSettingsTab settings={settings} onSettingChange={(key, value) => updateSetting(key as never, value as never)} t={t} />
                    <ContactSettingsTab settings={settings} onSettingChange={(key, value) => updateSetting(key as never, value as never)} t={t} />
                    <EmailSettingsTab settings={settings} onSettingChange={(key, value) => updateSetting(key as never, value as never)} t={t} />
                    <SocialSettingsTab settings={settings} onSettingChange={(key, value) => updateSetting(key as never, value as never)} t={t} />
                    <PartnerSettingsTab settings={settings} onSettingChange={(key, value) => updateSetting(key as never, value as never)} t={t} />
                    <SecuritySettingsTab settings={settings} onSettingChange={(key, value) => updateSetting(key as never, value as never)} t={t} />
                </div>
            </Tabs>
        </div>
    );
}

"use client";

import type { ReactNode } from "react";
import { Activity, AlertTriangle, ChevronDown, ChevronUp, Crown, DollarSign, Globe, Layers, Palette, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { SiteSettings } from "@/lib/data/settings";
import { cn } from "@/lib/utils";

type Translate = (key: string, fallback: string) => string;
type SettingValue = SiteSettings[keyof SiteSettings];

type SharedProps = {
    settings: SiteSettings;
    onSettingChange: (key: keyof SiteSettings, value: SettingValue) => void;
    t: Translate;
};

function SettingsTabCard({
    title,
    description,
    children,
}: {
    title: ReactNode;
    description: ReactNode;
    children: ReactNode;
}) {
    return (
        <Card className="border-0 shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8 border-b border-border/10">
                <CardTitle className="text-2xl font-black tracking-tight">{title}</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400 font-medium">{description}</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">{children}</CardContent>
        </Card>
    );
}

function SettingInput({
    id,
    label,
    value,
    placeholder,
    onChange,
    type = "text",
    className = "h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-bold",
}: {
    id: string;
    label: ReactNode;
    value: string | number;
    placeholder?: string;
    onChange: (value: string) => void;
    type?: string;
    className?: string;
}) {
    return (
        <div className="space-y-3">
            <Label htmlFor={id} className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                {label}
            </Label>
            <Input
                id={id}
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className={className}
            />
        </div>
    );
}

export function FeaturesSettingsTab({ settings, onSettingChange, t }: SharedProps) {
    const modules = [
        {
            id: "enable_reviews" as const,
            label: t("adminSettings.modules.reviews.label", "Moteur avis"),
            desc: t("adminSettings.modules.reviews.desc", "Gestion des notes et commentaires utilisateurs"),
            icon: <Layers className="h-5 w-5" />,
        },
        {
            id: "enable_salaries" as const,
            label: t("adminSettings.modules.salaries.label", "Section Salaires"),
            desc: t("adminSettings.modules.salaries.desc", "Base anonyme des remunerations"),
            icon: <DollarSign className="h-5 w-5" />,
        },
        {
            id: "enable_claims" as const,
            label: t("adminSettings.modules.claims.label", "Claims Engine"),
            desc: t("adminSettings.modules.claims.desc", "Systeme de revendication entreprises"),
            icon: <ShieldCheck className="h-5 w-5" />,
        },
    ];

    return (
        <TabsContent value="features" className="mt-0 space-y-8">
            <SettingsTabCard
                title={t("adminSettings.sections.modules.title", "Gestion des Modules")}
                description={t("adminSettings.sections.modules.desc", "Activez ou desactivez les fonctionnalites applicatives majeures en un clic.")}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {modules.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-6 rounded-[2rem] border border-border/10 bg-white/40 dark:bg-slate-950/20 hover:bg-white/70 dark:hover:bg-slate-950/40 transition-all group">
                            <div className="flex gap-4 items-center">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                                    {item.icon}
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-sm font-black uppercase tracking-tight">{item.label}</Label>
                                    <p className="text-[10px] text-muted-foreground font-medium">{item.desc}</p>
                                </div>
                            </div>
                            <Switch
                                checked={Boolean(settings[item.id])}
                                onCheckedChange={(checked) => onSettingChange(item.id, checked)}
                                className="data-[state=checked]:bg-emerald-500"
                            />
                        </div>
                    ))}
                </div>
            </SettingsTabCard>
        </TabsContent>
    );
}

export function GeneralSettingsTab({ settings, onSettingChange, t }: SharedProps) {
    return (
        <TabsContent value="general" className="mt-0 space-y-8">
            <SettingsTabCard
                title={t("adminSettings.sections.platformIdentity.title", "Identite de Plateforme")}
                description={t("adminSettings.sections.platformIdentity.desc", "Definissez le nom et les metadonnees SEO globales du service.")}
            >
                <SettingInput
                    id="site_name"
                    label={t("adminSettings.platformIdentity.siteNameLabel", "Nom public du service")}
                    value={settings.site_name}
                    onChange={(value) => onSettingChange("site_name", value)}
                    placeholder={t("adminSettings.platformIdentity.siteNamePlaceholder", "Nom du site")}
                    className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 focus:ring-primary/20 font-black text-lg"
                />

                <div className="space-y-3">
                    <Label htmlFor="site_description" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                        {t("adminSettings.platformIdentity.metaDescriptionLabel", "Balise Meta Description (SEO)")}
                    </Label>
                    <Textarea
                        id="site_description"
                        value={settings.site_description || ""}
                        onChange={(event) => onSettingChange("site_description", event.target.value)}
                        placeholder={t("adminSettings.platformIdentity.metaDescriptionPlaceholder", "Decrivez votre plateforme en 160 caracteres...")}
                        rows={4}
                        className="resize-none rounded-3xl bg-white/50 dark:bg-slate-950/50 border-border/20 focus:ring-primary/20 p-6 font-medium leading-relaxed"
                    />
                    <div className="flex items-center gap-2 p-3 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                        <Globe className="h-4 w-4 text-indigo-500" />
                        <p className="text-[10px] font-bold text-muted-foreground italic">
                            {t("adminSettings.platformIdentity.metaDescriptionHint", "Cette description sera utilisee par Google et Bing pour indexation de votre page accueil.")}
                        </p>
                    </div>
                </div>

                <Separator className="bg-border/10" />

                <div className="space-y-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <Palette className="h-4 w-4" /> {t("adminSettings.platformIdentity.brandingMedia", "Branding & Media")}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <SettingInput
                            id="site_logo_url"
                            label={t("adminSettings.platformIdentity.logoUrlLabel", "URL du Logo (SVG ou PNG)")}
                            value={settings.site_logo_url || ""}
                            onChange={(value) => onSettingChange("site_logo_url", value)}
                            placeholder="/logo.svg"
                        />
                    </div>
                </div>

                <Separator className="bg-border/10" />

                <div className="space-y-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <Activity className="h-4 w-4" /> Analytics & Tracking
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <SettingInput
                            id="google_analytics_id"
                            label={t("adminSettings.platformIdentity.gaLabel", "Google Analytics (G-XXXXXXX)")}
                            value={settings.google_analytics_id || ""}
                            onChange={(value) => onSettingChange("google_analytics_id", value)}
                            placeholder={t("adminSettings.platformIdentity.gaPlaceholder", "G-XXXXXXXXXX")}
                        />
                        <SettingInput
                            id="facebook_pixel_id"
                            label={t("adminSettings.platformIdentity.pixelLabel", "Meta Pixel ID")}
                            value={settings.facebook_pixel_id || ""}
                            onChange={(value) => onSettingChange("facebook_pixel_id", value)}
                            placeholder={t("adminSettings.platformIdentity.pixelPlaceholder", "ID de votre pixel...")}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <SettingInput
                            id="adsense_client_id"
                            label={t("adminSettings.platformIdentity.adsenseClientLabel", "Google AdSense Client ID")}
                            value={settings.adsense_client_id || ""}
                            onChange={(value) => onSettingChange("adsense_client_id", value)}
                            placeholder={t("adminSettings.platformIdentity.adsenseClientPlaceholder", "ca-pub-XXXXXXXXXXXXXXXX")}
                        />
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/50 dark:bg-slate-950/50 border border-border/20">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                    {t("adminSettings.platformIdentity.enableAdsenseLabel", "Activer AdSense")}
                                </Label>
                                <Switch
                                    checked={settings.adsense_enabled}
                                    onCheckedChange={(checked) => onSettingChange("adsense_enabled", checked)}
                                    className="data-[state=checked]:bg-emerald-500"
                                />
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/50 dark:bg-slate-950/50 border border-border/20">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                    {t("adminSettings.platformIdentity.autoAdsLabel", "Auto Ads")}
                                </Label>
                                <Switch
                                    checked={settings.adsense_auto_ads_enabled}
                                    onCheckedChange={(checked) => onSettingChange("adsense_auto_ads_enabled", checked)}
                                    className="data-[state=checked]:bg-emerald-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </SettingsTabCard>
        </TabsContent>
    );
}

export function PremiumSettingsTab({ settings, onSettingChange, t }: SharedProps) {
    const priceFields = [
        {
            key: "tier_growth_monthly_price" as const,
            id: "tier_growth_monthly_price",
            label: t("adminSettings.commercial.growthMonthlyLabel", "Growth Mensuel (MAD)"),
            fallback: 99,
        },
        {
            key: "tier_growth_annual_price" as const,
            id: "tier_growth_annual_price",
            label: t("adminSettings.commercial.growthAnnualLabel", "Growth Annuel (MAD)"),
            fallback: 990,
        },
        {
            key: "tier_gold_monthly_price" as const,
            id: "tier_gold_monthly_price",
            label: t("adminSettings.commercial.goldMonthlyLabel", "Gold Mensuel (MAD)"),
            fallback: 299,
        },
        {
            key: "tier_gold_annual_price" as const,
            id: "tier_gold_annual_price",
            label: t("adminSettings.commercial.goldAnnualLabel", "Gold Annuel (MAD)"),
            fallback: 2900,
            hint: t("adminSettings.commercial.suggestedSavings", "Economie suggeree: 20%"),
        },
    ];

    return (
        <TabsContent value="premium" className="mt-0 space-y-8">
            <SettingsTabCard
                title={t("adminSettings.sections.commercial.title", "Configuration Commerciale")}
                description={t("adminSettings.sections.commercial.desc", "Gerez les prix des abonnements et le contenu du pack Premium.")}
            >
                <div className="flex items-center justify-between p-6 bg-gradient-to-r from-amber-500/10 to-transparent rounded-[2rem] border border-amber-500/20">
                    <div className="flex gap-4 items-center">
                        <div className="h-12 w-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
                            <Crown className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest text-[10px]">
                                {t("adminSettings.commercial.subscriptionsTitle", "Abonnements Premium")}
                            </h4>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {t("adminSettings.commercial.subscriptionsDesc", "Permettre aux entreprises de passer au forfait superieur")}
                            </p>
                        </div>
                    </div>
                    <Switch
                        checked={settings.premium_enabled}
                        onCheckedChange={(checked) => onSettingChange("premium_enabled", checked)}
                        className="data-[state=checked]:bg-amber-500"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {priceFields.map((field) => (
                        <div key={field.key} className="space-y-3">
                            <Label htmlFor={field.id} className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                                {field.label}
                            </Label>
                            <div className="relative">
                                <Input
                                    id={field.id}
                                    type="number"
                                    value={settings[field.key] ?? field.fallback}
                                    onChange={(event) => onSettingChange(field.key, parseFloat(event.target.value) || 0)}
                                    className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 pl-16 font-black tabular-nums text-lg"
                                />
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-xs">
                                    {t("adminSettings.commercial.currency", "MAD")}
                                </span>
                            </div>
                            {field.hint ? <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest text-right px-2">{field.hint}</p> : null}
                        </div>
                    ))}
                </div>

                <div className="space-y-3">
                    <Label htmlFor="premium_description" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                        {t("adminSettings.commercial.salesPitchLabel", "Argumentaire de Vente")}
                    </Label>
                    <Textarea
                        id="premium_description"
                        value={settings.premium_description}
                        onChange={(event) => onSettingChange("premium_description", event.target.value)}
                        placeholder={t("adminSettings.commercial.salesPitchPlaceholder", "Pourquoi passer a Premium ?...")}
                        rows={4}
                        className="resize-none rounded-3xl bg-white/50 dark:bg-slate-950/50 border-border/20 p-6 font-medium leading-relaxed"
                    />
                </div>
            </SettingsTabCard>
        </TabsContent>
    );
}

export function ContactSettingsTab({ settings, onSettingChange, t }: SharedProps) {
    return (
        <TabsContent value="contact" className="mt-0 space-y-8">
            <SettingsTabCard
                title={t("adminSettings.sections.support.title", "Support Technique")}
                description={t("adminSettings.sections.support.desc", "Coordonnees utilisees pour les emails automatiques et le footer.")}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <SettingInput
                        id="contact_email"
                        type="email"
                        label={t("adminSettings.support.contactEmailLabel", "Email de relation client")}
                        value={settings.contact_email || ""}
                        onChange={(value) => onSettingChange("contact_email", value)}
                        placeholder={t("adminSettings.support.contactEmailPlaceholder", "hello@platform.com")}
                    />
                    <SettingInput
                        id="support_phone"
                        label={t("adminSettings.support.supportPhoneLabel", "Ligne Directe Support")}
                        value={settings.support_phone || ""}
                        onChange={(value) => onSettingChange("support_phone", value)}
                        placeholder={t("adminSettings.support.supportPhonePlaceholder", "+212 5XX XX XX XX")}
                    />
                </div>

                <SettingInput
                    id="office_address"
                    label={t("adminSettings.support.officeAddressLabel", "Adresse des bureaux (Footer)")}
                    value={settings.office_address || ""}
                    onChange={(value) => onSettingChange("office_address", value)}
                    placeholder={t("adminSettings.support.officeAddressPlaceholder", "Ex: 123 Boulevard d'Anfa, Casablanca")}
                />

                <SettingInput
                    id="copyright_text"
                    label={t("adminSettings.support.copyrightLabel", "Texte de Copyright")}
                    value={settings.copyright_text || ""}
                    onChange={(value) => onSettingChange("copyright_text", value)}
                    placeholder={t("adminSettings.support.copyrightPlaceholder", "&copy; 2024 Reviewly. Tous droits reserves.")}
                />
            </SettingsTabCard>
        </TabsContent>
    );
}

export function EmailSettingsTab({ settings, onSettingChange, t }: SharedProps) {
    const providerHints: Partial<Record<NonNullable<SiteSettings["email_provider"]>, string>> = {
        resend: "Vous pouvez obtenir cette cle dans votre tableau de bord Resend.",
        sendgrid: "Vous pouvez obtenir cette cle dans votre tableau de bord SendGrid.",
        mailjet: "Vous pouvez obtenir cette cle dans votre tableau de bord Mailjet.",
    };

    return (
        <TabsContent value="email" className="mt-0 space-y-8">
            <SettingsTabCard
                title={t("adminSettings.sections.email.title", "Configuration Email")}
                description={t("adminSettings.sections.email.desc", "Parametres de configuration pour envoi emails transactionnels.")}
            >
                <div className="space-y-3">
                    <Label htmlFor="email_provider" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                        {t("adminSettings.email.providerLabel", "Fournisseur Email")}
                    </Label>
                    <Select value={settings.email_provider || "console"} onValueChange={(value) => onSettingChange("email_provider", value)}>
                        <SelectTrigger className="w-full h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-bold">
                            <SelectValue placeholder={t("adminSettings.email.providerPlaceholder", "Choisir un fournisseur")} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/10 backdrop-blur-xl">
                            <SelectItem value="console">{t("adminSettings.email.providers.console", "Console (Developpement)")}</SelectItem>
                            <SelectItem value="resend">{t("adminSettings.email.providers.resend", "Resend")}</SelectItem>
                            <SelectItem value="sendgrid">{t("adminSettings.email.providers.sendgrid", "SendGrid")}</SelectItem>
                            <SelectItem value="mailjet">{t("adminSettings.email.providers.mailjet", "Mailjet")}</SelectItem>
                            <SelectItem value="ses">{t("adminSettings.email.providers.ses", "Amazon SES")}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <SettingInput
                    id="email_from"
                    type="email"
                    label={t("adminSettings.email.fromLabel", "Adresse Expediteur")}
                    value={settings.email_from || ""}
                    onChange={(value) => onSettingChange("email_from", value)}
                    placeholder={t("adminSettings.email.fromPlaceholder", "noreply@example.com")}
                />

                {settings.email_provider === "resend" ? (
                    <div className="space-y-3">
                        <Label htmlFor="resend_api_key" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                            {t("adminSettings.email.resendKeyLabel", "Cle API Resend")}
                        </Label>
                        <Input
                            id="resend_api_key"
                            type="password"
                            value={settings.resend_api_key || ""}
                            onChange={(event) => onSettingChange("resend_api_key", event.target.value)}
                            placeholder={t("adminSettings.email.resendPlaceholder", "red_...")}
                            className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-bold"
                        />
                        <p className="text-xs text-muted-foreground font-medium">{providerHints.resend}</p>
                    </div>
                ) : null}

                {settings.email_provider === "sendgrid" ? (
                    <div className="space-y-3">
                        <Label htmlFor="sendgrid_api_key" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                            {t("adminSettings.email.sendgridKeyLabel", "Cle API SendGrid")}
                        </Label>
                        <Input
                            id="sendgrid_api_key"
                            type="password"
                            value={settings.sendgrid_api_key || ""}
                            onChange={(event) => onSettingChange("sendgrid_api_key", event.target.value)}
                            placeholder={t("adminSettings.email.sendgridPlaceholder", "SG.")}
                            className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-bold"
                        />
                        <p className="text-xs text-muted-foreground font-medium">{providerHints.sendgrid}</p>
                    </div>
                ) : null}

                {settings.email_provider === "mailjet" ? (
                    <>
                        <div className="space-y-3">
                            <Label htmlFor="mailjet_api_key" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                                {t("adminSettings.email.mailjetKeyLabel", "Cle API Mailjet")}
                            </Label>
                            <Input
                                id="mailjet_api_key"
                                type="password"
                                value={settings.mailjet_api_key || ""}
                                onChange={(event) => onSettingChange("mailjet_api_key", event.target.value)}
                                placeholder={t("adminSettings.email.mailjetKeyPlaceholder", "API Key...")}
                                className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-bold"
                            />
                            <p className="text-xs text-muted-foreground font-medium">{providerHints.mailjet}</p>
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="mailjet_api_secret" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                                {t("adminSettings.email.mailjetSecretLabel", "Cle Secrete Mailjet")}
                            </Label>
                            <Input
                                id="mailjet_api_secret"
                                type="password"
                                value={settings.mailjet_api_secret || ""}
                                onChange={(event) => onSettingChange("mailjet_api_secret", event.target.value)}
                                placeholder={t("adminSettings.email.mailjetSecretPlaceholder", "API Secret...")}
                                className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-bold"
                            />
                            <p className="text-xs text-muted-foreground font-medium">{providerHints.mailjet}</p>
                        </div>
                    </>
                ) : null}

                <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl flex items-start gap-4">
                    <div className="p-2 bg-blue-500/10 rounded-xl">
                        <AlertTriangle className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-900 dark:text-white mb-1">{t("adminSettings.email.importantTitle", "Important")}</p>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                            Les cles API sont stockees dans la base de donnees. Assurez-vous que votre environnement est securise.
                            En production, il est preferable d'utiliser les variables d'environnement.
                        </p>
                    </div>
                </div>
            </SettingsTabCard>
        </TabsContent>
    );
}

export function SalaryValidationSettingsTab({
    salaryRolesText,
    salaryDepartmentsText,
    salaryIntervalsText,
    onSalaryRolesChange,
    onSalaryDepartmentsChange,
    onSalaryIntervalsChange,
    t,
}: {
    salaryRolesText: string;
    salaryDepartmentsText: string;
    salaryIntervalsText: string;
    onSalaryRolesChange: (value: string) => void;
    onSalaryDepartmentsChange: (value: string) => void;
    onSalaryIntervalsChange: (value: string) => void;
    t: Translate;
}) {
    return (
        <TabsContent value="salary-config" className="mt-0 space-y-8">
            <SettingsTabCard
                title={t("adminSettings.sections.salaryValidation.title", "Validation des salaires")}
                description={t("adminSettings.sections.salaryValidation.desc", "Gerez les postes, departements et intervalles autorises dans le formulaire public.")}
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                            {t("adminSettings.salaryValidation.rolesLabel", "Postes autorises (1 par ligne)")}
                        </Label>
                        <Textarea
                            value={salaryRolesText}
                            onChange={(event) => onSalaryRolesChange(event.target.value)}
                            rows={14}
                            className="resize-none rounded-3xl bg-white/50 dark:bg-slate-950/50 border-border/20 p-4 font-medium"
                            placeholder={t("adminSettings.salaryValidation.rolesPlaceholder", "Ingenieur logiciel")}
                        />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                            {t("adminSettings.salaryValidation.departmentsLabel", "Departements autorises (1 par ligne)")}
                        </Label>
                        <Textarea
                            value={salaryDepartmentsText}
                            onChange={(event) => onSalaryDepartmentsChange(event.target.value)}
                            rows={14}
                            className="resize-none rounded-3xl bg-white/50 dark:bg-slate-950/50 border-border/20 p-4 font-medium"
                            placeholder={t("adminSettings.salaryValidation.departmentsPlaceholder", "Ingenierie")}
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                        {t("adminSettings.salaryValidation.intervalsLabel", "Intervalles salariaux (JSON)")}
                    </Label>
                    <Textarea
                        value={salaryIntervalsText}
                        onChange={(event) => onSalaryIntervalsChange(event.target.value)}
                        rows={12}
                        className="resize-none rounded-3xl bg-white/50 dark:bg-slate-950/50 border-border/20 p-4 font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground font-medium">
                        Format attendu: {`[{"id":"id","label":"Libelle","min":1000,"max":5000}]`}
                    </p>
                </div>
            </SettingsTabCard>
        </TabsContent>
    );
}

export function PaymentsSettingsTab({ settings, onSettingChange, t }: SharedProps) {
    const paymentMethods = [
        { id: "bank_transfer", label: "Virement Bancaire" },
        { id: "chari_ma", label: "Chari.ma" },
        { id: "paypal", label: "PayPal" },
        { id: "stripe", label: "Stripe" },
    ];
    const enabledMethods = settings.payment_methods_enabled || [];

    return (
        <TabsContent value="payments" className="mt-0 space-y-8">
            <SettingsTabCard
                title={t("adminSettings.sections.payments.title", "Configuration des Paiements")}
                description={t("adminSettings.sections.payments.desc", "Details bancaires affiches aux utilisateurs pour paiements hors-ligne.")}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <SettingInput
                        id="payment_bank_name"
                        label={t("adminSettings.payments.bankNameLabel", "Nom de la Banque")}
                        value={settings.payment_bank_name || ""}
                        onChange={(value) => onSettingChange("payment_bank_name", value)}
                        placeholder={t("adminSettings.payments.bankNamePlaceholder", "Ex: BMCE Bank")}
                    />
                    <SettingInput
                        id="payment_rib_number"
                        label={t("adminSettings.payments.ribLabel", "Numero de Compte (RIB)")}
                        value={settings.payment_rib_number || ""}
                        onChange={(value) => onSettingChange("payment_rib_number", value)}
                        placeholder={t("adminSettings.payments.ribPlaceholder", "Ex: 011 780 0000 1234567890 12 34")}
                        className="h-14 rounded-2xl bg-white/50 dark:bg-slate-950/50 border-border/20 font-bold font-mono"
                    />
                </div>

                <SettingInput
                    id="payment_beneficiary"
                    label={t("adminSettings.payments.beneficiaryLabel", "Beneficiaire")}
                    value={settings.payment_beneficiary || ""}
                    onChange={(value) => onSettingChange("payment_beneficiary", value)}
                    placeholder={t("adminSettings.payments.beneficiaryPlaceholder", "Ex: Reviewly SARL")}
                />

                <SettingInput
                    id="payment_chari_url"
                    label={t("adminSettings.payments.chariUrlLabel", "Lien Chari.ma")}
                    value={settings.payment_chari_url || ""}
                    onChange={(value) => onSettingChange("payment_chari_url", value)}
                    placeholder={t("adminSettings.payments.chariUrlPlaceholder", "Ex: https://chari.ma/avis")}
                />

                <div className="space-y-3">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                        {t("adminSettings.payments.methodsEnabledLabel", "Methodes de Paiement Activees")}
                    </Label>
                    <div className="flex flex-wrap gap-3 pt-2">
                        {paymentMethods.map((method) => (
                            <div key={method.id} className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id={`payment_method_${method.id}`}
                                    checked={enabledMethods.includes(method.id)}
                                    onChange={(event) => {
                                        const nextMethods = event.target.checked
                                            ? [...enabledMethods, method.id]
                                            : enabledMethods.filter((item) => item !== method.id);
                                        onSettingChange("payment_methods_enabled", nextMethods);
                                    }}
                                    className="h-4 w-4 rounded border-border/30 text-primary focus:ring-primary"
                                />
                                <Label htmlFor={`payment_method_${method.id}`} className="text-sm font-medium">
                                    {method.label}
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
                        <p className="font-bold text-slate-900 dark:text-white mb-1">{t("adminSettings.salaryValidation.infoTitle", "Information")}</p>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                            Ces coordonnees seront affichees aux utilisateurs sur la page d'abonnement {t("adminSettings.status.premium", "Premium")}.
                            Elles leur permettront d'effectuer les virements bancaires pour activer leurs abonnements.
                        </p>
                    </div>
                </div>
            </SettingsTabCard>
        </TabsContent>
    );
}

export function HomeSettingsTab({ settings, onSettingChange, t }: SharedProps) {
    const homeSections = settings.home_sections_config || [];
    const popularSearches = settings.popular_searches_config || [];

    const moveSection = (index: number, direction: -1 | 1) => {
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= homeSections.length) return;

        const nextSections = [...homeSections];
        [nextSections[index], nextSections[nextIndex]] = [nextSections[nextIndex], nextSections[index]];
        onSettingChange("home_sections_config", nextSections);
    };

    return (
        <TabsContent value="home" className="mt-0 space-y-8">
            <SettingsTabCard
                title={t("adminSettings.sections.homeLayout.title", "Agencement de Accueil")}
                description={t("adminSettings.sections.homeLayout.desc", "Gerez la visibilite et ordre des sections de votre page accueil.")}
            >
                <div className="space-y-4">
                    {homeSections.map((section, index) => (
                        <div key={section.id} className="flex items-center justify-between rounded-[2rem] border border-border/10 bg-white/50 p-6 dark:bg-slate-800/50">
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col gap-2">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" disabled={index === 0} onClick={() => moveSection(index, -1)}>
                                        <ChevronUp className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" disabled={index === homeSections.length - 1} onClick={() => moveSection(index, 1)}>
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div>
                                    <p className="font-black capitalize">{section.id.replace("_", " ")}</p>
                                    <p className="text-xs text-muted-foreground uppercase">
                                        {t("adminSettings.homeLayout.sectionBlock", "Bloc Section")} #{index + 1}
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={section.visible}
                                onCheckedChange={(checked) =>
                                    onSettingChange(
                                        "home_sections_config",
                                        homeSections.map((item, itemIndex) => itemIndex === index ? { ...item, visible: checked } : item)
                                    )
                                }
                            />
                        </div>
                    ))}
                </div>

                <div className="space-y-4">
                    {popularSearches.map((item, index) => (
                        <div key={`${item.label}-${index}`} className="grid gap-4 rounded-[2rem] border border-border/10 bg-white/50 p-6 md:grid-cols-[1fr_2fr_auto] dark:bg-slate-800/50">
                            <Input
                                value={item.label}
                                onChange={(event) =>
                                    onSettingChange(
                                        "popular_searches_config",
                                        popularSearches.map((search, searchIndex) =>
                                            searchIndex === index ? { ...search, label: event.target.value } : search
                                        )
                                    )
                                }
                                placeholder={t("adminSettings.popularSearches.tagPlaceholder", "Tag")}
                                className="h-12 rounded-xl"
                            />
                            <Input
                                value={item.href}
                                onChange={(event) =>
                                    onSettingChange(
                                        "popular_searches_config",
                                        popularSearches.map((search, searchIndex) =>
                                            searchIndex === index ? { ...search, href: event.target.value } : search
                                        )
                                    )
                                }
                                placeholder="/businesses?..."
                                className="h-12 rounded-xl"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-full text-rose-500"
                                onClick={() =>
                                    onSettingChange(
                                        "popular_searches_config",
                                        popularSearches.filter((_, searchIndex) => searchIndex !== index)
                                    )
                                }
                            >
                                <AlertTriangle className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    <Button
                        variant="outline"
                        className="h-12 rounded-xl border-dashed"
                        onClick={() => onSettingChange("popular_searches_config", [...popularSearches, { label: "", href: "" }])}
                    >
                        + {t("adminSettings.popularSearches.add", "Ajouter un tag de recherche")}
                    </Button>
                </div>
            </SettingsTabCard>
        </TabsContent>
    );
}

export function SocialSettingsTab({ settings, onSettingChange, t }: SharedProps) {
    const socialFields = [
        { key: "facebook_url" as const, label: "Facebook", placeholder: "facebook.com/platform" },
        { key: "instagram_url" as const, label: "Instagram", placeholder: "instagram.com/platform" },
        { key: "twitter_url" as const, label: "X (Twitter)", placeholder: "x.com/platform" },
        { key: "linkedin_url" as const, label: "LinkedIn", placeholder: "linkedin.com/company/platform" },
    ];

    return (
        <TabsContent value="social" className="mt-0">
            <SettingsTabCard
                title={t("adminSettings.sections.social.title", "Ecosysteme Social")}
                description={t("adminSettings.sections.social.desc", "Connectez vos profils officiels pour reassurance utilisateur.")}
            >
                <div className="grid gap-6 md:grid-cols-2">
                    {socialFields.map((field) => (
                        <SettingInput
                            key={field.key}
                            id={field.key}
                            label={field.label}
                            value={settings[field.key] || ""}
                            onChange={(value) => onSettingChange(field.key, value)}
                            placeholder={field.placeholder}
                        />
                    ))}
                </div>
            </SettingsTabCard>
        </TabsContent>
    );
}

export function PartnerSettingsTab({ settings, onSettingChange, t }: SharedProps) {
    return (
        <TabsContent value="partner" className="mt-0">
            <SettingsTabCard
                title={t("adminSettings.sections.partner.title", "Gestion du Partenaire RH")}
                description={t("adminSettings.sections.partner.desc", "Configurez application partenaire affichee sur la plateforme.")}
            >
                <div className="grid gap-6 md:grid-cols-2">
                    <SettingInput
                        id="partner_app_name"
                        label={t("adminSettings.partner.nameLabel", "Nom du Partenaire")}
                        value={settings.partner_app_name || ""}
                        onChange={(value) => onSettingChange("partner_app_name", value)}
                        placeholder={t("adminSettings.partner.namePlaceholder", "Ex: MOR RH")}
                    />
                    <SettingInput
                        id="partner_app_url"
                        label={t("adminSettings.partner.urlLabel", "URL de l'Application")}
                        value={settings.partner_app_url || ""}
                        onChange={(value) => onSettingChange("partner_app_url", value)}
                        placeholder="https://..."
                    />
                </div>
            </SettingsTabCard>
        </TabsContent>
    );
}

export function SecuritySettingsTab({ settings, onSettingChange, t }: SharedProps) {
    const securityItems = [
        {
            key: "maintenance_mode" as const,
            label: t("adminSettings.security.maintenanceLabel", "Mode Maintenance Actif"),
            desc: t("adminSettings.security.maintenanceDesc", "Le site sera inaccessible pour les visiteurs."),
            warning: true,
        },
        {
            key: "allow_new_registrations" as const,
            label: t("adminSettings.security.registrationsLabel", "Ouverture des Inscriptions"),
            desc: t("adminSettings.security.registrationsDesc", "Permettre a de nouveaux utilisateurs de rejoindre la plateforme."),
            warning: false,
        },
    ];

    return (
        <TabsContent value="security" className="mt-0">
            <SettingsTabCard
                title={t("adminSettings.sections.security.title", "Politiques de Securite")}
                description={t("adminSettings.sections.security.desc", "Controlez exposition publique et flux inscription.")}
            >
                {securityItems.map((item) => (
                    <div
                        key={item.key}
                        className={cn(
                            "flex items-center justify-between rounded-[2rem] border p-6",
                            item.warning ? "border-rose-500/10 bg-rose-500/5" : "border-border/10 bg-white/40 dark:bg-slate-950/20"
                        )}
                    >
                        <div>
                            <p className={cn("font-black uppercase", item.warning ? "text-rose-600" : "text-slate-900 dark:text-white")}>
                                {item.label}
                            </p>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                        <Switch
                            checked={Boolean(settings[item.key])}
                            onCheckedChange={(checked) => onSettingChange(item.key, checked)}
                            className={item.warning ? "data-[state=checked]:bg-rose-500" : "data-[state=checked]:bg-primary"}
                        />
                    </div>
                ))}
            </SettingsTabCard>
        </TabsContent>
    );
}

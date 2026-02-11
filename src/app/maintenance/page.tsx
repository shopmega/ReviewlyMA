import { Wrench } from "lucide-react";
import { getSiteSettings } from "@/lib/data";

export default async function MaintenancePage() {
    const siteSettings = await getSiteSettings();
    const siteName = siteSettings.site_name || 'Platform';

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-950">
            {/* Background decorative elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-600/10 blur-[120px] rounded-full animate-pulse delay-700" />

            <div className="relative z-10 w-full max-w-2xl px-6">
                <div className="backdrop-blur-2xl bg-white/[0.03] border border-white/10 rounded-[40px] p-8 md:p-16 text-center shadow-2xl overflow-hidden relative group">
                    {/* Inner glass accent */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />

                    <div className="relative z-20">
                        <div className="mx-auto mb-8 w-24 h-24 rounded-3xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30 transform transition-transform group-hover:scale-110 duration-500 shadow-lg shadow-blue-600/20">
                            <Wrench className="h-10 w-10 text-blue-400 rotate-12" />
                        </div>

                        <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
                            {siteName} <span className="text-blue-500">en pause</span>
                        </h1>

                        <div className="h-1 w-24 bg-gradient-to-r from-blue-600 to-amber-500 mx-auto mb-8 rounded-full" />

                        <p className="text-xl md:text-2xl text-slate-300 font-medium mb-10 max-w-lg mx-auto leading-relaxed">
                            Nous effectuons quelques réglages pour vous offrir une expérience <span className="text-white font-bold">exceptionnelle</span>.
                        </p>

                        <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 text-slate-400 text-sm font-bold backdrop-blur-md">
                            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                            Retour prévu très prochainement
                        </div>
                    </div>
                </div>

                <p className="text-center mt-12 text-slate-500 text-xs font-bold tracking-widest uppercase opacity-50">
                    &copy; {new Date().getFullYear()} {siteName}
                </p>
            </div>
        </div>
    );
}

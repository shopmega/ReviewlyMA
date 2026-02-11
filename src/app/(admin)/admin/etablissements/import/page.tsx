import { verifyAdminSession } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import CSVImportForm from './csv-import-form';

export default async function ImportBusinessesPage() {
    await verifyAdminSession();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/admin/etablissements">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Importation en masse</h1>
                    <p className="text-muted-foreground">
                        Ajoutez plusieurs établissements via un fichier CSV.
                    </p>
                </div>
            </div>

            <CSVImportForm />
        </div>
    );
}

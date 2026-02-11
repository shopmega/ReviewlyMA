'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { bulkImportBusinesses, CSVBusinessData, ImportResult } from '@/app/actions/admin-import';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, CheckCircle, AlertTriangle, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CSVImportForm() {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<CSVBusinessData[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setImportResult(null);
            parseFile(selectedFile);
        }
    };

    const parseFile = (file: File) => {
        Papa.parse<CSVBusinessData>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    toast({
                        title: "Erreur de lecture CSV",
                        description: "Le fichier contient des erreurs de formatage.",
                        variant: "destructive"
                    });
                }
                // Preview first 5 rows
                setPreviewData(results.data.slice(0, 5));
            }
        });
    };

    const handleImport = async () => {
        if (!file) return;

        setIsUploading(true);
        setImportResult(null);

        Papa.parse<CSVBusinessData>(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const result = await bulkImportBusinesses(results.data);
                    setImportResult(result);

                    if (result.success) {
                        toast({
                            title: "Import réussi",
                            description: `${result.count} entreprises importées avec succès.`
                        });
                        setFile(null);
                        setPreviewData([]);
                        // Reset input? Hard with React controlled input for file.
                    } else {
                        toast({
                            title: "Échec de l'import",
                            description: "Certaines erreurs sont survenues.",
                            variant: "destructive"
                        });
                    }
                } catch (error) {
                    toast({
                        title: "Erreur système",
                        description: "Une erreur inattendue est survenue.",
                        variant: "destructive"
                    });
                } finally {
                    setIsUploading(false);
                }
            }
        });
    };

    const downloadTemplate = () => {
        const headers = ['name', 'category', 'subcategory', 'city', 'location', 'description', 'phone', 'website', 'price_range', 'is_premium', 'tier', 'tags'];
        const sample = ['Café Exemple', 'Restauration', 'Café', 'Casablanca', '123 Rue Exemple, Maarif', 'Un super café', '0600000000', 'https://example.com', '2', 'true', 'pro', 'wifi,terrasse'];
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), sample.join(',')].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "modele_import_entreprises.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Importer des entreprises (CSV)</CardTitle>
                    <CardDescription>
                        Sélectionnez un fichier CSV contenant les colonnes suivantes :
                        <code className="text-xs bg-slate-100 p-1 rounded ml-1">name, category, city</code> (requis), et autres.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <Input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="flex-1"
                        />
                        <Button variant="outline" onClick={downloadTemplate} type="button">
                            <FileDown className="mr-2 h-4 w-4" />
                            Modèle CSV
                        </Button>
                    </div>

                    {file && previewData.length > 0 && (
                        <div className="border rounded-md p-4 bg-slate-50">
                            <h4 className="font-semibold mb-2 text-sm text-slate-700">Aperçu ({previewData.length} lignes)</h4>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nom</TableHead>
                                            <TableHead>Catégorie</TableHead>
                                            <TableHead>Ville</TableHead>
                                            <TableHead>Tier</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {previewData.map((row, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium">{row.name}</TableCell>
                                                <TableCell>{row.category}</TableCell>
                                                <TableCell>{row.city}</TableCell>
                                                <TableCell>
                                                    {row.tier ? <Badge variant="secondary">{row.tier}</Badge> : '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <Button onClick={handleImport} disabled={isUploading}>
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Importation...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="mr-2 h-4 w-4" />
                                            Lancer l'import
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {importResult && (
                <div className="space-y-4">
                    <Alert variant={importResult.success ? "default" : "destructive"}>
                        {importResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        <AlertTitle>{importResult.success ? "Import terminé" : "Erreur d'import"}</AlertTitle>
                        <AlertDescription>
                            {importResult.count} entreprises ajoutées.
                            {importResult.errors.length > 0 && (
                                <div className="mt-2 text-sm opacity-90 max-h-40 overflow-y-auto">
                                    <p className="font-semibold">Détails :</p>
                                    <ul className="list-disc pl-5">
                                        {importResult.errors.slice(0, 20).map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                        {importResult.errors.length > 20 && <li>... et {importResult.errors.length - 20} autres erreurs.</li>}
                                    </ul>
                                </div>
                            )}
                        </AlertDescription>
                    </Alert>
                </div>
            )}
        </div>
    );
}

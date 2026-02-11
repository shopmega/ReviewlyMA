import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AddCollectionForm } from "./AddCollectionForm";
import { CollectionRow } from "./CollectionRow";
import { AddFeaturedBusinessForm } from "./AddFeaturedBusinessForm";
import { FeaturedBusinessRow } from "./FeaturedBusinessRow";
import { revalidatePath } from "next/cache";

// Fetch collections from Supabase
async function getCollections() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
  const { data, error } = await supabase
    .from('seasonal_collections')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching collections:', error);
    return [];
  }
  return data || [];
}

// Fetch featured businesses
async function getFeaturedBusinesses() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, location')
    .eq('is_featured', true);

  if (error) {
    console.error('Error fetching featured:', error);
    return [];
  }
  return data || [];
}

export default async function HomepageSettingsPage() {
  const [collections, featuredBusinesses] = await Promise.all([
    getCollections(),
    getFeaturedBusinesses(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestion de la page d'accueil</h1>
        <p className="text-muted-foreground">
          Gérez le contenu mis en avant sur la page d'accueil.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Featured Businesses Section */}
        <Card>
          <CardHeader>
            <CardTitle>Entreprises à la une</CardTitle>
            <CardDescription>
              Gérez les entreprises en avant sur la page d'accueil. ({featuredBusinesses.length} entreprises)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <AddFeaturedBusinessForm />

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {featuredBusinesses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Aucune entreprise à la une. Ajoutez-en un ci-dessus.
                      </TableCell>
                    </TableRow>
                  ) : (
                    featuredBusinesses.map((item: any) => (
                      <FeaturedBusinessRow key={item.id} business={item} />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Seasonal Collections Section */}
        <Card>
          <CardHeader>
            <CardTitle>Carrousel "Découvertes de saison"</CardTitle>
            <CardDescription>
              Gérez les collections thématiques du carrousel. ({collections.length} collections)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <AddCollectionForm />

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aperçu</TableHead>
                    <TableHead>Titre</TableHead>
                    <TableHead>Actif</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collections.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Aucune collection. Ajoutez-en une ci-dessus.
                      </TableCell>
                    </TableRow>
                  ) : (
                    collections.map((item: any) => (
                      <CollectionRow key={item.id} collection={item} />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

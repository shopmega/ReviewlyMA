# Migration Manuelle : Amenities

Il semble que la migration automatique pour créer la table `amenities` n'a pas pu s'exécuter (probablement dû à une demande de mot de passe base de données).

Veuillez exécuter la commande suivante dans votre terminal pour créer la table et insérer les données par défaut :

```powershell
psql $DATABASE_URL -f supabase/migrations/20260125_create_amenities.sql
```

Si on vous demande un mot de passe, entrez votre mot de passe Postgres (souvent `postgres`, `root`, ou votre nom d'utilisateur Windows `Zouhair`).

Une fois cette commande exécutée avec succès, la page "Modifier le profil" chargera automatiquement la liste des équipements depuis la base de données.

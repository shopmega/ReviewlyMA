# Plan de Monétisation et Estimation Budgétaire - Avis.ma

Ce document détaille les stratégies de monétisation recommandées pour la plateforme Avis.ma, ainsi qu'une estimation des coûts opérationnels et des revenus potentiels.

## 1. Stratégie de Monétisation (Modèle Freemium + Ads)

### A. Abonnements Professionnels (Tiered SaaS)
Actuellement, la plateforme utilise un modèle binaire (Gratuit/Premium). Il est conseillé de passer à trois niveaux :

| Fonctionnalité | Gratuit | Business Growth | Business Pro |
| :--- | :---: | :---: | :---: |
| Informations de base | ✅ | ✅ | ✅ |
| Réponse aux avis | ✅ | ✅ | ✅ |
| Badge "Vérifié" | ❌ | ✅ | ✅ |
| Sans publicités tierces | ❌ | ✅ | ✅ |
| Analytics basiques (vues) | ❌ | ✅ | ✅ |
| Boutons d'action (WhatsApp/Devis) | ❌ | ❌ | ✅ |
| Priorité dans les recherches | ❌ | ❌ | ✅ |
| Diffusion d'actualités aux abonnés | ❌ | ❌ | ✅ |
| **Tarif Estimé (MAD)** | **0 DH** | **99 DH / mois** | **299 DH / mois** |

### B. Publicité et Boosts (Revenue à la performance)
1.  **Search Ads** : Apparaître en top de liste pour des mots-clés spécifiques (ex: "Spa Marrakech").
2.  **Home Spotlight** : Mise en avant sur la page d'accueil dans la section "Collections" ou "Établissements vedettes".
3.  **Annonces Concurrentes** : Afficher sa fiche sur les pages des concurrents qui sont en mode "Gratuit".

### C. Services à Valeur Ajoutée (One-time or Add-ons)
-   **Kit de Réputation Physique** : Ventes de supports (cavalier de table, autocollants vitrine) avec QR Codes personnalisés pour récolter des avis.
-   **Pack Recrutement** : Mise en avant d'offres d'emploi (utilisant les modules existants "salaries" et "interviews").

---

## 2. Estimation des Coûts (Annuel)

### Infrastructure Technique
-   **Hébergement (Vercel & Supabase Pro)** : ~4,500 MAD
-   **Services Maps (Google Maps API)** : ~5,000 MAD (dépend du trafic)
-   **Envoi Emails/SMS (Notifications)** : ~2,500 MAD
-   **Nom de Domaine et Sécurité** : ~500 MAD
-   **Total IT** : **~12,500 MAD / an**

### Opérations et Marketing
-   **Marketing Digital (Facebook/Google Ads)** : ~30,000 MAD (acquisition utilisateurs)
-   **Création de Contenu / SEO** : ~15,000 MAD
-   **Total Ops** : **~45,000 MAD / an**

**Total Budget de Fonctionnement : ~57,500 MAD / an.**

---

## 3. Estimation des Revenus (Objectif An 1)

Hypothèse : 2 500 établissements enregistrés d'ici la fin de l'année 1.

| Source de Revenu | Volume | CA Estimé (MAD/an) |
| :--- | :--- | :--- |
| **Business Growth** (4% conv.) | 100 abonnés x 990 DH* | 99,000 DH |
| **Business Pro** (1% conv.) | 25 abonnés x 2,900 DH* | 72,500 DH |
| **Boosts & Publicité** | - | 25,000 DH |
| **Vente de Kits QR** | 50 kits x 200 DH | 10,000 DH |
| **TOTAL REVENUS BRUTS** | | **206,500 DH** |

*\*Basé sur un forfait annuel avec 2 mois offerts.*

### Résumé Financier :
-   **Revenu Brut** : 206,500 MAD
-   **Coûts** : - 57,500 MAD
-   **Bénéfice Net (avant impôts)** : **149,000 MAD (~14,900 $)**

---

## 4. Prochaines Étapes Recommandées
1.  **Automatiser les paiements** : Intégrer une solution comme CMI ou Stripe (si disponible) pour réduire la validation manuelle actuelle.
2.  **Dashboard Analytics Pro** : Développer la vue "Statistiques" pour justifier la valeur du pack Growth/Pro. (Déjà capable de tracker `whatsapp_click` et `affiliate_click`).
3.  **Module "Lead Gen"** : Implémenter le bouton WhatsApp direct et les liens d'affiliation personnalisés (Booking.com, etc.). -> **DÉJÀ IMPLÉMENTÉ**.
4.  **Affiliations Hôtelières** : Déployer des bannières Booking.com intelligentes sur les pages de recherche de villes touristiques (Marrakech, Agadir).
5.  **Native Ads** : Permettre l'achat d'emplacements "Sponsorisés" qui s'insèrent dans la grille de résultats (ex: position 4).

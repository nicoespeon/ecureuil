# 5. Un foyer par déploiement, liens secrets hachés en D1, rôle dérivé du secret

Date : 2026-11-04

## Statut

Accepté. Précise l'[ADR 3](0003-hebergement-cloudflare-effect-confine-au-coeur.md) sur l'accès par deux liens secrets.

## Contexte

L'app sert un seul foyer de deux personnes, sans comptes : chacune entre par son lien secret (ADR 3). Le serveur est un Worker Cloudflare ; il garde ses données dans [D1](https://developers.cloudflare.com/d1/), la base SQL serverless de Cloudflare, bâtie sur SQLite. Il doit savoir à quel foyer appartient une requête, reconnaître le lien sans garder le secret en clair, et savoir qui agit. Chaque événement du journal porte déjà son `actor` (ADR 4), écrit par l'appareil : sans contrôle, l'invité pourrait écrire au nom du propriétaire. La tâche « Accès » doit pouvoir régénérer un lien sans redéployer.

## Décision

**Un foyer par déploiement.** Le Worker et sa base D1 sont le foyer : aucune table, colonne ou route ne porte de notion de foyer. Un second foyer serait un second déploiement.

**Les liens vivent hachés dans D1.** La table `lien` garde une ligne par rôle (`proprietaire`, `invite`) : le SHA-256 du secret et sa date de création. Le serveur hache le secret reçu dans `Authorization: Bearer <secret>` et le compare en temps constant aux hachés stockés. Régénérer un lien remplace sa ligne, l'ancien secret cesse de marcher, sans redéploiement. Un SHA-256 simple suffit : le secret est aléatoire (32 octets), pas un mot de passe qu'on devinerait par dictionnaire, donc un hachage lent n'ajoute rien.

**Le rôle vient du secret reconnu.** Un push dont un événement porte un `actor` autre que le rôle du lien est refusé en bloc (403) : rien n'est écrit. Le tirage est ouvert aux deux rôles.

## Conséquences

- Le schéma et les requêtes restent ceux d'un seul journal, sans filtre par foyer.
- Les secrets ne sont jamais stockés : une fuite de la base ne donne pas l'accès.
- La première paire de liens se crée par une commande (`pnpm --filter api liens`) ; la régénération depuis l'app viendra avec la tâche « Accès ».
- Le serveur garantit le `actor` de chaque événement ; le `device` reste déclaratif (ADR 4).

## Alternatives écartées

- **Plusieurs foyers dans une base** (colonne `foyer` partout) : du code et des index pour un besoin qui n'existe pas ; un déploiement de plus coûte zéro sur l'offre gratuite.
- **Secrets en variables d'environnement du Worker** (`wrangler secret`) : plus simple au départ, mais régénérer un lien demanderait un redéploiement.
- **Hachage lent (PBKDF2, scrypt)** : utile contre la force brute de mots de passe humains, inutile pour un secret aléatoire de 256 bits, et coûteux en CPU sur chaque requête d'un Worker.
- **Faire confiance à l'`actor` envoyé** : l'invité pourrait arbitrer ses propres demandes en se déclarant propriétaire.

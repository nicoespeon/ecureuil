# 3. Hébergement Cloudflare, Effect confiné au cœur

Date : 2026-11-04

## Statut

Accepté

## Contexte

C'est une app personnelle pour deux personnes. Elle ne doit rien coûter à faire tourner, se déployer depuis `main` sans cérémonie, et rester maintenable par une seule personne aidée d'agents. Le serveur de synchronisation est petit : accepter les événements poussés, servir les tirages par curseur, hacher les deux liens secrets. Le frontend est une PWA mobile-first qui doit aussi fonctionner sur un Mac pour la configuration.

## Décision

**Hébergement : Cloudflare.** `apps/web` (Vite + React + TypeScript strict + Tailwind, PWA) se déploie sur Cloudflare Pages ; `apps/api` (Hono sur Cloudflare Workers) stocke le journal dans D1. Les deux sont sur l'offre gratuite et se déploient depuis `main`. L'accès passe par deux liens secrets générés par le foyer (secret dans le fragment d'URL, haché côté serveur, régénérable) ; pas de comptes, pas de notifications push en v1.

**Effect, confiné au cœur.** `packages/domain` (événements, reducer, les ports `EventStore` / `SyncTransport` / `Clock`) et `packages/wire` (le contrat Effect Schema partagé entre web et API) utilisent Effect. Les composants React ne voient jamais Effect : ils consomment un état simple et appellent des fonctions simples. Les deux packages sont source-only, bundlés par leurs consommateurs.

**Monorepo** : pnpm workspace + Turborepo + Biome + lefthook, selon les conventions de Choravo. Un seul `pnpm check` rapide (Biome + typecheck + Vitest) tourne localement à chaque commit et en CI.

## Conséquences

- Hébergement à coût nul et un déploiement qui est un push sur `main`.
- Workers contraint le serveur au modèle du fetch handler et D1 à la sémantique SQLite ; les deux conviennent à un journal append-only.
- Effect apporte des erreurs typées, des services pour les ports et un seul Schema pour les deux bouts du fil, sans fuir dans le code de rendu où il nuirait à la lisibilité et à la taille du bundle.
- Deux packages Effect à garder en phase avec les apps ; le contrat wire est la couture qui les garde honnêtes.

## Alternatives écartées

- **Convex** comme backend : pas de persistance locale et un moteur hors ligne archivé (voir ADR 2).
- **Fly.io** avec un petit serveur Node ou Elixir : ça marche (Choravo tourne là), mais ce n'est pas gratuit au repos et il faut une image et une base de données à exploiter. Gardé en **plan B** si Workers ou D1 bloquent.
- **Effect partout, React compris** : cohérent, mais chaque composant porterait la plomberie du runtime Effect et l'UI serait plus dure à lire et à confier à une passe de design.
- **Pas d'Effect du tout** : possible pour un projet de cette taille, mais les ports, les erreurs typées et le Schema partagé sont exactement les parties qui en profitent, et le coût est contenu dans deux packages.

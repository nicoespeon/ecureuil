# 1. Catalogue du foyer avec un rayon par magasin

Date : 2026-11-04

## Statut

Accepté

## Contexte

Notre liste actuelle (Cookidoo) est plate : la seule façon de grouper les articles est un « . » en tête pour trier les articles Costco en premier. En magasin, on relit toute la liste à chaque rayon. On alterne entre deux magasins dont les plans diffèrent, et environ 90 % de ce qu'on achète revient de semaine en semaine.

## Décision

Le foyer possède un **catalogue d'articles**. Chaque article a, pour chaque magasin, un des **rayons** de ce magasin, ou est marqué « pas vendu ici ». Les rayons sont **propres à chaque magasin** : chacun nomme et ordonne les siens, par glisser-déposer, avec des rayons par défaut à la création.

La **liste** est une vue : les articles du catalogue marqués « à acheter », groupés par les rayons du magasin actif dans l'ordre de ce magasin. « Non classé » est en bas, « Pas chez X » est replié. Changer de magasin retrie la liste ; cela ne change jamais son contenu.

L'ajout passe par un seul champ « Ajouter » qui filtre le catalogue (champ vide : les articles les plus fréquents) ; sans correspondance, l'article est créé à la volée, à acheter et non classé.

## Conséquences

- Configurer une fois, ré-ajouter d'un geste : le rayon d'un article se choisit une fois par magasin, puis la liste suit le parcours du magasin pour toujours.
- Deux concepts à maintenir (catalogue et liste) au lieu d'une liste plate. Le champ d'ajout rapide cache cela au quotidien.
- L'ordre des rayons est local à chaque magasin : pas de taxonomie globale des rayons à négocier, et un nouveau magasin démarre avec ses rayons par défaut sans toucher aux autres.
- Les articles sont des entités avec une identité, ce dont le journal d'événements (ADR 2) a besoin de toute façon.

## Alternatives écartées

- **Liste plate avec étiquettes ou préfixes** (le bricolage actuel) : pas d'ordre de parcours stable, et les étiquettes seraient à retaper à chaque ajout.
- **Une liste globale de rayons partagée par tous les magasins** : impose un ordre à des magasins dont les plans diffèrent ; la « Boulangerie » n'est pas au même endroit chez Costco et chez Maxi.
- **Le rayon sur l'article, pas par magasin** : même problème ; un article a besoin d'un rayon différent dans chaque magasin.

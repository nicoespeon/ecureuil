# PWA : vite-plugin-pwa, Workbox, icônes, Cloudflare Pages

Faits vérifiés le 2026-11-05 pour ajouter le manifest, le service worker et les icônes à `apps/web` (Vite 8.3.5, React 19, Cloudflare Pages). Chaque fait porte sa source ; « lu dans le code » veut dire lu dans le tarball npm (`npm pack`) de la version citée, avec le lien vers le même fichier sur GitHub au tag correspondant.

## Versions et dépendances

| Paquet                       | Dernière version | Publiée le | `peerDependencies`                                                                                                                       |
| ---------------------------- | ---------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `vite-plugin-pwa`            | 2.0.0            | 2026-10-03 | `vite ^3.1.0 … ^7.0.0 \|\| ^8.0.0`, `workbox-build ^7.4.1`, `workbox-window ^7.4.1`, `@vite-pwa/assets-generator ^1 \|\| ^2` (optionnel) |
| `@vite-pwa/assets-generator` | 2.0.0            | 2026-09-12 | aucune ; dépend de `sharp ^0.35.4` et `sharp-ico ^0.1.5`                                                                                 |
| `workbox-build`              | 7.4.1            | 2026-05-04 | dépendance directe du plugin                                                                                                             |
| `sharp`                      | 0.35.5           | 2026-09-27 | binaires précompilés en `optionalDependencies` (`@img/sharp-*`)                                                                          |

Source : `npm view <paquet> version peerDependencies peerDependenciesMeta dependencies time --json`. Tous ont plus d'un jour : `minimumReleaseAge` de pnpm 12 les accepte (voir [`ci-cd.md`](ci-cd.md)).

- **Vite 8** est accepté depuis 1.3.0 (« Add vite 8 peer dependency support »). La 2.0.0 n'ajoute que `@vite-pwa/assets-generator ^2.0.0` en peer et exige Node ≥ 20.19.0. [Release v1.3.0](https://github.com/vite-pwa/vite-plugin-pwa/releases/tag/v1.3.0), [release v2.0.0](https://github.com/vite-pwa/vite-plugin-pwa/releases/tag/v2.0.0), [README](https://github.com/vite-pwa/vite-plugin-pwa/blob/v2.0.0/README.md)
- **Problèmes Vite 8 / Rolldown ouverts**, aucun ne nous touche :
  - avertissement de dépréciation `inlineDynamicImports`, seulement avec `strategies: 'injectManifest'` (le SW est alors bundlé par Vite). [#912](https://github.com/vite-pwa/vite-plugin-pwa/issues/912)
  - « Rolldown failed to resolve import "workbox-window" » avec pnpm, seulement si on importe `virtual:pwa-register*` ; contournement du mainteneur : installer `workbox-window` en devDependency. [#936](https://github.com/vite-pwa/vite-plugin-pwa/issues/936)
  - SW généré une fois par environnement avec `builder.sharedConfigBuild: true` (Nitro, SSR). [#940](https://github.com/vite-pwa/vite-plugin-pwa/issues/940)
- `generateSW` passe par `workbox-build`, qui bundle le SW avec son propre Rollup, pas avec Vite/Rolldown. Lu dans le code : `generateServiceWorker` appelle `workbox-build.generateSW(options.workbox)`. [src/modules.ts](https://github.com/vite-pwa/vite-plugin-pwa/blob/v2.0.0/src/modules.ts)
- **`sharp` sans script de build** : `sharp@0.35.5` et `@img/sharp-darwin-arm64@0.35.5` n'ont ni `install` ni `postinstall` (`npm view … scripts`). Pas d'entrée `allowBuilds` à ajouter pour pnpm 12.
- `@vite-pwa/assets-generator` 2.0.0 est ESM uniquement. [Release v2.0.0](https://github.com/vite-pwa/assets-generator/releases/tag/v2.0.0)

## `registerType` et `injectRegister` : ce qui se passe au déploiement

- **Défauts** : `registerType: 'prompt'`, `injectRegister: 'auto'`. Lu dans le code. [src/options.ts](https://github.com/vite-pwa/vite-plugin-pwa/blob/v2.0.0/src/options.ts)
- **`autoUpdate` force `skipWaiting` et `clientsClaim` à `true`, mais seulement si `injectRegister` vaut `'auto'` (ou `null`)** : `if ((injectRegister === 'auto' || injectRegister == null) && registerType === 'autoUpdate')`. Avec `injectRegister: 'script'` écrit en toutes lettres, le SW n'appelle pas `skipWaiting()`. Lu dans le code, même fichier. La doc dit seulement que le plugin force ces deux options. [Automatic reload](https://vite-pwa-org.netlify.app/guide/auto-update)
- **`injectRegister: 'auto'` sans import de module virtuel** devient `'script'` : le plugin ajoute `<script id="vite-plugin-pwa:register-sw" src="/registerSW.js">` dans `<head>` et émet `registerSW.js`, qui fait seulement `navigator.serviceWorker.register('/sw.js', { scope: '/' })` au `load`. Pas de rechargement, pas de callback. Lu dans le code. [src/html.ts](https://github.com/vite-pwa/vite-plugin-pwa/blob/v2.0.0/src/html.ts), [src/api.ts](https://github.com/vite-pwa/vite-plugin-pwa/blob/v2.0.0/src/api.ts), [Register service worker](https://vite-pwa-org.netlify.app/guide/register-service-worker)
- **Le rechargement automatique de la page ouverte vient du module virtuel**, pas du SW : `registerSW()` de `virtual:pwa-register` écoute `activated` de `workbox-window` et appelle `window.location.reload()` si `event.isUpdate`. Sans import, aucun onglet n'est rechargé. Lu dans le code. [src/client/build/register.ts](https://github.com/vite-pwa/vite-plugin-pwa/blob/v2.0.0/src/client/build/register.ts) ; la doc le dit aussi : sans import d'un module virtuel, « any client tab/window will not be reloaded ». [Automatic reload](https://vite-pwa-org.netlify.app/guide/auto-update)
- **Cycle de vie du SW** :
  - le navigateur cherche une mise à jour à chaque navigation dans le scope, en ignorant par défaut le cache HTTP pour le script du SW (Chrome 68+).
  - sans `skipWaiting()`, le nouveau SW attend qu'aucun client ne soit contrôlé par l'ancien : un simple rafraîchissement ne suffit pas.
  - avec `skipWaiting()`, il s'active dès l'installation ; `clients.claim()` lui fait prendre le contrôle des pages ouvertes.

  [The service worker lifecycle](https://web.dev/articles/service-worker-lifecycle), [`register()` et `updateViaCache`](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register)
- **Conséquence** : avec `autoUpdate` + `injectRegister` par défaut + sans import, le lancement N récupère `sw.js`, installe et active le nouveau SW en arrière-plan pendant que la page tourne avec l'ancien JS (son `index.html` vient de l'ancien precache) ; le lancement N+1 sert le nouvel `index.html`. Aucun bandeau, aucun rechargement. Déduit des trois points précédents, pas observé.
  Avec `'prompt'` sans code, le nouveau SW resterait en attente tant qu'un client existe, potentiellement longtemps pour une PWA iOS jamais vraiment fermée.
- **Types TS si on importe un module virtuel** : `vite-plugin-pwa/client` (qui référence `vanillajs.d.ts`, `react.d.ts`…) dans `compilerOptions.types`, ou `/// <reference types="vite-plugin-pwa/client" />`. Exporté par le `package.json` (`"./client": { "types": "./client.d.ts" }`), lu dans le tarball. Plus `workbox-window` en devDependency (#936). Inutile si on n'importe rien.

## Workbox `generateSW` et requêtes cross-origin

- **`globPatterns` par défaut** : `["**/*.{js,wasm,css,html}"]` ; `maximumFileSizeToCacheInBytes` 2 Mio. [GenerateSWOptions.json](https://github.com/GoogleChrome/workbox/blob/v7.4.1/packages/workbox-build/src/schema/GenerateSWOptions.json)
- **Ajouts du plugin au precache** : les icônes du manifest (`includeManifestIcons: true` par défaut), les fichiers de `public/` qui correspondent à `includeAssets`, et `manifest.webmanifest` lui-même, avec un hash de révision. Lu dans le code. [src/assets.ts](https://github.com/vite-pwa/vite-plugin-pwa/blob/v2.0.0/src/assets.ts)
- **Défauts `workbox` du plugin** : `navigateFallback: 'index.html'`, `cleanupOutdatedCaches: true`, `dontCacheBustURLsMatching: /^assets\//`. Lu dans le code. [src/options.ts](https://github.com/vite-pwa/vite-plugin-pwa/blob/v2.0.0/src/options.ts)
- **Le SW généré** contient `precacheAndRoute([...])`, `cleanupOutdatedCaches()`, `registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")))`, puis une route par entrée de `runtimeCaching`, rien d'autre. [sw-template.ts](https://github.com/GoogleChrome/workbox/blob/v7.4.1/packages/workbox-build/src/templates/sw-template.ts)
- **Une requête qu'aucune route ne prend va au réseau sans être touchée** : sans route ni handler par défaut, le `Router` ne rappelle pas `event.respondWith()`. [Router.ts](https://github.com/GoogleChrome/workbox/blob/v7.4.1/packages/workbox-routing/src/Router.ts)
  - `precacheAndRoute` ne répond qu'aux URL listées dans le precache, toutes same-origin ici.
  - `NavigationRoute` ne prend que `request.mode === 'navigate'`. Un `fetch()` vers `/journal` est en mode `cors`, pas `navigate`. [NavigationRoute.ts](https://github.com/GoogleChrome/workbox/blob/v7.4.1/packages/workbox-routing/src/NavigationRoute.ts)
  - Une route `RegExp` ne prend une URL cross-origin que si l'expression matche dès le premier caractère de l'URL complète. [RegExpRoute.ts](https://github.com/GoogleChrome/workbox/blob/v7.4.1/packages/workbox-routing/src/RegExpRoute.ts)
  - Une route vaut pour `GET` par défaut (`defaultMethod = 'GET'`) : un `POST /journal` n'est jamais intercepté sans route `POST` explicite. [Route.ts](https://github.com/GoogleChrome/workbox/blob/v7.4.1/packages/workbox-routing/src/Route.ts), [runtime-caching-converter.ts](https://github.com/GoogleChrome/workbox/blob/v7.4.1/packages/workbox-build/src/lib/runtime-caching-converter.ts)
- **Donc** : sans `runtimeCaching`, le SW ne cache ni `GET` ni `POST` vers `VITE_API_URL`. `navigateFallbackDenylist` ne sert que pour des navigations same-origin qui ne doivent pas recevoir `index.html` (une API sous `/api` sur la même origine, par exemple). Notre API est sur une autre origine : inutile.

## Dev, Vitest et Playwright

- **SW désactivé en `vite` dev par défaut** : `devOptions.enabled` vaut `false`. [Development](https://vite-pwa-org.netlify.app/guide/development)
  - Le plugin `vite-plugin-pwa:build` a `apply: 'build'`, le plugin dev `apply: 'serve'` ; avec `devOptions.enabled: false`, ce dernier n'injecte rien dans le HTML et ne sert ni manifest ni SW. Lu dans le code. [src/plugins/build.ts](https://github.com/vite-pwa/vite-plugin-pwa/blob/v2.0.0/src/plugins/build.ts), [src/plugins/dev.ts](https://github.com/vite-pwa/vite-plugin-pwa/blob/v2.0.0/src/plugins/dev.ts)
  - Le smoke Playwright, qui tourne sur `vite` dev, ne voit donc ni SW ni manifest.
- **Sous Vitest** (commande `serve`), seul le plugin principal agit : `config()` ajoute `ssr.noExternal: ['workbox-window']`, `configResolved` calcule les options (lecture de `package.json`, aucun appel Workbox ; le hash des assets n'est calculé qu'en build ou avec `devOptions.enabled`). Lu dans le code. [src/plugins/main.ts](https://github.com/vite-pwa/vite-plugin-pwa/blob/v2.0.0/src/plugins/main.ts), [src/options.ts](https://github.com/vite-pwa/vite-plugin-pwa/blob/v2.0.0/src/options.ts)
  - Pas de besoin de le désactiver sous Vitest. Exception : avec l'option `pwaAssets`, `configResolved` charge `sharp` même sous Vitest. Non mesuré.

## Manifest et `<head>`

- **Le plugin injecte seulement** `<link rel="manifest" href="/manifest.webmanifest">` et le script d'enregistrement, avant `</head>`, en build. Il n'injecte **pas** `<meta name="theme-color">` ni les liens d'icônes, sauf avec l'option expérimentale `pwaAssets`. Lu dans le code. [src/html.ts](https://github.com/vite-pwa/vite-plugin-pwa/blob/v2.0.0/src/html.ts), [src/pwa-assets/html.ts](https://github.com/vite-pwa/vite-plugin-pwa/blob/v2.0.0/src/pwa-assets/html.ts)
- **Défauts du manifest, fusionnés avec `manifest: {...}`** : `name`/`short_name` = `name` du `package.json` (« web » ici), `start_url` et `scope` = `base`, `display: 'standalone'`, `background_color: '#ffffff'`, `theme_color: '#42b883'`, `lang: 'en'`. Il faut donc surcharger `name`, `short_name`, `lang`, `theme_color`, `background_color`. Le build avertit si `theme_color` manque. Lu dans le code. [src/options.ts](https://github.com/vite-pwa/vite-plugin-pwa/blob/v2.0.0/src/options.ts)
- **Exigences minimales du plugin** :
  - icônes 192 et 512 ; pour l'icône maskable, deux entrées distinctes plutôt que `purpose: 'any maskable'`.
  - `theme_color` du manifest égal au `<meta name="theme-color">`, que l'on écrit soi-même dans `index.html`.
  - `apple-touch-icon` 180×180.

  [PWA Minimal Requirements](https://vite-pwa-org.netlify.app/guide/pwa-minimal-requirements)
- **Chrome** :
  - critères : `name` ou `short_name`, icônes 192 et 512, `start_url`, `display` parmi `fullscreen`/`standalone`/`minimal-ui`/`window-controls-overlay`, HTTPS. [Installability criteria](https://web.dev/articles/install-criteria)
  - plus besoin de SW pour installer depuis le menu (Chrome 108 mobile, 112 desktop) ; l'invite d'installation exige encore un handler `fetch`, que le SW Workbox fournit. [Revisiting Chrome's installability criteria](https://developer.chrome.com/blog/update-install-criteria)
- **iOS / Safari** :
  - Safari lit le manifest depuis iOS 11.4. Depuis iOS 26, tout site ajouté à l'écran d'accueil s'ouvre en web app par défaut, et les icônes du manifest sont utilisées. [WebKit, WWDC25](https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/)
  - Depuis Safari 15.4, les icônes du manifest servent quand il n'y a pas d'`apple-touch-icon` ; `apple-touch-icon` reste prioritaire. [Safari 15.4](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/)
  - `apple-mobile-web-app-capable` est l'ancien interrupteur du mode standalone, remplacé par `display` du manifest ; `apple-mobile-web-app-title` vaut `<title>` par défaut ; `apple-mobile-web-app-status-bar-style` est optionnel. [Apple, Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html) (archive, 2016)
  - On garde `<link rel="apple-touch-icon">` (PNG 180, fond opaque) pour un rendu sûr sur les iOS antérieurs à 26 ; aucune des trois balises `apple-mobile-web-app-*` n'est nécessaire avec un manifest `display: standalone` et un `<title>`. `mobile-web-app-capable` est une balise Chrome, inutile avec un manifest. Déduit des sources ci-dessus.

## Icônes : `@vite-pwa/assets-generator`

- **Preset `minimal-2023`** : `transparent` 64, 192, 512 et `favicon.ico` 48 ; `maskable` 512 ; `apple` 180. [src/presets/minimal-2023.ts](https://github.com/vite-pwa/assets-generator/blob/v2.0.0/src/presets/minimal-2023.ts)
- **Fichiers produits, à côté de l'image source** : `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico`. Lu dans le code (`defaultAssetName`, `generateAssets(…, dirname(instruction.image))`). [src/utils.ts](https://github.com/vite-pwa/assets-generator/blob/v2.0.0/src/utils.ts), [src/cli.ts](https://github.com/vite-pwa/assets-generator/blob/v2.0.0/src/cli.ts)
- **Marges et fonds par défaut** : `transparent` 5 % de marge, fond transparent ; `maskable` et `apple` 30 % de marge, fond blanc. Un `pwa-assets.config.ts` permet de les changer. Lu dans le code, même fichier `utils`.
- **CLI sans fichier de config** : `pwa-assets-generator --preset minimal-2023 public/logo.svg`. Le CLI affiche ensuite les balises `<link>` à coller et l'entrée `icons` du manifest. [CLI](https://vite-pwa-org.netlify.app/assets-generator/cli)
  - Un `pwa-assets.config.ts` (via `defineConfig`, export par défaut) n'est utile que pour personnaliser le preset ; s'il existe à la racine, le CLI le charge. [README](https://github.com/vite-pwa/assets-generator/blob/v2.0.0/README.md)
- **Option `pwaAssets` du plugin** : génère les icônes au build depuis `public/favicon.svg`, injecte les liens et `theme-color`, sans PNG commités. Marquée « experimental and is subject to (potentially breaking) changes without notice ». [Integrations](https://vite-pwa-org.netlify.app/assets-generator/integrations)

## Cloudflare Pages

- **Pas de `_headers` nécessaire pour `sw.js`** :
  - Pages sert les assets avec `Cache-Control: public, max-age=0, must-revalidate` et un `ETag` (`304` si inchangé). [Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/)
  - le navigateur ignore de toute façon le cache HTTP pour le script du SW lors de la vérification de mise à jour (voir plus haut).
- **Optimisation possible, pas requise** : un `public/_headers` (copié dans `dist/`, 100 règles maximum) peut mettre `Cache-Control: public, max-age=31536000, immutable` sur `/assets/*`, dont les noms sont hashés. [Headers](https://developers.cloudflare.com/pages/configuration/headers/)
- **SPA** : sans `404.html` à la racine, Pages sert `/` pour tout chemin qui n'est pas un asset. [Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/)

## Auditer l'installabilité

- **Lighthouse 12 a retiré la catégorie PWA** et renvoie vers la doc DevTools. [Lighthouse v12.0.0](https://github.com/GoogleChrome/lighthouse/releases/tag/v12.0.0)
- **Chrome DevTools** :
  - Application > Manifest : une section « Installability » liste les erreurs, et l'aperçu des icônes montre la zone sûre des maskables.
  - Application > Service workers : « Update on reload » et « Bypass for network ».
  - Cache Storage : le contenu du precache.

  [Debug Progressive Web Apps](https://developer.chrome.com/docs/devtools/progressive-web-apps)
- **Playwright (Chromium)** : CDP `Page.getInstallabilityErrors` et `Page.getAppManifest` via `context.newCDPSession(page)` ; `context.serviceWorkers()` liste les SW. Les deux méthodes sont typées dans `playwright-core@1.64.1/types/protocol.d.ts`, vérifié localement.
  Il faut un build servi (`vite preview`), pas le serveur dev.

## Ce qu'on en retient pour Écureuil

- `pnpm add -D -E vite-plugin-pwa@2.0.0 @vite-pwa/assets-generator@2.0.0` dans `apps/web`. Pas de `workbox-window` (aucun import de module virtuel), pas d'`allowBuilds`.
- Mise à jour silencieuse avec le moins de code : `registerType: 'autoUpdate'`, **sans** `injectRegister` (le défaut `'auto'` déclenche `skipWaiting` et `clientsClaim`), sans `workbox`, sans `runtimeCaching`, sans toucher `main.tsx`. La nouvelle version tourne au lancement qui suit celui qui a détecté la mise à jour ; la page ouverte n'est jamais rechargée.
- L'API (autre origine) n'est jamais mise en cache ; pas de `navigateFallbackDenylist`.
- Icônes commitées dans `apps/web/public/`, régénérées par un script `"pwa:icons": "pwa-assets-generator --preset minimal-2023 public/favicon.svg"`. Pas de `pwaAssets` (expérimental, et chargerait `sharp` à chaque build et sous Vitest).
- `index.html` à compléter à la main : `<meta name="theme-color">` (même valeur que le manifest), `<link rel="icon" href="/favicon.ico" sizes="48x48">`, `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`, `<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png">`. Le plugin ajoute le lien du manifest et `registerSW.js`.
- Pas de `_headers` pour Cloudflare Pages.

Configuration minimale (couleurs à choisir) :

```ts
VitePWA({
  registerType: "autoUpdate",
  includeAssets: ["favicon.ico", "favicon.svg", "apple-touch-icon-180x180.png"],
  manifest: {
    name: "Écureuil",
    short_name: "Écureuil",
    lang: "fr",
    theme_color: "#…",
    background_color: "#…",
    icons: [
      { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
      { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
      {
        src: "maskable-icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  },
});
```

`display: 'standalone'`, `start_url` et `scope` (`/`) viennent des défauts du plugin.

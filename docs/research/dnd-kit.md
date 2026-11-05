# dnd-kit pour réordonner les rayons

Date : 2026-11-05

## Question

Comment réordonner les rayons d'un magasin par glisser-déposer au doigt (usage principal sur téléphone), à la souris et au clavier, avec des annonces pour les lecteurs d'écran ?

## Faits

- Deux lignées coexistent sur npm : `@dnd-kit/core` 6.3.1 + `@dnd-kit/sortable` 10.0.0 (stables, dernière publication en décembre 2024, peer `react >=16.8.0`) et `@dnd-kit/react` 0.5.3 (nouvelle API, encore en 0.x, publiée le 2026-10-31, peer `react ^18 || ^19`). Source : `npm view <paquet> version time.modified peerDependencies`.
- On garde la lignée stable : `@dnd-kit/core` 6.3.1, `@dnd-kit/sortable` 10.0.0, `@dnd-kit/utilities` 3.2.2 (pour `CSS.Transform.toString`).
- `useSortable` rend `setActivatorNodeRef`, `attributes` et `listeners` : les poser sur une poignée seule laisse le reste de la ligne libre pour faire défiler la page au doigt. Source : `node_modules/@dnd-kit/sortable/dist/hooks/useSortable.d.ts`.
- Les capteurs pointeur acceptent une `activationConstraint` : `{ distance }` ou `{ delay, tolerance }`. Source : `node_modules/@dnd-kit/core/dist/sensors/pointer/AbstractPointerSensor.d.ts`.
- dnd-kit pose `touch-action: none` sur l'élément activateur pendant le glisser ; la poignée doit aussi l'avoir en CSS pour que le navigateur ne fasse pas défiler la page au lieu de glisser. Source : `core.esm.js` (`touchAction: 'none'`) et https://docs.dndkit.com/api-documentation/sensors/pointer#touch-action.
- `KeyboardSensor` avec `sortableKeyboardCoordinates` : Espace (ou Entrée) prend l'élément, les flèches le déplacent, Espace le pose, Échap annule. Source : https://docs.dndkit.com/presets/sortable#keyboard-sensor.
- Le `KeyboardSensor` annonce la saisie dès l'activation, mais n'écoute les flèches qu'une tâche plus tard (`setTimeout(() => this.listeners.add('keydown', …))`). Une flèche envoyée entre les deux est perdue : un test qui enchaîne Espace puis une flèche doit laisser passer une tâche après l'annonce. Source : `core.esm.js`, `KeyboardSensor.attach`.
- `DndContext` accepte `accessibility: { announcements, screenReaderInstructions }`. Les textes par défaut sont en anglais et citent l'`id` de l'élément (« Picked up draggable item rayon-costco-boulangerie. ») : il faut fournir des annonces françaises qui nomment le rayon. Source : `core.esm.js`, `defaultAnnouncements` et `defaultScreenReaderInstructions`.

## Sources

- https://docs.dndkit.com/presets/sortable
- https://docs.dndkit.com/api-documentation/sensors/pointer
- https://docs.dndkit.com/guides/accessibility
- `apps/web/node_modules/@dnd-kit/*/dist`

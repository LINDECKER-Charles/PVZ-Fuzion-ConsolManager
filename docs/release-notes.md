# pvzf-console — v1.4.1

## Corrections

- Prise en charge du nouveau format de `travel_buffs.json` :
  `{ category: { id: { name, desc } } }`.
- Détection des buffs absents par paire `category:id`, sans considérer le
  contenu de `name` ou `desc` lorsqu'un ID existe déjà dans la langue cible.
- Conservation de l'objet complet `{ name, desc }` pour chaque ID absent dans
  les rapports de traduction.
- Reconstruction des fichiers `travel_buffs_diff.json` avec leur arborescence
  complète afin qu'ils restent directement réutilisables.
- Migration depuis `Dumps/travel_buffs.json` adaptée aux feuilles imbriquées.
- Détection des traductions dupliquées adaptée aux champs imbriqués du nouveau
  format.

## Compatibilité

- L'ancien format `{ category: { id: value } }` reste pris en charge pour les
  localisations qui ne sont pas encore migrées.

## Validation

- 172 tests automatisés validés.
- Typecheck, lint et build validés.
- Vérification effectuée avec les fichiers English et French de
  `PvZ_Fusion_Translator`.

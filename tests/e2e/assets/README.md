# Fixtures de fichiers importables

## `felder-house.dd2vtt`

Vrai export **Universal VTT** (Dungeondraft), pas un jouet synthétique.

- **Source** : [`mbround18/vtt-maps`](https://github.com/mbround18/vtt-maps) →
  `maps/base_building/FelderHouse.dd2vtt`
- **Licence** : **CC0 1.0 Universal** (domaine public) — redistribuable sans
  condition, y compris dans ce dépôt.
- **Modification** : la géométrie est **intacte** (`resolution`, les 59
  polylignes `line_of_sight`, les 46 portails fermés, les 14 lumières,
  `environment.baked_lighting`). Seule l'image de fond a été **réduite de
  8320 × 5760 px à 256 px** de large — le fichier d'origine pèse 21 Mo, dont
  ~21 Mo de PNG base64, ce qui n'a rien à faire dans un dépôt Git. La fixture
  fait 131 Ko.

### Pourquoi une fixture réelle

Le `.dd2vtt` synthétique de `map-dd2vtt.spec.ts` (une salle, 3 murs, 2 lumières)
prouve que le chemin d'import fonctionne, pas qu'il tient face à un export
Dungeondraft du monde réel. Cette fixture apporte ce que le synthétique ne
pouvait pas produire, et qui a révélé quatre écarts corrigés depuis :

| Ce que le réel apporte | Ce que ça a révélé |
|---|---|
| 46 portails, tous `closed:true` | rien — le chemin portails tenait |
| `environment.baked_lighting: true` | l'éclairage était activé **par-dessus** une image déjà éclairée |
| lumières `range: 0.5` case | les rayons étaient **divisés par deux** au lieu de suivre la convention bright/dim |
| image 8320 × 5760 (~191 Mo décodée) | l'aperçu affichait le PNG **brut**, ré-encodé seulement à l'enregistrement |

Trois autres exports CC0 du même dépôt (`animal-den`, `pirate-cove`,
`desert-path-ambush`) portent **zéro mur et zéro lumière** : l'import posait
malgré tout `losEnabled: true`, soit un interrupteur qui ne commande rien.

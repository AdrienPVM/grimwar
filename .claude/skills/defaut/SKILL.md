---
name: defaut
description: Traiter un défaut signalé par Adrien de façon qu'il ne puisse plus revenir. À utiliser dès qu'il décrit ce qu'il a vu à l'écran et qui est faux : contraste illisible, débordement, geste mort, texte tronqué, écran vide à tort. Impose la mesure du rendu, un garde branché écrit avant le correctif, une contre-épreuve, et l'inscription au verrou.
---

# Cliquet de défaut

Un cliquet ne tourne que dans un sens. Une fois qu'une classe de défaut est gardée,
elle ne peut plus revenir sans qu'un commit soit refusé.

Adrien signale une fois. Jamais deux. Les cinq temps qui suivent sont dans l'ordre, et
aucun ne se saute.

## Temps 1 : reproduire en mesurant le rendu

Le sujet est ce que l'écran peint, pas ce que la source déclare. Un jeton CSS juste
peut produire une couleur fausse : c'est arrivé trois fois sur ce projet.

Ouvre le navigateur, va sur la page réelle, dans le thème réel, et mesure la valeur
calculée sur l'élément réel. La sortie attendue est un nombre, pas une impression.

    2,1:1 alors qu'il en faut 4,5:1

Si tu ne parviens pas à reproduire, dis-le et arrête-toi. Un défaut non reproduit ne se
corrige pas, il se discute.

## Temps 2 : écrire le garde AVANT le correctif, et le brancher

Le garde naît rouge. Il est inscrit dans `package.json` dans le même mouvement.
C'est ce qui rend impossible de l'oublier : sans lui, il n'y a pas de rouge à faire
passer au vert.

Il vise la **classe**, pas la page où Adrien l'a vu. Toutes les routes, tous les thèmes,
toutes les largeurs concernées. Une règle vaut pour la classe, pas pour le fichier où le
défaut a été constaté.

Il se nomme par ce qu'il mesure : `guard:contraste`, jamais `guard:t10b`.

## Temps 3 : corriger

Jusqu'au vert. La sortie du garde est dans le message.

## Temps 4 : contre-épreuve

Replante la faute. Le garde doit rougir.

S'il reste vert, il ne mesure pas ce qu'il prétend mesurer, et le travail n'est pas
fini. Trois verdicts sont possibles sur une contre-épreuve verte, et il faut trancher
entre eux : le garde est aveugle, la faute n'est pas servie, ou la faute plantée n'est
pas celle d'origine.

Retire ensuite la faute plantée et vérifie que le vert revient.

## Temps 5 : inscrire au verrou

Deux écritures :

1. Le nom du garde entre dans la liste des gardes bloquants. À partir de là, aucun
   commit ne passe s'il rougit.
2. Une ligne dans `.claude/defauts/REGISTRE.md` : la date, ce qu'Adrien a décrit dans
   ses mots, le nom du garde, et la classe de défaut.

## Ce que ce cliquet garantit, et ce qu'il ne garantit pas

Il garantit : une fois par classe de défaut, jamais deux. Le contraste, une fois posé,
couvre toutes les pages et tous les thèmes, pour toujours.

Il ne garantit pas qu'une classe **nouvelle** soit prévue. La première fois qu'un type
de défaut inédit apparaît, Adrien devra le dire une fois. C'est le marché, et il faut
le lui rappeler honnêtement plutôt que de promettre plus.

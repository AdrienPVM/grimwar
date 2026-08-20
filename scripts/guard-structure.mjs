#!/usr/bin/env node
// LA RACINE NE SE DÉFAIT PAS.
//
// Le hook .claude/hooks/structure-garde.sh refuse une écriture hors charte, mais il
// ne voit que ce que Claude écrit. Un fichier posé par un outil, une sortie de
// compilation, un .DS_Store créé par le Finder passent à côté de lui.
//
// Ce garde balaie la racine et rougit sur toute entrée non déclarée dans
// .claude/structure.json. Il attrape ce que le hook a laissé passer.
//
// Contre-épreuve : `node scripts/guard-structure.mjs --planter` pose une entrée
// interdite à la racine, vérifie que le garde la voit, puis la retire.

import { readFileSync, readdirSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const RACINE = process.cwd();
const CHARTE = join(RACINE, '.claude', 'structure.json');

if (!existsSync(CHARTE)) {
  console.error('guard:structure  charte absente : .claude/structure.json');
  console.error('Sans charte, ce garde ne mesure rien. Il ne rend pas vert pour autant.');
  process.exit(1);
}

const charte = JSON.parse(readFileSync(CHARTE, 'utf8'));
const rac = charte.racine;
const supplements = Object.keys(charte.supplementsDeclares ?? {});
const adresses = Object.keys(charte.adressesUniques ?? {});

function motifVersRegex(m) {
  return new RegExp('^' + m
    .replace(/[.+^${}()|\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.') + '$');
}
const fichiersOk = rac.fichiersAutorises.map(motifVersRegex);

function mesurer() {
  const entrees = readdirSync(RACINE, { withFileTypes: true });
  const hors = [];
  for (const e of entrees) {
    const n = e.name;
    if (rac.toujoursTolere?.includes(n)) continue;
    if (supplements.includes(n)) continue;
    if (adresses.includes(n)) continue;
    if (e.isDirectory()) {
      if (!rac.repertoiresAutorises.includes(n)) hors.push({ nom: n, type: 'répertoire' });
    } else if (!fichiersOk.some((r) => r.test(n))) {
      hors.push({ nom: n, type: 'fichier' });
    }
  }
  return hors;
}

if (process.argv.includes('--planter')) {
  const factice = join(RACINE, 'rapports-contre-epreuve');
  mkdirSync(factice, { recursive: true });
  const avec = mesurer();
  rmSync(factice, { recursive: true, force: true });
  const sans = mesurer();
  const vu = avec.some((h) => h.nom === 'rapports-contre-epreuve');
  console.log(`contre-épreuve : ${avec.length} entrées hors charte avec la faute plantée, ${sans.length} sans.`);
  console.log(vu
    ? 'ROUGE sur la faute plantée. Le garde voit ce qu\'il prétend voir.'
    : 'VERT sur la faute plantée. LE GARDE EST AVEUGLE.');
  process.exit(vu ? 0 : 1);
}

const hors = mesurer();
if (hors.length === 0) {
  console.log(`guard:structure  racine conforme, 0 entrée hors charte (${charte.projet}).`);
  process.exit(0);
}

console.error(`guard:structure  ${hors.length} ENTRÉES hors charte à la racine de ${charte.projet}.`);
console.error('');
for (const h of hors) console.error(`  ${h.type.padEnd(11)} ${h.nom}`);
console.error('');
console.error('La charte est .claude/structure.json, traduite de socle/STRUCTURE-CIBLE.md.');
console.error('Cinq verdicts possibles, et « on verra plus tard » n\'en est pas un :');
console.error('  garder     conforme, la ligne est écrite dans supplementsDeclares');
console.error('  renommer   le contenu reste, le nom viole la charte');
console.error('  déplacer   le contenu reste, l\'adresse viole la charte');
console.error('  ignorer    reconstructible, part du disque et entre au .gitignore');
console.error('  supprimer  ne sert plus, disparaît, avec la raison écrite');
process.exit(1);

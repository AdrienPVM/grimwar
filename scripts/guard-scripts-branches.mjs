#!/usr/bin/env node
// UN SCRIPT NON RÉFÉRENCÉ N'EXISTE PAS.
//
// Le fait qui a fait écrire ce garde, mesuré le 2026-08-20 : scripts/ portait
// 32 fichiers, 14 n'étaient référencés par aucun package.json. Chacun avait mesuré
// une fois, le jour de la tâche qui lui avait donné son nom, puis plus jamais.
// screenshot-contrast-t10b.mjs mesurait le contraste WCAG, commité, branché nulle
// part : c'est par là que les défauts corrigés reviennent.
//
// Un garde non branché est un garde mort. Ce garde-ci compte les morts.
//
// Contre-épreuve : `node scripts/guard-scripts-branches.mjs --planter` écrit un
// script factice non référencé, vérifie que le garde le voit, puis le retire.

import { readFileSync, readdirSync, statSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const RACINE = process.cwd();
const DOSSIER = join(RACINE, 'scripts');

// Les répertoires qu'on ne traverse pas pour trouver les package.json : ce sont des
// sorties d'outil, pas des manifestes. Leur oubli rendrait n'importe quel script
// « référencé » par hasard.
const IGNORES = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.turbo',
  '.vercel', '.mesures', 'target', 'test-results', 'playwright-report',
]);

// UN PACKAGE.JSON N'EST PAS LE SEUL À LANCER. Relevé sur grimwar : les deux scripts
// de `scripts/ci/` sont appelés par `.github/workflows/ci.yml` et par le crochet
// `.githooks/pre-push`, et par aucune commande de `package.json`. Les déclarer
// orphelins serait exact au sens littéral et faux au sens qui compte : ils gardent,
// et quelque chose les lance. La doctrine dit « un garde qu'aucune commande ne lance
// ne garde rien », elle ne dit pas « aucune commande de package.json ».
function lanceursExternes(racine) {
  const out = [];
  for (const d of ['.github/workflows', '.github', '.githooks']) {
    let entrees;
    try { entrees = readdirSync(join(racine, d), { withFileTypes: true }); } catch { continue; }
    for (const e of entrees) {
      if (!e.isFile()) continue;
      try { out.push(readFileSync(join(racine, d, e.name), 'utf8')); } catch { /* illisible */ }
    }
  }
  return out;
}

function manifestes(dir, trouves = []) {
  let entrees;
  try { entrees = readdirSync(dir, { withFileTypes: true }); } catch { return trouves; }
  for (const e of entrees) {
    if (e.name.startsWith('.next-')) continue;
    if (IGNORES.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) manifestes(p, trouves);
    else if (e.name === 'package.json') trouves.push(p);
  }
  return trouves;
}

// Ce qui est un SCRIPT. Un README qui documente le dossier n'en est pas un, une
// fixture .txt non plus, et les compter fabriquerait un garde qui crie faux. Un
// garde qui crie faux s'éteint en deux semaines.
const EXECUTABLES = ['.mjs', '.cjs', '.js', '.jsx', '.ts', '.tsx', '.mts', '.cts', '.sh', '.py', '.bash'];

function scriptsDuDossier(dir, base = dir, trouves = []) {
  let entrees;
  try { entrees = readdirSync(dir, { withFileTypes: true }); } catch { return trouves; }
  for (const e of entrees) {
    const p = join(dir, e.name);
    if (e.isDirectory()) scriptsDuDossier(p, base, trouves);
    // Un `.d.ts` déclare des types, il ne s'exécute pas. Le compter fabriquerait
    // un orphelin qu'aucun branchement ne peut résoudre.
    else if (!e.name.startsWith('.') && !e.name.endsWith('.d.ts')
             && EXECUTABLES.some((x) => e.name.endsWith(x))) {
      trouves.push(relative(base, p).split(sep).join('/'));
    }
  }
  return trouves;
}

// LEÇON PAYÉE, 2026-08-20. La première version de ce garde lisait le TEXTE BRUT des
// package.json. Elle rendait vert sur screenshot-contrast-t10b.mjs parce que la prose
// de documentation de ce garde-ci CITAIT son nom pour expliquer pourquoi il existe.
// Un garde qui se laisse satisfaire par un commentaire ne mesure pas un branchement,
// il mesure une mention. On ne lit donc que les COMMANDES : les valeurs des clés de
// `scripts` qui ne commencent pas par `//`, plus `bin`, `main` et `exports`.
function commandes(manifeste) {
  let d;
  try { d = JSON.parse(readFileSync(manifeste, 'utf8')); } catch { return []; }
  const out = [];
  for (const [k, v] of Object.entries(d.scripts ?? {})) {
    if (k.startsWith('//')) continue;   // la prose n'est pas un branchement
    if (typeof v === 'string') out.push(v);
  }
  for (const champ of ['bin', 'main', 'module', 'exports']) {
    const v = d[champ];
    if (typeof v === 'string') out.push(v);
    else if (v && typeof v === 'object') out.push(JSON.stringify(v));
  }
  return out;
}

// SECONDE LEÇON, même jour. Un script peut être branché sans qu'aucune commande ne le
// nomme : relever-demandes.mts n'est lancé par personne, il est IMPORTÉ par
// guard-demandes.mts, qui l'est. Un module d'un instrument branché est branché.
// On propage donc depuis les fichiers directement cités, jusqu'au point fixe.
// Les spécificateurs d'import et de require d'un fichier. On compare ensuite par
// NOM DE BASE sans extension : un module écrit `../data/srd-feats.js` alors que le
// fichier s'appelle `srd-feats.ts`, et une comparaison de chemins littérale les
// manquerait tous.
const IMPORTS = /(?:from\s+|import\s*\(|require\s*\(|import\s+)['"`]([^'"`]+)['"`]/g;

function specificateurs(texte) {
  const out = [];
  let m;
  IMPORTS.lastIndex = 0;
  while ((m = IMPORTS.exec(texte))) out.push(m[1]);
  // et les appels de shell : `sh scripts/x.sh`, `node ./y.mjs`, `. ./z.sh`
  for (const m2 of texte.matchAll(/[\w./-]+\.(mjs|cjs|js|ts|mts|sh|py)\b/g)) out.push(m2[0]);
  return out;
}

function sansExtension(chemin) {
  const base = chemin.split('/').pop();
  return base.replace(/\.(mjs|cjs|js|jsx|ts|tsx|mts|cts|sh|py|bash)$/, '');
}

function propager(cites, tous) {
  const retenus = new Set(cites);
  const parNom = new Map();
  for (const f of tous) {
    const n = sansExtension(f);
    if (!parNom.has(n)) parNom.set(n, []);
    parNom.get(n).push(f);
  }
  const aVoir = [...retenus];
  while (aVoir.length) {
    const f = aVoir.pop();
    let texte;
    try { texte = readFileSync(join(DOSSIER, f), 'utf8'); } catch { continue; }
    for (const spec of specificateurs(texte)) {
      for (const cand of parNom.get(sansExtension(spec)) ?? []) {
        if (!retenus.has(cand)) { retenus.add(cand); aVoir.push(cand); }
      }
    }
  }
  return retenus;
}

// Une épreuve n'est pas lancée par son nom : un lanceur la trouve par motif. La
// déclarer orpheline serait exact au sens littéral et faux au sens qui compte.
// On ne l'accorde QUE si un lanceur existe vraiment dans un package.json.
const LANCEURS = /\b(vitest|jest|playwright\s+test|mocha|node\s+--test|pytest)\b/;
function estEpreuveLancee(f, textes) {
  const estEpreuve = /(^|\/)__tests__\//.test(f) || /\.(test|spec)\.[a-z]+$/.test(f);
  return estEpreuve && LANCEURS.test(textes);
}

function mesurer() {
  if (!existsSync(DOSSIER)) {
    console.log('guard:scripts-branches  aucun dossier scripts/, rien à tenir.');
    return [];
  }
  const fichiers = scriptsDuDossier(DOSSIER);
  const textes = manifestes(RACINE).flatMap(commandes)
    .concat(lanceursExternes(RACINE)).join('\n');
  const cites = fichiers.filter((f) => textes.includes(f) || textes.includes(f.split('/').pop())
                                       || estEpreuveLancee(f, textes));
  const retenus = propager(cites, fichiers);
  return fichiers.filter((f) => !retenus.has(f));
}

const planter = process.argv.includes('--planter');

if (planter) {
  // Le nom est COMPOSÉ, jamais écrit en toutes lettres. Leçon payée : écrit en
  // clair, il apparaissait dans le source de ce garde, et la propagation d'imports
  // le « découvrait » comme un module d'un fichier branché. Le garde se voyait
  // lui-même et rendait vert sur sa propre faute plantée.
  const factice = join(DOSSIER, ['contre', 'epreuve', 'factice'].join('-') + '.mjs');
  writeFileSync(factice, '// faute plantée, retirée aussitôt\n');
  const avec = mesurer();
  unlinkSync(factice);
  const sans = mesurer();
  const vu = avec.length === sans.length + 1
    && avec.some((f) => f.endsWith('.mjs') && !sans.includes(f));
  console.log(`contre-épreuve : ${avec.length} orphelins avec la faute plantée, ${sans.length} sans.`);
  console.log(vu
    ? 'ROUGE sur la faute plantée. Le garde voit ce qu\'il prétend voir.'
    : 'VERT sur la faute plantée. LE GARDE EST AVEUGLE.');
  process.exit(vu ? 0 : 1);
}

const orphelins = mesurer();
if (orphelins.length === 0) {
  console.log(`guard:scripts-branches  0 orphelin sur ${scriptsDuDossier(DOSSIER).length} fichiers de scripts/.`);
  process.exit(0);
}

console.error(`guard:scripts-branches  ${orphelins.length} ORPHELINS sur ${scriptsDuDossier(DOSSIER).length} fichiers de scripts/.`);
console.error('');
for (const o of orphelins) console.error(`  scripts/${o}`);
console.error('');
console.error('Un script non référencé par un package.json n\'existe pas : il a mesuré une');
console.error('fois, il ne mesurera plus jamais. Deux issues, pas de troisième :');
console.error('  1. le brancher dans un package.json, en le nommant par ce qu\'il mesure ;');
console.error('  2. le supprimer.');
process.exit(1);

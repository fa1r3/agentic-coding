# Revue de cohérence : `analyse-multi-outil.md`

Revue refaite le 2026-11-07 sur la branche `feat/multi-harness`, au commit `983e7d3`, arbre propre : l'étape 2 avait été commencée avant la première revue, puis annulée, et `cli/` est absent de la branche. Elle porte sur la cohérence interne du document, sa cohérence avec le dépôt et les deux références (`ref/opencode`, `ref/claude-code`), et sur ce qui lui manque pour mener les étapes 2 à 8.

Les essais qui demandaient `cli/` ont été faits dans des worktrees jetables, supprimés depuis. La branche n'a pas été modifiée.

**En bref.** L'essentiel du document tient : ses chiffres de la section 3 sont exacts, et ses décisions vont dans le même sens. Deux constats remettent pourtant en cause l'étape 2 et la section 5, et plusieurs passages n'ont pas suivi la révision de D4.

**Changements par rapport à la première revue :**
- 2.1 n'est plus un constat sur la branche mais une prévision, reproduite dans un worktree jetable : 55 tests sur 112 échouent ;
- 2.2 est complété : le garde refuse toute clé inconnue de la table de permissions ;
- une erreur de chiffre est ajoutée en section 2 : 30 fichiers des modules sont modifiés, et non 42 ;
- le point « Still on main » est retiré : la source existe, la première revue l'avait mal cherchée.

## Sommaire

1. [Ce qui est vérifié et exact](#1-ce-qui-est-vérifié-et-exact)
2. [Problèmes bloquants](#2-problèmes-bloquants)
3. [Incohérences internes au document](#3-incohérences-internes-au-document)
4. [Ce qui manque](#4-ce-qui-manque)
5. [Corrections proposées, par section](#5-corrections-proposées-par-section)
6. [Solutions proposées, par constat](#6-solutions-proposées-par-constat)

---

## 1. Ce qui est vérifié et exact

| Affirmation du document | Vérification | Résultat |
|---|---|---|
| 42 fichiers dans `modules/` | `git ls-tree` sur les deux références | 42 et 42 ; `modules/` de la branche est identique à `ref/opencode` |
| 21 fichiers sur 42 identiques après les deux substitutions (section 3) | comparaison fichier par fichier, chemin du script substitué avant les noms de commandes | 21 |
| 29 injections shell sur `main` | `` !` `` dans les commandes de `ref/opencode` | 29 (acceptance 4, archive 3, design-review 2, design 2, dev 4, init 6, propose 3, tres-amigos 3, ux-design 2) |
| 116 renvois aux commandes dans 27 fichiers | `/f3-[a-z-]*` dans `modules/` de `ref/opencode` | 116 dans 27 fichiers |
| Tags de D10 | `git rev-parse` | `ref/opencode` → `a33b9d3`, `ref/claude-code` → `ef8c84a` |
| 112 tests de la commande `f3` (R16) | `node --test` dans un worktree de `ref/claude-code` | 112 tests, 112 réussis |
| Lanceur écrit pour Claude Code seul (4.6, R16) | `cli/f3.mjs` de `ref/claude-code` | `spawnSync('claude', ['--agent', …])`, ligne 49 |
| Renvois au GUIDE (sections 12, 14 point 4, 15.3, 15.4, 16) | titres de `GUIDE.md` | toutes présentes ; le point 4 de la section 14 dit bien « run `/f3-init`, with a prompt… » |
| Renvoi au drift log 32 | `retro/drift-log.md` | présent (« a script is accepted only when determinism justifies it ») |
| Citation « Still on main » (4.7) | `retro/drift-log.md` de `ref/claude-code`, ligne 82 | présente, écrite « Still on \`main\` » ; l'entrée cite aussi glob et grep, pas seulement l'outil read |
| Plan de travail du portage (section 2) | `/home/theo/Documents/poc/agentic-toolkit-claude/docs/plan-claude-code.md` | présent |
| Preuves de V-O1 à V-O7 | `poc/test-f3-setup/multi-outil/evidence/` | tous les fichiers cités sont présents |

## 2. Problèmes bloquants

### 2.1 Le critère de l'étape 2 (« reprise avec `node --test` vert ») ne peut pas être atteint

Essai : `cli/` de `ref/claude-code` posé tel quel sur `983e7d3`, dans un worktree jetable. Résultat : **55 tests sur 112 échouent** (`policy`, `guard`, et « every command declares its agent, and none uses a reserved name »). Le même `cli/` passe ses 112 tests sur `ref/claude-code`.

Le code n'y est pour rien. La cause est que `cli/lib/toolkit.mjs` lit le frontmatter des **sources** dans `modules/` :

- `commands()` lit la clé `f3-agent` des commandes (ligne 75) ;
- `agentFile()` renvoie le `.md` de l'agent dans `modules/`, et `loadPolicy()` y lit `f3-permission`.

Or, sur cette branche, `modules/` contient la version OpenCode (`agent:`, `permission:`). Les tests de la commande `f3` dépendent donc du format Claude Code des modules, et la reprise ne peut pas être verte sur cette base.

Choix à faire avant de reprendre l'étape 2 (R16) :

| Option | Effet |
|---|---|
| A. Fixtures propres aux tests (`cli/test/fixtures/modules/…`, racine du toolkit paramétrable) | La reprise reste verte et indépendante du format des modules. Demande une petite modification de `toolkit.mjs` (`ROOT`, ligne 7) dans le commit de reprise, ce qui s'écarte de « telle quelle » |
| B. Tests qui lisent le rendu `build/claude` | Cohérent avec l'architecture cible, mais la reprise ne peut être verte qu'après `f3 render` |
| C. Commit de reprise rouge, assumé et documenté | Respecte « telle quelle » à la lettre, mais perd le filet de non-régression pendant l'étape 2 |

Recommandation : **A**, en deux commits pour garder l'esprit de R16 : la reprise telle quelle (rouge, avec la raison dans le message), puis le seul paramètre de racine et les fixtures (vert). La modification sert aussi les étapes 4 et 5, où les sources changeront de format.

### 2.2 Les tables de permissions ne sont pas « le même texte sous une autre clé » (section 5)

La section 5 dit que la table de permissions est le même texte, inséré sous `permission:` pour OpenCode et sous `f3-permission:` pour Claude Code. La comparaison des deux références montre, hors clés propres au garde (`shell_read_programs`, `subagent`), des écarts réels :

| Agent | OpenCode (`ref/opencode`) | Claude Code (`ref/claude-code`) |
|---|---|---|
| architect | `opencode.json: allow`, `~/.config/opencode/opencode.json: ask` | `CLAUDE.md`, `.mcp.json`, `.claude/settings.json: allow` |
| developer | `opencode.json: deny` | `CLAUDE.md`, `.mcp.json`, `.claude/*: deny` |
| tester | — | `~/.claude/skills/*: allow` (lecture) |
| ux | `bash: deny` dans `permission:` | `Bash` dans `disallowedTools` |

Conséquences à écrire dans le document :

- **Avec D2, la table commune doit réunir les fichiers des deux outils.** Le developer refuse `opencode.json`, `CLAUDE.md`, `.mcp.json` et `.claude/*` ; l'architect les autorise tous. C'est une neutralisation (4.1), pas un rendu.
- **Les chemins sous `~`** (`~/.config/opencode/opencode.json`, `~/.claude/skills/*`) sont propres à l'outil : il faut une variable de plus ou un fragment par outil. Pour le tester sous OpenCode, il reste à vérifier si la lecture des skills passe par l'outil read.
- **Les outils refusés ne peuvent pas aller dans la table.** Le garde (`cli/lib/policy.mjs`, ligne 15) refuse toute clé hors de `edit`, `read`, `shell_read_programs` et `subagent` : une table commune qui contiendrait `bash: deny` ou `penpot_*: deny` ferait échouer `loadPolicy()`, donc chaque appel d'outil de l'agent sous Claude Code. Les outils refusés restent hors de la table, dans une liste par agent rendue en clés `permission:` pour OpenCode et en `disallowedTools` pour Claude Code. L'autre voie est de faire ignorer ces clés par le garde, ce qui modifie `cli/`.
- **Cette liste est propre à chaque agent**, et pas commune comme le dit la section 5 (`penpot searxng playwright`) : analyst refuse les trois, architect penpot et playwright, tester penpot et searxng, ux playwright et bash, developer aucun. Le `bash` de ux doit y figurer.

La liste des variables de 4.5 et de la section 5 (`EXPLORE`, `GENERAL`, `SUBAGENT_TOOL`, `ARG1`, `ARG2`) est donc incomplète.

## 3. Incohérences internes au document

| Où | Écart | Correction |
|---|---|---|
| Section 2 | « portage complet : 42 fichiers des modules modifiés » : `ref/claude-code` modifie 30 des 42 fichiers de `modules/`, et 12 sont identiques. Le chiffre de 42 est celui de tout le commit `ef8c84a` (`cli/`, README, GUIDE, drift log compris) | « 30 fichiers des modules modifiés sur 42 ». Cela s'accorde avec la section 3 : 12 identiques, plus 9 après les substitutions, font 21 |
| En-tête | « Prochaine étape : l'étape 2 » sans dire qu'elle a été commencée puis annulée, ni pourquoi | Ajouter une ligne : l'étape 2 attend le choix de 2.1 de cette revue |
| 4.5, section 5, D7, R3 | Ils décrivent encore un rendu en sh : « une cinquantaine de lignes de sh POSIX », « une boucle de trois lignes en sh », « un seul `sed` », « `install.sh` échoue s'il reste `{{` ». D4 révisée fait passer le rendu en Node.js tout de suite (`f3 render`) | Réécrire 4.5 au présent (rendu en Node.js, limites conservées : concaténation et variables, sans conditions) ; D7 : « Node.js (`f3 render`) » ; section 5 : « le rendu insère… » au lieu de « `install.sh` l'insère… » |
| R3 | La parade est placée dans `install.sh`, alors que le rendu est refait à chaque lancement par `f3` | `f3 render` échoue s'il reste `{{` dans le dossier rendu, avant la bascule du lien (voir 4.2) |
| Sommaire | Les liens `#6-vérifications-à-faire-avant-de-construire` et `#7-décisions-à-prendre` ne correspondent pas aux titres « 6. Vérifications » et « 7. Décisions » | Aligner les titres ou les liens |
| Section 1 et 4.5 | « script sh », « sh POSIX » : `install.sh` est en bash (`#!/usr/bin/env bash`, `[[ ]]`, tableaux, `shopt`) | Écrire « bash », ou prévoir sa réécriture en sh POSIX |
| 4.7 | La source de « Still on main » n'est pas donnée | Citer « drift log de `ref/claude-code`, ligne 82 » ; l'entrée dit aussi que glob et grep lisent le code, à reprendre dans la section 12 du GUIDE |
| 4.2 et 4.6 | 4.6 ajoute `f3 tool` à `RESERVED`, mais pas `f3 render` (4.4, D4). `RESERVED` vaut aujourd'hui `state`, `guard`, `guard-prompt`, `help` (`toolkit.mjs`, ligne 15) | `RESERVED` : `state`, `guard`, `guard-prompt`, `help`, `tool`, `render` |

## 4. Ce qui manque

### 4.1 Le nettoyage des anciens rendus casse la parade de R10

4.4 dit : « Les rendus précédents sont supprimés ensuite. » Avec deux `f3` lancés en même temps :

1. A commence son rendu dans `build/claude.A/` ;
2. B fait son rendu dans `build/claude.B/`, bascule le lien, puis supprime les « rendus précédents », dont `build/claude.A/`, encore en cours ;
3. A termine, puis bascule le lien vers un dossier détruit ou incomplet.

Parade à écrire : un rendu marque son dossier comme terminé (fichier `.complete` écrit en dernier), et le nettoyage ne supprime que les dossiers terminés qui ne sont pas la cible du lien. Un dossier non terminé et ancien (rendu interrompu) peut être supprimé au-delà d'un délai.

### 4.2 Le rendu en échec au lancement

Le document ne dit pas ce que fait `f3` si le rendu échoue : une source en cours d'édition avec un `{{` inconnu, un frontmatter illisible, un dépôt du toolkit en lecture seule (installation partagée), un disque plein.

À décider :

- la bascule n'a jamais lieu sur un rendu en échec, et le lien garde le dernier rendu complet ;
- le lanceur refuse de lancer et affiche l'erreur, ou il lance sur le rendu précédent avec un avertissement ;
- `f3 state` signale l'erreur dans l'état de lancement, ce qui arrête la commande par la consigne commune (R12).

### 4.3 La définition d'« outil installé »

D2 (« chaque outil installé sur la machine »), D3 (« si un seul outil est installé ») et `f3 state init` (4.10) en dépendent, et le document ne la donne pas. Deux lectures possibles :

- le binaire `claude` ou `opencode` est dans le `PATH` ;
- le toolkit f3 est installé pour cet outil (liens posés par `install.sh` dans `~/.claude/` ou `~/.config/opencode/`).

Recommandation : la seconde, qui est aussi celle que `install.sh --remove` sait défaire. Un outil présent mais sans f3 ne doit pas recevoir de fichiers de projet.

### 4.4 D2 oublie les fichiers OpenSpec du projet

`openspec init --tools <outil>` écrit des fichiers propres à l'outil dans le projet (`.claude/skills/…`, ou l'équivalent sous `.opencode/`). Une équipe mixte en a besoin pour les deux outils. `cli/lib/state.mjs` de `ref/claude-code` lit d'ailleurs `.claude/skills` en dur (ligne 97), et sa liste de fichiers de cadrage ne contient que ceux de Claude Code (ligne 91). D2, l'étape 6 et le thème « outils » de 4.10 doivent couvrir ces fichiers.

### 4.5 L'adaptation de `toolkit.mjs` au nouveau format des sources

`commands()` lit `f3-agent`, `agentFile()` renvoie le `.md` de l'agent, où `loadPolicy()` lit `f3-permission`. Avec l'architecture de la section 5, les sources auront `agent:` et une table dans `<agent>.permission`. Le garde doit lire cette table dans le dépôt (section 5), et le lanceur doit lire `agent:`. Aucune étape ne le cite : l'étape 5 devrait le faire, ou l'étape 4 si les tests en dépendent (voir 2.1).

### 4.6 `build/` dans le `.gitignore` du toolkit

4.4 et la section 5 disent `build/` « ignoré par Git ». Le dépôt n'a pas de `.gitignore`, et aucune étape ne prévoit de le créer. À ajouter à l'étape 2.

### 4.7 L'ordre des opérations dans `install.sh`

`install.sh` supprime aujourd'hui les liens morts qui pointent vers le dépôt. Après un `git clean -fdX` (R11), tous les liens d'installation sont morts. Si le nettoyage passe avant le rendu, il les supprime tous, alors que le rendu les aurait réparés. L'ordre doit être écrit : rendu, puis liens, puis nettoyage des liens morts.

### 4.8 Le partage d'une même installation de skills entre les deux outils

V-O6 conclut que « toute skill f3 doit exister dans les deux rendus ». Cas non traité : f3 installé pour Claude Code seulement, avec OpenCode présent sur la machine. OpenCode lit alors `~/.claude/skills/` et charge les skills f3 rendues pour Claude Code. Le risque est faible, mais il mérite une ligne dans la section 16 du GUIDE (étape 7).

## 5. Corrections proposées, par section

| Section | Correction |
|---|---|
| En-tête | Mentionner cette revue ; l'étape 2 attend le choix des fixtures (2.1) |
| Sommaire | Corriger les liens des sections 6 et 7 |
| 1 | « script bash », ou la réécriture en sh comme objectif |
| 2 | « 30 fichiers des modules modifiés sur 42 » |
| 4.4 | Nettoyage limité aux rendus terminés (4.1 de cette revue) ; comportement en cas d'échec du rendu (4.2) |
| 4.5 | Réécrire pour le rendu en Node.js ; compléter la liste des variables (2.2) |
| 4.6 | Ajouter `render` à `RESERVED` ; définir « outil installé » (4.3) |
| 4.7 | Source de la citation : drift log de `ref/claude-code`, ligne 82 |
| 5 | Table de permissions commune réunissant les fichiers des deux outils ; chemins sous `~` par outil ; outils refusés hors de la table, en liste par agent, `bash` de ux compris (2.2) ; « le rendu » au lieu de « `install.sh` » |
| 7 | D2 : fichiers OpenSpec du projet (4.4) ; D7 : Node.js |
| 8 | Étape 2 : choix des fixtures (2.1) et `.gitignore` (4.6) ; étape 5 : adaptation de `toolkit.mjs` (4.5) ; étape 6 : fichiers OpenSpec des deux outils |
| 9 | R3 : parade portée par `f3 render` ; R10 : nettoyage sûr ; R11 : ordre des opérations de `install.sh` ; nouveau risque : rendu en échec au lancement |

## 6. Solutions proposées, par constat

Chaque constat a une solution recommandée, en gras. Les autres options sont là pour la comparaison. La colonne « Où » indique la section de l'analyse ou l'étape concernée.

### 6.1 Problèmes bloquants

| Constat | Options | Où |
|---|---|---|
| **2.1** Reprise de `cli/` rouge | **A'. Deux commits** : (1) `cli/` tel quel, rouge, avec la raison dans le message (R16 respecté à la lettre) ; (2) `ROOT` remplaçable par `F3_TOOLKIT_ROOT` (une ligne de `toolkit.mjs`) et fixtures `cli/test/fixtures/modules/` au format Claude Code actuel, copiées de `ref/claude-code` : vert. Les tests ne dépendent plus du format des sources, qui changera aux étapes 3 et 4. — A. Un seul commit avec les fixtures (vert, mais pas « telle quelle »). — B. Tests sur `build/claude` (vert seulement après `f3 render`). — C. Rouge assumé jusqu'à l'étape 5 (perte du filet) | Étape 2, R16 |
| **2.2 a** Fichiers du projet propres à chaque outil dans la table | **Table commune = union des deux** : developer refuse `opencode.json`, `CLAUDE.md`, `.mcp.json`, `.claude/*` ; architect les autorise tous. Avec D2, les deux jeux de fichiers existent dans le projet : l'union est juste sous les deux outils. — Fragment par outil (inutile : il n'y a pas de cas où un outil doit autoriser ce que l'autre refuse) | 5, étape 3 (neutralisation) |
| **2.2 b** Chemins sous `~` | **Les mettre aussi dans l'union.** `~/.config/opencode/opencode.json: ask` est sans effet sous Claude Code, qui n'y écrit pas ; `~/.claude/skills/*: allow` (lecture du tester) est inoffensif sous OpenCode, qui lit aussi ce dossier (W11). Aucune variable ni fragment. — Variable `{{TOOL_CONFIG}}` (un mécanisme de plus pour deux lignes). — Fichier `<agent>.permission.<outil>` concaténé (idem) | 5 |
| **2.2 c** Outils refusés hors de la table (le garde refuse les clés inconnues) | **Une liste par agent, à part de la table** : une ligne `deny-tools:` dans le frontmatter commun de l'agent (par exemple `deny-tools: bash penpot playwright`), traduite par le rendu : `bash: deny`, `penpot_*: deny` sous OpenCode ; `disallowedTools: Bash, mcp__penpot__*` sous Claude Code. La correspondance des outils intégrés (`bash` → `Bash`) est une table de quelques lignes par outil dans `tools/<outil>/`, pas une condition. — Faire ignorer par le garde les clés qu'il ne connaît pas (modifie `cli/`, et une faute de frappe dans `edit` passerait sans bruit) | 5, étape 4 |
| **2.2 d** Variables de 4.5 incomplètes | Avec 2.2 a à c, **aucune variable nouvelle** : la liste reste `EXPLORE`, `GENERAL`, `SUBAGENT_TOOL`, `ARG1`, `ARG2`, et le rendu gagne un seul mécanisme, la traduction de `deny-tools` | 4.5 |

### 6.2 Incohérences internes

| Constat | Solution recommandée | Où |
|---|---|---|
| 42 au lieu de 30 fichiers modifiés | Remplacer par « 30 des 42 fichiers des modules modifiés (12 identiques) » | 2 |
| En-tête muet sur l'étape 2 annulée | Une phrase : « L'étape 2, commencée puis annulée, attend le choix de 2.1 de la revue » | En-tête |
| Rendu encore décrit en sh | Réécrire 4.5 : rendu en Node.js (`f3 render`), mêmes limites (concaténation, variables, traduction de `deny-tools`, aucune condition). D7 : « Node.js ». Section 5 : « le rendu » au lieu de « `install.sh` » ; supprimer « boucle de trois lignes en sh » et « un seul `sed` » | 4.5, 5, D7 |
| R3 dans `install.sh` | « `f3 render` échoue s'il reste `{{` dans le rendu, avant toute bascule » ; un test `node --test` le vérifie | R3 |
| Liens du sommaire | Corriger les liens : `#6-vérifications` et `#7-décisions` (les titres sont justes depuis que les vérifications et décisions sont faites) | Sommaire |
| `install.sh` en bash, pas en sh | **Écrire « bash »** dans la demande et en 4.5, avec la contrainte « compatible bash 3.2 » (version livrée sur macOS) : le script actuel la respecte (`[[ ]]`, tableaux, `shopt -s nullglob`, pas de `mapfile`). — Réécrire en sh POSIX : coût réel (tableaux, `[[`), aucun gain, puisque Node.js est de toute façon requis. **À confirmer par vous : c'est votre demande initiale** | 1, 4.5 |
| Source de « Still on main » | Citer « drift log de `ref/claude-code`, ligne 82 », et ajouter que glob et grep lisent aussi le code sous OpenCode | 4.7 |
| `render` absent de `RESERVED` | `RESERVED = ['state', 'guard', 'guard-prompt', 'help', 'tool', 'render']` ; le test « none uses a reserved name » le couvre déjà | 4.6, étape 5 |

### 6.3 Ce qui manque

| Constat | Options | Où |
|---|---|---|
| **4.1** Nettoyage qui casse R10 | **Dossiers nommés par l'empreinte du contenu.** Le rendu se fait en mémoire, puis son empreinte (SHA-256 des chemins et contenus) donne le nom `build/<outil>.<empreinte>/`. Si ce dossier existe, rien n'est écrit, et seul le lien bascule si besoin. Sinon, écriture dans `build/.tmp.<pid>/`, puis `rename()` vers le nom final : le dossier n'existe sous son nom final qu'une fois complet, sans fichier `.complete`. Deux rendus simultanés du même contenu convergent vers le même dossier (le second `rename()` échoue, son dossier temporaire est supprimé). Le nettoyage supprime les dossiers à empreinte qui ne sont pas la cible du lien, et les `.tmp.*` de plus d'une heure : il ne touche jamais un rendu en cours. Bonus : l'empreinte différente de la cible actuelle donne gratuitement la ligne « le rendu a changé » de 4.4 (R1). — Fichier `.complete` écrit en dernier (marche, mais un dossier neuf par lancement : `build/` grossit à chaque `f3`) | 4.4, R10, R1 |
| **4.2** Rendu en échec au lancement | **Fermer, sans bascule** : le lien garde le dernier rendu complet ; le lanceur affiche l'erreur et ne lance pas ; `f3 state` l'écrit dans l'état de lancement, ce qui arrête la commande (consigne de R12). Lancer quand même sur l'ancien rendu reproduirait l'écart silencieux que D4 combat. Cas du toolkit en lecture seule : avec 6.3/4.1, si le dossier de l'empreinte existe déjà, rien n'est écrit et tout marche ; sinon, erreur claire (« toolkit en lecture seule et rendu périmé : lancez `install.sh` avec les droits »). — Lancer sur l'ancien rendu avec un avertissement | 4.4, nouveau risque R17 |
| **4.3** Définition d'« outil installé » | **f3 est installé pour cet outil** : `~/.claude/agents/analyst.md` (ou `~/.config/opencode/agents/analyst.md`) est un lien vers le dépôt du toolkit. Une seule fonction `installedTools()` dans `cli/`, sans manifeste, même critère que `install.sh --remove`. — Binaire dans le `PATH` (écrirait des fichiers de projet pour un outil sans f3) | 4.6, D2, D3 |
| **4.4** Fichiers OpenSpec du projet | **`f3 init` lance `openspec init --tools <outils installés>`**, liste séparée par des virgules (`--tools claude,opencode`, accepté par OpenSpec 1.16.0). `state.mjs` liste les fichiers de cadrage et les skills OpenSpec des deux outils (`.claude/skills`, et le dossier écrit par `--tools opencode`, à relever à l'étape 6). Le thème « outils » de 4.10 relance `openspec init --tools` pour l'outil manquant | D2, 4.10, étape 6 |
| **4.5** `toolkit.mjs` et le nouveau format | **Dans l'étape qui change le format**, pas à l'étape 5 : à l'étape 4, `commands()` lit `agent:`, `loadPolicy()` lit `<agent>.permission`, et les fixtures de 2.1 passent au nouveau format dans le même commit. Le critère de fin de l'étape 4 ajoute « `node --test` vert » | Étapes 4 et 5 |
| **4.6** Pas de `.gitignore` | `.gitignore` avec `build/` dans le premier commit de l'étape 2, avant tout rendu | Étape 2 |
| **4.7** Ordre dans `install.sh` | Écrire l'ordre : (1) `f3 render` ; (2) liens ; (3) nettoyage des liens morts. Et `install.sh` s'arrête si (1) échoue, avant de toucher aux liens | 4.5, R11 |
| **4.8** OpenCode charge les skills rendues pour Claude Code | **Supprimer le problème en neutralisant toutes les skills** (4.1 de l'analyse) : `f3-agent` est déjà commune (D6) ; `f3-standards` devient commune avec D2, puisqu'elle décrit les fichiers des deux outils ; il reste un mot dans `review.md` (`explore` / `Explore`, outil de sous-agent), à écrire de façon neutre (« the built-in exploration subagent: `Explore` under Claude Code, `explore` under OpenCode »). Plus aucune skill rendue : V-O6 et R15 tombent aussi, et les skills restent des liens directs vers les sources. — Documenter le cas en section 16 du GUIDE (garde le rendu des skills) | 3, 4.1, V-O6, R15 |

### 6.4 Décisions prises (2026-11-07)

Toutes les solutions recommandées ont été retenues, sauf pour `install.sh` : bash **sans** contrainte de version. Elles sont reportées dans `analyse-multi-outil.md` :

| Constat | Décision | Dans l'analyse |
|---|---|---|
| 2.1 | Reprise de `cli/` en deux commits | D14, étape 2, R16 |
| 2.2 a, b, d | Table commune = union des deux outils, sans variable | D15, section 5, 4.5 |
| 2.2 c | Clé `deny-tools` par agent, traduite par le rendu | D15, section 5, 4.5 |
| Section 1 / 4.5 | bash, sans contrainte de version | D16, section 1, 4.5 |
| 4.1 | Dossiers nommés par l'empreinte, nettoyage sûr | D17, 4.4, R9, R10 |
| 4.2 | Rendu en échec : on ne lance pas | D18, 4.4, R17 |
| 4.3 | Outil installé = f3 installé pour lui | D19, 4.3 |
| 4.4 | `openspec init --tools <outils installés>` | D2 complétée, étape 6 |
| 4.5 | `toolkit.mjs` adapté à l'étape 4, même commit | Section 5, étape 4 |
| 4.6, 4.7 | `.gitignore` à l'étape 2 ; ordre rendu → liens → nettoyage | Étape 2, 4.5, R11 |
| 4.8 | Toutes les skills communes | D20, section 3, V-O6, R15 |
| 6.2 | Toutes les corrections de texte | En-tête, sommaire, 2, 4.5, 4.6, 4.7, D7, R3 |

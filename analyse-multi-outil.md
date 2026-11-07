# Analyse : un toolkit f3, plusieurs outils (Claude Code, OpenCode)

Document de travail, en français, à supprimer ou à verser dans la documentation à la fin des travaux. Branche `feat/multi-harness`, tirée de `main` (`a33b9d3`).

**État au 2026-11-07.** Décisions D1 à D13 prises (section 7), D4 révisée après la revue des risques. Vérifications V-O1 à V-O7 faites (section 6). Risques R1 à R16 revus et leurs parades décidées (section 9). Prochaine étape : l'étape 2 de la section 8, le rendu et la comparaison avec les deux références.

Dans ce document, **outil** désigne l'outil qui fait tourner les agents (Claude Code, OpenCode), pour ne pas le confondre avec les **agents** f3 (analyst, architect, developer, tester, ux).

## Sommaire

1. [La demande](#1-la-demande)
2. [État des lieux](#2-état-des-lieux)
3. [Ce qui diffère vraiment entre les deux versions](#3-ce-qui-diffère-vraiment-entre-les-deux-versions)
4. [Challenge de la proposition](#4-challenge-de-la-proposition)
5. [Architecture proposée](#5-architecture-proposée)
6. [Vérifications à faire avant de construire](#6-vérifications-à-faire-avant-de-construire)
7. [Décisions à prendre](#7-décisions-à-prendre)
8. [Étapes proposées](#8-étapes-proposées)
9. [Risques](#9-risques)

---

## 1. La demande

- Préserver absolument le workflow f3.
- L'outil (dans un premier temps Claude Code ou OpenCode) est un choix de l'utilisateur ; OpenSpec reste dans tous les cas.
- Mettre en commun tout ce qui peut l'être, et assembler les fichiers propres à chaque outil à l'installation.
- Un installateur aussi simple que possible, en script sh.

## 2. État des lieux

| Source | Où | Contenu |
|---|---|---|
| Version OpenCode | ce dépôt, `main` (`a33b9d3`) | le toolkit d'origine |
| Version Claude Code | ce dépôt, `feat/claude-code` (`ef8c84a`, poussée sur `origin`) | portage complet : 42 fichiers des modules modifiés, plus la commande `f3` (`cli/`, 112 tests) ; vérifiée en vraies sessions, sauf l'étape 9 (déroulé complet et V1). Son plan de travail : `/home/theo/Documents/poc/agentic-toolkit-claude/docs/plan-claude-code.md` (décisions C1 à C12, vérifications W1 à W11) |
| Proposition multi-outil antérieure | `docs/multi-tool-install.md` (691 lignes), non disponible | sources neutres rendues par outil, adaptateurs locaux générés par `f3 setup`, garde partagé (hook Claude Code, plugin OpenCode). Connue seulement par le message de son commit et le résumé du plan de travail ci-dessus |

## 3. Ce qui diffère vraiment entre les deux versions

Mesure faite fichier par fichier sur les 42 fichiers de `modules/`, après deux substitutions mécaniques sur la version OpenCode : `/f3-<étape>` devient `f3 <étape>`, et `~/.config/opencode/scripts/` devient `~/.local/share/f3/scripts/`.

**Résultat : 21 fichiers sur 42 deviennent identiques.** Ce sont le schéma et ses templates, `f3-features.mjs`, `spec-practice`, `e2e-practice`, `ux-practice`, `ux-penpot` et les autres références de `f3-standards`. Le reste :

| Fichiers | Écart réel | Nature |
|---|---|---|
| 5 agents | frontmatter entier (OpenCode : `mode`, `permission` ; Claude Code : `name`, `disallowedTools`, `f3-permission`, `hooks`) ; une ligne du corps de `ux` (sous-agent `general` / `general-purpose`, task tool / Agent tool ; sous OpenCode 2.2.5, l'outil s'appelle `subagent`, V-O3) | propre à l'outil |
| 12 commandes | frontmatter (`agent:` / `f3-agent:`, `argument-hint`, `disable-model-invocation`, `allowed-tools`) ; ligne de garde « This command runs as… » ; injections (29 injections shell / une seule `f3 state`) ; `$1`, `$2` / `$0`, `$1` dans `f3-ux-design` ; `explore` / tester en sous-agent dans `f3-acceptance` ; `f3-init` (fichiers du projet, `openspec init --tools`) | propre à l'outil, sauf les injections, qui peuvent devenir communes (4.6) |
| `f3-standards/SKILL.md` et `references/agents-md.md` | section des fichiers du projet (`opencode.json` / `CLAUDE.md`, `.mcp.json`, `.claude/settings.json`) | propre à l'outil |
| `f3-agent/SKILL.md` | règles 10 et 11 ; section « Consulted as a subagent » | commun possible : cette section vaut aussi sous OpenCode |
| `f3-agent/references/review.md` | `explore` / `Explore`, task tool / Agent tool (`subagent` sous OpenCode 2.2.5) | un mot par outil |

Conclusion : **l'écart est petit et localisé**, à une condition : que les deux outils nomment les commandes de la même façon et que le script soit au même endroit. Sinon les renvois aux commandes (116 occurrences dans 27 fichiers) obligent à rendre presque tous les fichiers.

## 4. Challenge de la proposition

### 4.1 « Assembler à l'installation » : oui, mais en dernier recours

Votre proposition met en commun ce qui peut l'être et assemble le reste. La mesure de la section 3 montre qu'il faut d'abord **neutraliser**, puis seulement assembler :

1. **Neutraliser** : écrire une seule fois tout ce qui peut s'écrire de la même façon pour les deux outils : nom des commandes (4.2), chemin du script, injection `f3 state` (4.6), section « Consulted as a subagent ». Ces fichiers ne passent par aucun rendu et restent des liens symboliques.
2. **Assembler** seulement ce qui ne peut pas être commun : le frontmatter des agents et des commandes, la section des fichiers du projet, une poignée de mots (noms des sous-agents intégrés).

Pourquoi : chaque fichier rendu coûte. Il faut réinstaller après chaque modification (4.4), un fichier rendu ne se relit pas tel quel dans le dépôt, et une variable mal substituée ne se voit qu'à l'exécution. Le bon indicateur est le nombre de fichiers rendus, à garder le plus bas possible.

### 4.2 Le nom des commandes : la décision qui commande toutes les autres

Claude Code ne peut pas choisir l'agent depuis une commande : c'est la session qui le fixe à son démarrage, d'où le lanceur `f3 <étape>` (`claude --agent <agent> "/f3-<étape> …"`). Sous OpenCode, `/f3-<étape>` tapé dans une session bascule seul sur l'agent déclaré par la commande.

| Option | Effet |
|---|---|
| **A. `f3 <étape>` pour les deux outils** (recommandée) | Un seul nom partout : les 116 renvois, le GUIDE et le README sont communs. Sous OpenCode, `f3 propose` lance `opencode --prompt "/f3-propose"` (OpenCode 2.2.5 n'a pas de `--agent`, mais la commande choisit son agent). Un utilisateur OpenCode peut toujours taper `/f3-propose` dans une session : les deux marchent. |
| B. Une variable `{{CMD propose}}` rendue `/f3-propose` ou `f3 propose` | Le comportement natif de chaque outil est préservé, mais presque tous les fichiers des modules deviennent des fichiers rendus, et le GUIDE doit être écrit deux fois ou rester abstrait. |
| C. Une formulation neutre (« the propose step ») | Les fichiers sont communs, mais l'agent ne donne plus la commande exacte à lancer, ce qui contredit la règle 10 de `f3-agent`. |

L'option A fait aussi profiter OpenCode du contrôle des arguments par `f3 state` (4.6). À vérifier : V-O1.

**Ajouter un prompt libre au lancement** (demande du 2026-11-07). Certains cas demandent de donner à l'agent, dès le lancement, des consignes ou des faits que le dépôt ne dit pas. Le GUIDE le prévoit déjà pour l'adoption (section 14, point 4 : « run /f3-init with a prompt that gives the facts… »), alors que `/f3-init` ne prend aucun argument.

Aujourd'hui, le lanceur passe tous ses arguments à la commande, qui les reçoit dans `$ARGUMENTS`, et `f3 state` les contrôle comme un identifiant de change. Un texte libre ajouté à la suite ferait donc échouer ce contrôle. Proposition :

- forme unique : `f3 <étape> [<arguments>] [-- <prompt>]`, par exemple `f3 dev add-invoice-issuing -- reprends à la tâche 2.3, la 2.2 est faite à la main` ou `f3 init -- le projet est en français, Penpot est retenu` ;
- **règle stricte (décidée le 2026-11-07) : le prompt est toujours en dernière position.** Le lanceur s'arrête au premier `--` : tout ce qui le précède, ce sont les arguments de l'étape ; tout ce qui le suit, c'est le prompt, pris tel quel et jamais analysé. Un `--`, une option (`--tool`, `--…`) ou un identifiant écrits dans le prompt ne sont que du texte : ils ne changent ni l'étape, ni ses arguments, ni l'outil ;
- **le prompt ne passe jamais par le message de lancement** (résultat de V-O7, section 6) : les deux outils mettent tout le message dans `$ARGUMENTS`, retours à la ligne compris, et `$ARGUMENTS` est substitué tel quel dans la ligne shell de l'injection. Une apostrophe dans le prompt suffit à exécuter une commande arbitraire sous OpenCode (constaté), et fait échouer le lancement sous Claude Code (son contrôle de permissions refuse la ligne) ;
- **il passe par un fichier, désigné par une variable d'environnement** (vérifié sous les deux outils) : le lanceur écrit le prompt dans un fichier temporaire, privé (mode 600), et lance l'outil avec `F3_LAUNCH=<chemin>`. L'injection hérite de cette variable : `f3 state` lit le fichier, l'affiche en dernier dans l'état de lancement, sous le repère « Note from the user: », puis le supprime. Le texte du prompt n'apparaît dans aucune ligne shell ;
- le message de lancement ne contient que `/f3-<étape> <arguments> ` (avec une espace finale, nécessaire sous OpenCode, V-O1), et le lanceur refuse tout argument qui n'est pas un identifiant (`^[a-z0-9-]+$`). L'idée libre de `f3 propose <idée>` passe donc, elle aussi, par le fichier, comme un prompt ;
- un `--` sans texte derrière est refusé, pour signaler une erreur de frappe plutôt que lancer l'étape sans le prompt voulu ;
- tests de la commande `f3` : un prompt qui contient `--`, une option, un identifiant de change, une apostrophe ou un retour à la ligne laisse les arguments et l'outil inchangés, et n'apparaît dans aucune commande exécutée ;
- chaque commande dit, dans son corps commun, que la note de l'utilisateur précise la demande sans remplacer le workflow : elle ne lève aucune précondition et ne saute aucune étape (règles 1 et 12 de `f3-agent`) ;
- sous OpenCode, la variable n'atteint l'injection que si le serveur est un processus enfant du lanceur : le lanceur utilise `opencode --standalone`. Le service OpenCode géré en arrière-plan (`opencode serve --service`) n'hérite pas de l'environnement du lanceur (déduit, non testé pour ne pas toucher au service de la machine).

### 4.3 « L'utilisateur choisit l'outil » : par machine ou par projet ?

C'est le point que votre proposition ne tranche pas, et il a deux niveaux :

- **Sur la machine**, l'utilisateur installe le toolkit pour un outil, ou pour les deux. Rien ne s'y oppose : les cibles sont distinctes (`~/.claude/` et `~/.config/opencode/`). Seul point de contact, constaté par W11 : OpenCode lit aussi `~/.claude/skills/`, mais donne la priorité aux siennes. Les deux installations peuvent donc coexister.
- **Dans le projet**, `/f3-init` écrit des fichiers **versionnés** propres à l'outil (`opencode.json`, ou `CLAUDE.md`, `.mcp.json`, `.claude/settings.json`). Un projet partagé par une équipe mixte en a besoin pour chaque outil. La proposition antérieure avait choisi des adaptateurs locaux non versionnés (`f3 setup`) ; le portage est revenu à des fichiers versionnés (C2), plus simples.

Recommandation : `/f3-init` écrit les fichiers de **chaque outil installé sur la machine**, et ceux d'un outil déjà présents dans le projet. Les serveurs MCP restent décidés une seule fois, dans la section Stack d'AGENTS.md : `opencode.json` et `.mcp.json` en sont deux traductions, pas deux sources. Décision D2.

### 4.4 La perte des liens symboliques

Aujourd'hui, une modification du dépôt est active tout de suite, sans réinstaller (README). Un fichier assemblé est une copie : il faut relancer `install.sh` après chaque modification, sinon on teste une version périmée sans s'en rendre compte. C'est exactement le genre d'écart silencieux que le drift log combat.

Parades, à combiner :
- rendre le moins de fichiers possible (4.1) : tout le reste reste lié ;
- écrire les fichiers rendus dans un dossier du dépôt ignoré par Git (`build/<outil>/`), puis lier les cibles vers ce dossier : `install.sh` ne fait que reconstruire `build/`, et le lien reste stable ;
- **décidé (D4, 2026-11-07, révisée le même jour après la revue des risques) : le rendu est refait à chaque lancement.** Le lanceur `f3 <étape>` et `f3 state` refont le rendu à chaque appel, sans comparer de dates. Tout ce qui passe par `f3` est ainsi actif sans réinstaller, comme aujourd'hui.

Pourquoi pas une comparaison de dates (première version de D4) : une source supprimée ou renommée ne rend aucune source « plus récente », et le fichier rendu périmé resterait chargé ; un `git checkout` vers une version antérieure peut aussi fausser les dates (R8). Le rendu d'une trentaine de petits fichiers coûte quelques millisecondes : le refaire toujours est juste dans tous les cas et coûte moins de code.

Conséquences de D4 :
- le rendu doit pouvoir être appelé par le lanceur et par `f3 state` : il est écrit une seule fois, en Node.js (`f3 render`), et `install.sh` l'appelle. C'est le « Node.js au besoin » de D7 : le rendu passe en Node.js dès maintenant, et `install.sh` garde le choix de l'outil, les prérequis, les liens et `--remove` ;
- **bascule atomique d'un lien** (R9, R10) : chaque rendu est écrit dans un dossier neuf au nom unique, `build/<outil>.<id>/`, puis `build/<outil>` (un lien symbolique) est remplacé d'un coup : un nouveau lien est créé à côté, puis renommé par-dessus l'ancien (`rename()` est atomique sur un lien). Les rendus précédents sont supprimés ensuite. Une session ouverte dans un autre terminal ne lit jamais un rendu à moitié écrit, et deux rendus simultanés ne se mélangent pas : le dernier lien posé gagne, et les deux rendus sont complets. Pas de verrou ;
- les liens d'installation (`~/.claude/…`, `~/.config/opencode/…`) pointent vers `build/<outil>/…`, chemin qui traverse le lien basculé : ils ne changent jamais après l'installation ;
- si `build/` a disparu (`git clean -fdX`, nouveau clone), le prochain `f3` le reconstruit (R11) ;
- `f3 state` écrit donc dans `build/` du dépôt du toolkit : la promesse du README et du GUIDE (15.4) « les injections ne font que lire » devient « elles ne font que lire le projet ; `f3 state` refait le rendu du toolkit dans son dossier `build/` » (étape 7) ;
- limite : sous OpenCode, `/f3-<étape>` tapé directement dans une session ne passe pas par le lanceur. L'injection `f3 state` refait le rendu, donc les skills chargées ensuite sont à jour ; mais l'agent et la commande, chargés à l'ouverture de la session, peuvent être périmés. Si le rendu a changé un fichier, `f3 state` le signale en une ligne de l'état de lancement : c'est un avertissement, pas un blocage (R1).

### 4.5 « Un installateur simple en sh » : tenable, à condition de limiter le rendu

**Décidé le 2026-11-07 :** Node.js est permis au besoin, puisqu'OpenSpec l'impose déjà. `install.sh` reste le point d'entrée en sh (choix de l'outil, prérequis, liens, `--remove`). Le rendu passe en Node.js (par exemple `f3 render`, testé avec `node --test` comme le reste de `cli/`) dès qu'il dépasse les limites ci-dessous, sans nouvelle discussion.

Le rendu en sh reste simple et sûr s'il se limite à deux mécanismes :

1. **la concaténation** : `frontmatter de l'outil` + `corps commun` (+ un fragment propre à l'outil inséré à un repère) ;
2. **la substitution d'un jeu fixe de variables**, définies une seule fois par outil (`tools/<outil>/vars`) et toutes listées : `{{EXPLORE}}`, `{{GENERAL}}`, `{{SUBAGENT_TOOL}}`, `{{ARG1}}`, `{{ARG2}}`. Une variable inconnue ou non substituée fait échouer l'installation (contrôle par `grep '{{'` sur `build/`).

Interdits : les conditions, les boucles et les transformations de YAML dans le rendu. Dès qu'il en faudrait, c'est le signe qu'un fragment par outil doit être écrit. Avec ces limites, le rendu tient en une cinquantaine de lignes de sh POSIX (`sed`, `cat`) ; au-delà, c'est un deuxième programme déguisé en installateur.

Node.js reste de toute façon requis (OpenSpec, `f3-features.mjs`, la commande `f3`). Au-delà de ces limites, le rendu passe en Node.js (voir la décision en tête de cette section).

Ce qui reste dans `install.sh` : le choix de l'outil (question interactive sans argument, ou `./install.sh claude|opencode|all` pour un script : D9), les prérequis par outil, `--remove`, et le nettoyage des liens morts. Pour ne jamais supprimer un fichier qu'il n'a pas créé, il reconnaît ses propres liens comme aujourd'hui (`readlink` vers le dépôt) : c'est un avantage de garder des liens vers `build/` plutôt que des copies, et on évite ainsi un manifeste.

### 4.6 La commande `f3` : commune, sauf le garde

| Sous-commande | Claude Code | OpenCode |
|---|---|---|
| `f3 <étape>` (lanceur) | indispensable | retenu (D1) : `opencode --standalone --prompt`, seul moyen de transmettre `F3_LAUNCH` (V-O7) |
| `f3 state <commande>` | indispensable | **retenue (D8)**. Une injection en erreur n'y interrompt pas la commande (V-O4). elle remplace 29 injections shell, dont certaines échouent dans des cas normaux, par une seule injection par commande, et contrôle l'identifiant du change (mécanisme et non plus consigne, drift log). Le corps des commandes devient commun. |
| `f3 guard`, `f3 guard-prompt` | hooks | sans objet (OpenCode a ses permissions natives) |

Le lanceur est aujourd'hui écrit pour Claude Code seulement (`spawnSync('claude', …)`) : il doit lire l'outil choisi.

**Décision D3 (2026-11-07) : l'outil est une configuration du projet, propre à chaque utilisateur, non versionnée.** Deux développeurs d'un même projet peuvent ainsi travailler chacun avec son outil, ce qui va avec D2. Mise en œuvre :

- un fichier `.f3/local` à la racine du projet, qui contient pour l'instant une seule clé : `tool=claude` ou `tool=opencode`. Le dossier `.f3/` est réservé aux réglages locaux de f3 : D4 ou la vérification de version pourront y ajouter des clés, sans nouveau fichier ;
- `/f3-init` ajoute `.f3/local` au `.gitignore` du projet ;
- le lanceur lit `.f3/local`. Si le fichier est absent et qu'un seul outil est installé, il prend cet outil et écrit le fichier. Si les deux sont installés, il demande une fois, dans le terminal, puis écrit le fichier ;
- pour changer d'outil, on modifie le fichier, ou on lance `f3 tool opencode` (sous-commande réservée, à ajouter à `RESERVED`).

Validé le 2026-11-07 : `.f3/local` et `f3 tool`. Il n'y a pas de variable `F3_TOOL` : la configuration du projet est la seule source. L'outil choisi n'a pas d'effet sur les fichiers versionnés du projet : `/f3-init` écrit toujours ceux de chaque outil installé (D2).

### 4.7 « Préserver le workflow » ne veut pas dire « mêmes garanties »

Le workflow (étapes, artefacts, schéma, revues, décisions de l'utilisateur) est le même. Les **mécanismes** de contrôle diffèrent, et la section 12 du GUIDE doit le dire outil par outil :

- **Tester.** Sous Claude Code, le garde l'empêche de lire le code par le shell et par un sous-agent. Sous OpenCode, la règle de lecture ne couvre que l'outil read (drift log du portage : « Still on main ») ; en revanche, la restriction des sous-agents y est native (V-O2). Fermer cet écart sous OpenCode demande un plugin (piste de la proposition antérieure), donc du code et des vérifications : hors du premier périmètre (D5, retenue) ; l'écart est documenté.
- **Relecture de fidélité de `/f3-acceptance`.** Sous OpenCode, `main` la confie au sous-agent `explore`, qui peut lire le code ; sous Claude Code, c'est le tester lui-même en sous-agent. C'est une différence de workflow, pas seulement de syntaxe. V-O3 montre qu'un agent OpenCode en `mode: all` peut s'appeler lui-même en sous-agent, et V-O2 que la permission `subagent` le limite à lui-même : la relecture est donc unifiée sur le tester en sous-agent sous les deux outils (D5).
- **Commandes lancées sous le mauvais agent.** Sous Claude Code, `guard-prompt` les bloque ; sous OpenCode, la commande bascule elle-même sur le bon agent.

### 4.8 La documentation n'est pas rendue

Le GUIDE (1 047 lignes) et le README se lisent dans le dépôt, pas après installation. Ils restent communs, avec des encadrés « Claude Code » / « OpenCode » là où les outils diffèrent : installation, section 3 (les briques), section 12 (contrôles), section 15 (dépannage), section 16 (limites). L'option A de 4.2 rend le reste identique.

### 4.9 La preuve que le workflow est préservé

C'est le point le plus important pour votre contrainte, et il ne coûte presque rien : on dispose de **deux références qui fonctionnent**.

- `install.sh --render <dossier>` (ou une cible de test) rend chaque outil dans un dossier sans rien installer.
- Le rendu OpenCode est comparé (`diff -r`) aux fichiers de `main`, et le rendu Claude Code aux fichiers de la branche `feat/claude-code`.
- Chaque différence restante est **voulue et listée** dans ce document (par exemple `/f3-propose` devenu `f3 propose` sous OpenCode). Toute autre différence est une régression.

Cette comparaison sert de test de non-régression pendant tout le chantier. Ensuite, elle se rejoue sur les tests de la commande `f3` (`node --test`).

### 4.10 La migration des projets déjà cadrés

Question posée le 2026-11-07 : faut-il une commande de migration (`f3 migrate`) ? Je recommande que non, pour trois raisons.

1. **Le contenu de la migration n'est pas mécanique.** Il faut écrire les fichiers de l'autre outil : `opencode.json`, ou `CLAUDE.md`, `.mcp.json` et `.claude/settings.json`. Leurs serveurs MCP se déduisent de la section Stack d'AGENTS.md, qui est de la prose. C'est un travail d'agent, avec la validation de l'utilisateur ; un script ne peut pas le faire sans deviner.
2. **Une information, un seul endroit.** `f3 init` sait déjà écrire ces fichiers et a un mode mise à jour par thème. Une commande à part dupliquerait cette connaissance ; or les deux copies divergeraient, comme le README l'annonce de toute copie.
3. **Le problème d'une commande à part, c'est la découverte, et elle se règle autrement.** `f3 state init` détecte un projet cadré auquel il manque les fichiers d'un outil installé, ou qui n'a pas `.f3/local` dans son `.gitignore`. `f3 init` propose alors d'office le thème « outils », sans attendre que l'utilisateur pense à le demander. Les autres commandes (`f3 propose`, etc.) peuvent signaler ce manque en une ligne de leur état de lancement, sans s'arrêter.

Ce que fait le thème « outils » : ajouter les fichiers des outils installés qui manquent, ajouter `.f3/local` au `.gitignore`, et reconnaître le repère d'AGENTS.md sous ses deux formes (« written by /f3-init » et « written by f3 init »), puis le réécrire sous la forme actuelle. Il ne touche à rien d'autre.

Ce qui me ferait changer d'avis : un changement de format des fichiers existants (specs, registres, `ux.md`), qui serait, lui, mécanique et répétitif. Dans ce cas, un script de migration versionné dans le toolkit se justifierait (drift log 32 : un script quand le déterminisme le justifie).

### 4.11 Ce que je ne ferais pas maintenant

- Un modèle générique pour « n'importe quel outil » (manifeste par outil, découverte automatique) : le dossier `tools/<outil>/` suffit, et un troisième outil montrera ce qui est vraiment commun (drift log 32).
- Le plugin OpenCode du garde (D5).
- `f3 setup`, `f3 doctor` ou la version du projet : hors du périmètre du portage, et toujours pas demandés.

## 5. Architecture proposée

```
modules/<module>/
├── agents/<agent>.md            corps commun (rôle, méthode, périmètre d'écriture), sans frontmatter
├── agents/<agent>.permission    table de permissions commune, sémantique OpenCode (dernière règle gagnante)
├── commands/f3-<étape>.md       frontmatter commun (description, agent, argument-hint) + corps commun
├── skills/, schemas/, scripts/  communs, liés tels quels
tools/
├── claude/
│   ├── vars                     EXPLORE=Explore, GENERAL=general-purpose, SUBAGENT_TOOL=the Agent tool, ARG1=$0, ARG2=$1
│   ├── agent.head               modèle du frontmatter d'agent (name, disallowedTools, f3-permission, hooks)
│   ├── command.head             lignes ajoutées au frontmatter commun (disable-model-invocation, allowed-tools)
│   └── fragments/               sections propres à l'outil : fichiers du projet (f3-standards, f3-init)
└── opencode/
    ├── vars                     EXPLORE=explore, GENERAL=general, SUBAGENT_TOOL=the subagent tool, ARG1=$1, ARG2=$2
    ├── agent.head               (mode: primary, permission)
    └── fragments/
cli/                             commande f3 : lanceur, state, render, tool (communs), guard (Claude Code)
build/<outil>                    lien basculé vers le dernier rendu complet build/<outil>.<id>/ ; ignoré par Git, cible des liens
install.sh                       question interactive, ou claude|opencode|all ; --render <dossier> ; --remove
```

Points de conception :

- **Une table de permissions, deux rendus.** Elle est déjà écrite avec la sémantique d'OpenCode, que le garde de Claude Code reproduit. `install.sh` l'insère sous `permission:` pour OpenCode et sous `f3-permission:` pour Claude Code : c'est le même texte sous une autre clé, une concaténation. Les clés propres au garde (`shell_read_programs`, `subagent`) ne doivent pas casser OpenCode : vérification V-O2 ; sinon, un second fichier `<agent>.permission.claude`.
- **Les serveurs MCP refusés** sont une liste commune (`penpot searxng playwright`), rendue en `penpot_*: deny` pour OpenCode et en `disallowedTools: mcp__penpot__*` pour Claude Code. Il faut une boucle de trois lignes en sh, sans transformation de YAML.
- **Le frontmatter des commandes** est écrit sous une clé neutre (`agent:`), renommée en `f3-agent:` pour Claude Code (W3 : la clé `agent:` y a un autre sens). C'est un seul `sed`.
- **Le garde lit la table de permissions dans le dépôt** (`modules/…/<agent>.permission`) et non dans le fichier rendu : il n'y a qu'une source.
- **Le tester est en `mode: all` sous OpenCode** (V-O3), pour être appelé en sous-agent par lui-même. Sa clé `subagent` (`"*": deny`, `tester: allow`) est appliquée par OpenCode lui-même (V-O2) et, sous Claude Code, par le garde.
- **Le lanceur, par outil** (V-O1, V-O7) : Claude Code, `claude --agent <agent> "/f3-<étape> <arguments>"` ; OpenCode, `opencode --standalone --prompt "/f3-<étape> <arguments> "`, avec une espace finale. Sous les deux, le prompt libre et l'idée de `f3 propose` passent par `F3_LAUNCH`, et les arguments sont des identifiants contrôlés avant le lancement.
- **Chaque commande commence par la même consigne** : « If the launch state is missing, empty or reports an error, show it and stop » (élargie pour R12). Sous OpenCode, une injection en erreur n'interrompt pas la commande (V-O4) : cette consigne y tient lieu de mécanisme.

## 6. Vérifications

Faites le 2026-11-07, avec OpenCode 2.2.5 et Claude Code 2.1.319. Projet de test, preuves et scripts : `/home/theo/Documents/poc/test-f3-setup/multi-outil/` (`evidence/`, `bin/`, `build/`).

**Méthode.**
- **OpenCode** tourne dans un HOME virtuel (`multi-outil/home/`, avec `HOME` et les `XDG_*` redirigés, via `bin/oc`), en `--standalone` pour ne pas toucher au service OpenCode de la machine, avec le modèle gratuit `opencode/big-pickle`. L'interface interactive est pilotée par un pseudo-terminal (`bin/pty_drive.py`), et les messages sont relus dans la base de ce HOME virtuel.
- **Claude Code** : copier vos identifiants dans le HOME virtuel a été refusé par le contrôle de sécurité, et je ne l'ai pas contourné. Les essais utilisent donc des agents et des commandes du projet de test (`projc/.claude/`), en `claude -p`, avec votre HOME réel. Rien n'a été écrit dans `~/.claude/` hors les journaux de session habituels. Aucun fichier de `~/.claude/` ni de `~/.config/opencode/` n'a changé (contrôlé à la fin).

| # | Question | Résultat | Conséquence |
|---|---|---|---|
| V-O1 | `opencode --prompt "/f3-<étape> …"` exécute-t-il la commande, sous l'agent qu'elle déclare ? | **Oui** : la session bascule sur l'agent de la commande (`agent-switched`) et l'injection tourne. **Mais** une commande sans argument (`--prompt "/f3-probeenv"`) reste dans le menu d'autocomplétion sans être envoyée ; avec une espace finale (`"/f3-probeenv "`), elle part. Preuves : `vo1-oc-tui-prompt.txt`, `vo7-oc-env-tui.txt`, `vo7-oc-env-tui2.txt` | D1 tient. Le lanceur OpenCode lance `opencode --standalone --prompt "/f3-<étape> <arguments> "`, toujours avec l'espace finale |
| V-O2 | OpenCode accepte-t-il dans `permission:` les clés `shell_read_programs` et `subagent` ? | **Oui, sans erreur.** `shell_read_programs` est inerte. **`subagent` est une vraie permission d'OpenCode 2.2.5**, appliquée : `"*": deny` refuse l'appel (« Permission denied: subagent »), `probetester: allow` le permet. Preuves : `vo2-vo5-debug-agents.txt`, `vo2-oc-subagent-deny.jsonl`, `vo2-oc-subagent-allow.jsonl` | Une seule table de permissions pour les deux outils (section 5). La règle « le tester n'appelle aucun sous-agent sauf lui-même » devient un mécanisme sous OpenCode aussi |
| V-O3 | Sous OpenCode, un agent peut-il être appelé en sous-agent, y compris par lui-même ? | **Oui, avec `mode: all`.** L'outil s'appelle `subagent` dans OpenCode 2.2.5, et non plus « task ». Preuve : `vo3-oc-self-subagent.jsonl` | La relecture de fidélité de `/f3-acceptance` peut être le tester lui-même sous les deux outils (D5) : le tester passe en `mode: all` sous OpenCode. La variable `{{SUBAGENT_TOOL}}` vaut « the subagent tool » ; le « task tool » de `main` est périmé |
| V-O4 | L'injection `` !`f3 state …` `` fonctionne-t-elle sous OpenCode, et une sortie en erreur interrompt-elle la commande ? | **Elle fonctionne**, et la sortie d'erreur est transmise à l'agent. **Mais un code de sortie non nul n'interrompt pas la commande**, contrairement à Claude Code (W9). Preuve : `vo4-oc-fail-tui.txt` | `f3 state` reste commun (D8). Chaque commande porte une ligne commune : « If the launch state reports an error, show it and stop ». C'est un mécanisme sous Claude Code, une consigne sous OpenCode (section 12 du GUIDE) |
| V-O5 | Les deux outils suivent-ils un lien symbolique vers un fichier de `build/` ? | **Oui** pour les agents et les commandes des deux outils. Preuves : `vo2-vo5-debug-agents.txt`, `vo5-claude-links.txt` | Liens vers `build/` (D4) |
| V-O6 | Avec les deux outils installés, chacun charge-t-il ses propres skills ? | **OpenCode : oui.** Il charge sa version quand la même skill existe dans `~/.config/opencode/skills/` et `~/.claude/skills/`, et charge une skill qui n'existe que dans `~/.claude/skills/`. **Claude Code** ne lit que `~/.claude/skills/` et les skills du projet (documentation) : non testé dans un HOME virtuel, faute d'identifiants. Preuve : `vo6-oc-skills.jsonl` | Des skills rendues différemment par outil peuvent coexister. Toute skill f3 doit exister dans les deux rendus, pour qu'OpenCode ne charge jamais la version Claude Code |
| V-O7 | Comment chaque outil découpe-t-il « commande, retour à la ligne, texte libre » ? | **Tout part dans `$ARGUMENTS`**, retours à la ligne compris, sous les deux outils ; `$0`/`$1` (Claude Code) et `$1`/`$2` (OpenCode) découpent aux espaces. **Une apostrophe dans le texte casse les guillemets de l'injection** : sous OpenCode, la commande glissée s'exécute (fichier témoin créé) ; sous Claude Code, le contrôle de permissions refuse la ligne et la commande échoue. **Le repli fonctionne sous les deux outils** : une variable d'environnement posée par le lanceur (`F3_LAUNCH`) atteint l'injection, qui lit le prompt dans un fichier, sans qu'il passe par le shell. Preuves : `vo7-*` | Le prompt passe par un fichier et une variable d'environnement (4.2). Le lanceur n'accepte que des identifiants comme arguments |

**Constat de sécurité, hors du périmètre de la question.** Les commandes OpenCode de `main` substituent `$ARGUMENTS` **sans guillemets** dans leurs injections (`ls -1 openspec/changes/$ARGUMENTS/`…), et OpenCode exécute l'injection sans contrôle de permissions. Un argument comme `x; <commande>`, tapé ou collé, exécute donc `<commande>` au lancement. La version Claude Code met `$ARGUMENTS` entre apostrophes et passe par le contrôle de permissions de Claude Code : c'est plus sûr, mais une apostrophe fait encore échouer le lancement. Avec la conception de 4.2, les arguments sont contrôlés par le lanceur avant tout lancement, et le texte libre ne passe plus par le shell. Reste le cas d'une commande `/f3-…` tapée directement dans une session OpenCode : il faut la documenter (GUIDE, section 15.4), ou faire lire les arguments par `f3 state` ailleurs que dans la ligne shell. C'est la décision D13 : pas de correction de `main` pour le moment (décision du 2026-11-07) ; le chantier règle le cas du lanceur et documente le reste.

## 7. Décisions

| # | Décision | Recommandation | État |
|---|---|---|---|
| D1 | Nom des commandes pour les deux outils | Option A : `f3 <étape>` partout ; le prompt libre après `--` passe par un fichier désigné par `F3_LAUNCH` (4.2) | **Retenue** (2026-11-07) ; V-O1 et V-O7 faites |
| D2 | Fichiers du projet écrits par `/f3-init` | Ceux de chaque outil installé, et ceux d'un outil déjà présent dans le projet | **Retenue** (2026-11-07) |
| D3 | Outil lancé par `f3 <étape>` | Configuration du projet propre à chaque utilisateur, non versionnée : `.f3/local` (`tool=claude\|opencode`), créé par le lanceur (question si les deux outils sont installés), changé par `f3 tool <outil>` ; pas de variable `F3_TOOL` (4.6) | **Retenue** (2026-11-07) |
| D4 | Fichiers rendus périmés après une modification du toolkit | Liens vers `build/<outil>`, lui-même un lien basculé de façon atomique vers le dernier rendu complet ; le lanceur et `f3 state` refont le rendu à chaque appel, sans comparer de dates (4.4) | **Retenue** (2026-11-07) ; **révisée** le même jour (R8 à R11) : la comparaison des dates est abandonnée |
| D5 | Écarts de garanties sous OpenCode (lecture du code par le tester, relecture de fidélité) | Documentés ; pas de plugin de garde. V-O2 et V-O3 réduisent l'écart : sous OpenCode aussi, le tester n'appelle aucun sous-agent sauf lui-même (permission native `subagent`), et il fait la relecture de fidélité en `mode: all`. Reste ouverte sous OpenCode la lecture du code par le shell | **Retenue** (2026-11-07) |
| D6 | Section « Consulted as a subagent » de `f3-agent` sous OpenCode | Commune : elle vaut pour les deux outils | **Retenue** (2026-11-07) |
| D7 | Langage du rendu | sh limité à la concaténation et aux variables ; Node.js au besoin (4.5) | **Retenue** (2026-11-07) |
| — | Neutraliser d'abord, assembler ensuite (4.1) | — | **Retenue** (2026-11-07) |
| D8 | `f3 state` aussi sous OpenCode (4.6) : une injection par commande au lieu de 29, avec le contrôle des arguments | Le corps des commandes devient commun, et le contrôle devient un mécanisme sous les deux outils. Conséquence : sous OpenCode, `f3` doit être dans le `PATH` (`~/.local/bin`), comme sous Claude Code | **Retenue** (2026-11-07) |
| D9 | Interface de l'installateur | Sans argument, `install.sh` demande quel outil installer (Claude Code, OpenCode, les deux) ; l'argument `claude\|opencode\|all` reste possible pour les scripts ; `--remove` retire tout ce que le dépôt a créé ; `--render <dossier>` pour la comparaison (4.9) | **Retenue** (2026-11-07) : question interactive |
| D10 | Références de non-régression (4.9) | Tags `ref/opencode` sur `a33b9d3` et `ref/claude-code` sur `ef8c84a` : les comparaisons restent possibles même si les branches bougent | **Retenue** (2026-11-07) |
| D11 | Sort des branches à la fin du chantier | `feat/multi-harness` est fusionnée dans `main`, qui devient la seule version ; `feat/claude-code` n'est plus modifiée et ne sert que de référence (tag de D10) | **Retenue** (2026-11-07) |
| D12 | Projets déjà cadrés avec une seule version (OpenCode : `opencode.json` ; Claude Code : `CLAUDE.md`, `.mcp.json`, par exemple `poc/agentic-f3-lfdf`) | Pas de commande de migration à part : `f3 init` en mode mise à jour, avec un thème « outils » proposé d'office quand `f3 state init` détecte qu'il manque les fichiers d'un outil installé (4.10) | **Retenue** (2026-11-07) |
| D13 | Arguments substitués dans le shell des injections (constat de V-O7, section 6) | Dans le chantier : le lanceur n'accepte que des identifiants (`^[a-z0-9-]+$`) et transmet le texte libre par `F3_LAUNCH` ; une commande `/f3-…` tapée directement dans une session OpenCode reste exposée, ce que le GUIDE documente (15.4) | **Retenue** (2026-11-07). **Pas de correction de `main` pour le moment** : la faille reste ouverte sur `main` jusqu'à la fusion du chantier (D11) |

## 8. Étapes proposées

Une étape à la fois. Chaque étape se termine par un diff relu, et le commit se fait à votre demande.

| # | Étape | Critère de fin |
|---|---|---|
| 1 | Vérifications V-O1 à V-O7 | **Fait** (2026-11-07) : section 6 |
| 2 | Reprise de `cli/` depuis `ref/claude-code`, telle quelle, dans un commit séparé (R16). Puis rendu (`f3 render`, appelé par `install.sh --render`, bascule atomique de 4.4) et comparaison avec les deux références, **avant** de déplacer quoi que ce soit : le rendu de `main` doit être identique à `main` | Commit de reprise avec `node --test` vert ; `diff -r` vide pour OpenCode ; diff attendu de Claude Code écrit (R13) |
| 3 | Neutraliser : `f3 <étape>`, chemin du script, `f3 state` pour OpenCode, section des sous-agents | Fichiers communs ; chaque écart voulu est écrit dans le diff attendu **avant** le changement qui le produit ; le test de comparaison est vert (R13) |
| 4 | Assembler : frontmatter, fragments, variables, `tools/<outil>/` | Diff réel des deux rendus avec les deux références identique au diff attendu de chaque outil (R13) |
| 5 | Commande `f3` multi-outil (lanceur, `state`), tests | `node --test` vert ; `f3 propose` ouvre le bon outil |
| 6 | `/f3-init` et `f3-standards` pour les fichiers de projet des deux outils | Projet d'exemple initialisé pour les deux |
| 7 | Documentation : README, GUIDE (encadrés par outil), drift log | Relue |
| 8 | Déroulé complet sous chaque outil, sur un projet d'exemple | Un change de `f3 propose` à `f3 archive` sous chaque outil |

## 9. Risques

| # | Risque | Parade |
|---|---|---|
| R1 | Une modification du dépôt n'est pas active faute de réinstallation | Rendu minimal ; liens vers `build/` ; le lanceur et `f3 state` refont le rendu à chaque appel (D4). Pour une commande tapée dans une session OpenCode, les skills sont à jour, mais l'agent et la commande déjà chargés peuvent être périmés : `f3 state` le signale en une ligne si le rendu a changé un fichier |
| R2 | Le rendu grossit jusqu'à devenir un programme difficile à maintenir | Rendu en Node.js (`f3 render`, D4 et D7), testé avec `node --test` ; un fragment par outil plutôt qu'une condition |
| R3 | Une variable non substituée atteint un agent | `install.sh` échoue s'il reste `{{` dans `build/` |
| R4 | Une évolution d'un outil casse son rendu sans bruit | Versions vérifiées notées dans le README ; comparaison avec la référence rejouée après chaque mise à jour |
| R5 | Les garanties diffèrent entre outils sans que l'utilisateur le sache | Section 12 du GUIDE par outil (4.7) |
| R6 | Un utilisateur OpenCode lance une étape depuis une session ouverte à la main ou avec le service géré, sans `f3` : le prompt libre n'arrive pas, et l'argument tapé passe par le shell sans contrôle (D13) | Le GUIDE recommande `f3 <étape>`. `f3 state` détecte l'absence de `F3_LAUNCH` : il contrôle lui-même l'identifiant reçu (`^[a-z0-9-]+$`) et le refuse sinon, et ajoute une ligne qui recommande `f3 <étape>`. Taper `/f3-…` reste possible (D1). L'injection dans la ligne shell elle-même reste ouverte (D13) |
| R7 | La faille de `main` (arguments sans guillemets dans les injections OpenCode) reste ouverte jusqu'à la fusion | Décision du 2026-11-07 (D13) ; à rappeler si la fusion tarde |
| R8 | Le rendu reste périmé sans que rien ne le signale : une source supprimée ou renommée ne rend aucune source « plus récente », et un `git checkout` fausse les dates | Le rendu est refait à chaque lancement, sans comparaison de dates (D4 révisée) |
| R9 | Une session ouverte dans un autre terminal lit un rendu à moitié écrit, ou ne trouve plus `build/<outil>/` pendant son remplacement (`rename()` échoue sur un dossier non vide ; l'enchaînement ancien → `.old`, nouveau → à la place laisse un instant sans dossier) | Rendu dans un dossier neuf `build/<outil>.<id>/`, puis bascule atomique du lien `build/<outil>` (4.4) |
| R10 | Deux `f3` lancés en même temps rendent en parallèle et mélangent leurs fichiers | Même parade que R9 : chaque rendu a son propre dossier, le dernier lien posé gagne, aucun verrou |
| R11 | `build/` disparaît (`git clean -fdX`, nouveau clone) : tous les liens d'installation sont morts et l'outil démarre sans agents ni commandes f3, sans message d'erreur | Le prochain `f3` reconstruit `build/` (D4) ; le GUIDE (15.3) traite le symptôme « agent ou commande inconnus » pour une session OpenCode ouverte à la main |
| R12 | Sous OpenCode, `f3` absent du `PATH` : l'injection répond « command not found » sans arrêter la commande (V-O4), et l'agent continue sans état de lancement ni contrôle des arguments | `install.sh` vérifie que `~/.local/bin` est dans le `PATH` et le dit sinon ; la ligne commune de chaque commande devient « If the launch state is missing, empty or reports an error, show it and stop » |
| R13 | La liste des écarts voulus grossit pendant les étapes 3 et 4, et une régression s'y cache à la relecture | Un diff attendu versionné par outil (par exemple `tests/ref/<outil>.diff`) ; chaque écart voulu y est écrit avant le changement qui le produit ; un test compare le diff réel au diff attendu, et toute différence non prévue le fait échouer |
| R14 | Dans un projet à équipe mixte, `opencode.json` et `.mcp.json` (deux traductions de la section Stack, D2) divergent après une modification à la main | `f3 state` compare les noms des serveurs MCP des deux fichiers et signale l'écart en une ligne, sans bloquer ; `f3 init` (thème « outils ») réaligne |
| R15 | V-O6 n'est pas vérifiée côté Claude Code (pas de HOME virtuel avec identifiants) | Vérifiée au déroulé complet (étape 8), avec les deux installations réelles ; risque faible, la documentation de Claude Code dit qu'il ne lit pas `~/.config/opencode/` |
| R16 | La commande `f3` de `feat/claude-code` est écrite pour Claude Code seul (`spawnSync('claude')`, garde) ; la reprendre en même temps qu'on l'adapte rend ses régressions invisibles | Reprise de `cli/` depuis `ref/claude-code`, telle quelle, dans un commit séparé avec ses 112 tests verts, avant toute modification (étape 2) ; pas de fusion de `feat/claude-code`, qui brouillerait la comparaison avec `ref/opencode` |

# Référentiel de bonnes pratiques importé à l'init : document de réflexion

Statut : décisions de conception prises (§2) ; plan d'action au §7. Branche : `docs/practices-catalog`.

## 1. Le besoin

Aujourd'hui, `f3 init` produit un `AGENTS.md` en deux parties :

- une **partie invariante**, copiée telle quelle depuis `modules/openspec/skills/f3-standards/references/agents-md.md`, identique dans tous les projets (architecture hexagonale, bounded contexts, shared kernel, nommage, Git) ;
- une **section Stack**, écrite par l'architecte à partir de l'entretien et d'une recherche web, avec huit sous-sections fixes.

Entre les deux, il n'y a rien : toute la connaissance « comment bien faire avec cette stack et pour ce type de projet » (découpage d'un front Angular ou React, gestion d'état, accessibilité, sécurité d'une API exposée, observabilité, migrations de base, contrats entre services, etc.) est soit réinventée par l'architecte à chaque projet, soit absente. Les agents retombent alors sur leurs habitudes générales, ce que le drift log montre à plusieurs reprises (drifts 14, 21, 22).

L'objectif : disposer d'un **référentiel** versionné dans le toolkit, dans lequel l'agent puise pendant `f3 init`, en fonction du type de projet et de la stack retenue, pour :

1. écrire dans `AGENTS.md` les règles attendues (courtes, toujours chargées) ;
2. importer dans le projet les skills de savoir-faire (longues, chargées à la demande) ;
3. pré-remplir la section Stack et les décisions de `arch/decisions.md` à partir de recettes éprouvées ;
4. garder la trace de ce qui a été importé, pour pouvoir le mettre à jour.

## 2. Décisions prises

| # | Décision | Raison |
|---|---|---|
| D1 | **Un projet f3 = un dépôt indépendant**, avec son `openspec/`, sa commande de vérification et ses PR. Tout lien avec un autre projet passe par un paquet versionné, installé par le gestionnaire de paquets. | Chaque projet doit être au maximum indépendant. |
| D2 | **Un autre projet est « l'extérieur »**, comme une API tierce : le projet consommateur déclare un port, un adaptateur l'implémente avec le paquet client publié par l'autre projet. L'orchestration (règle 7) reste interne au projet. | Conséquence de D1, sans changer la partie invariante. |
| D3 | **Pas de shared kernel entre projets.** Chaque projet a ses propres types ; l'adaptateur traduit le type du contrat vers le type du domaine. | La règle 1 interdit au core toute dépendance externe ; même mécanisme que la copie entre bounded contexts. |
| D4 | **La partie invariante reste obligatoire, identique dans tous les projets, et n'est jamais réécrite pour un archétype.** | Philosophie initiale : un seul texte de référence, sans exception. |
| D5 | **Règle d'admission d'un archétype** : il n'entre au catalogue que s'il applique la partie invariante sans dérogation ; son entrée explique comment (par exemple « un service est une Application »). | Conséquence de D4. |
| D6 | **Archétypes de la V1** : `web-app`, `desktop-app`, `cli-tool`, `service`, `library`, `ui-library` (bibliothèque de composants d'interface avec playground). | Tous les types de projet attendus, ramenés à D1–D5 (§3.6). `ui-library` est séparé de `library` : sans domaine ni use case, il lit l'invariant autrement (D21). |
| D7 | **« Monorepo » n'est pas un archétype** : c'est l'organisation interne d'un projet, choisie par la recette. L'archétype d'une interface web et de son API s'appelle donc `web-app`, et non `monorepo-web-api`. | Les archétypes décrivent un type de système. Un monorepo ne relie pas des produits (D1). |
| D8 | **Pas de question d'objectif du projet** (prototype, outil interne…) : l'archétype suffit à filtrer. | Garder l'entretien court. |
| D9 | **Les recettes sont indicatives** : point de départ adaptable par l'architecte ; la recherche web (version, maintenance, licence) reste obligatoire, la recette dit quoi vérifier. | Une recette vieillit ; règle actuelle de l'architecte. |
| D10 | **Granularité** : une entrée `rules` est indépendante de la techno ; sa déclinaison par techno va dans une skill liée par `pairs-with`. | Pas de duplication du principe entre entrées. |
| D11 | **Budget de taille** : un plafond par entrée `rules` (`size-budget`) et un plafond global de la section Adopted practices. Le plafond par entrée est vérifié par les tests du toolkit ; le plafond global par `f3 practices select` avant l'écriture (refus), puis par `f3 state init` en mode mise à jour (avertissement). | AGENTS.md est chargé à chaque session (drift 5). |
| D12 | **Pas de référentiel d'équipe ou d'entreprise en surcharge en V1.** Les identifiants des entrées restent uniques pour le permettre plus tard. | Simplicité. |
| D13 | **Les skills de pratique sont copiées dans le projet, dans `.claude/skills/` seulement, avec un nom préfixé `practice-`.** | Seul dossier projet lu par les deux outils ; préfixe pour qu'aucune skill globale ne les masque (§4.5). |
| D14 | **La règle 14 reste générale et inchangée ; le mécanisme d'e2e dépend du projet.** C'est la sous-section End-to-end tests de la section Stack qui dit comment le produit est lancé ou exécuté en mode test (par exemple, pour une bibliothèque, un harnais qui exécute le paquet construit). L'archétype et sa recette proposent ce mécanisme ; aucune phrase n'est ajoutée à la partie invariante. | Garder la philosophie actuelle (D4) ; la section Stack existe précisément pour ce qui dépend de la techno et du projet. |
| D15 | **Pas de test des parcours qui traversent plusieurs services en V1.** Chaque service est testé seul, avec des doubles de ses voisins ; la pratique `service-contracts` exige contrat versionné, compatibilité ascendante et tests de contrat côté fournisseur. L'intégration réelle relève du déploiement. | D1 : chaque projet est indépendant. |
| D16 | **Pas de mécanisme de remontée d'une règle de projet vers le référentiel en V1** : le référentiel évolue par des PR sur le toolkit. | Simplicité. |
| D17 | **Trace : le marqueur dans AGENTS.md** (`<!-- f3 practices: id@version, … -->`) **et un en-tête `source: f3 practices <id>@<version>` dans chaque skill importée.** Pas de fichier de verrouillage. | Conforme aux marqueurs existants ; pas de nouveau fichier. |
| D18 | **Le référentiel vit dans un dossier racine `practices/`** du toolkit, lié par `install.sh` vers `~/.local/share/f3/practices/`. | Ce n'est ni un agent, ni une commande, ni une skill du workflow : c'est un catalogue de contenu, avec son propre cycle de vie. |
| D19 | **Les règles d'une pratique sont numérotées avec son code** (`FA-1`, `FA-2`…), déclaré dans son en-tête (`code`) et unique dans le référentiel. Un numéro retiré par une nouvelle version n'est jamais réattribué. Les règles spécifiques au projet gardent la numérotation 15, 16… après l'invariant. | Ajouter, retirer ou mettre à jour une pratique ne renumérote aucune autre règle : les renvois de `arch/decisions.md`, des design.md et du BACKLOG restent valides. |
| D20 | **Une commande CLI dédiée, `f3 practices`, fait les opérations déterministes de la phase Practices**, appelée par l'architecte en cours d'init : `select` filtre le catalogue sur `applies-when` à partir de l'archétype et des faits passés en options, résout `requires` et `conflicts`, vérifie le budget global ; `apply` copie à l'identique les règles dans AGENTS.md et les skills dans `.claude/skills/`, et écrit le marqueur. `f3 state init` garde le catalogue (pour la phase Type de projet) et la détection des mises à jour. Le vocabulaire des critères `applies-when` est fermé : chaque critère correspond à une option de `select`. | `state init` tourne avant l'entretien et ne connaît pas ses réponses ; une copie « telle quelle » faite par un LLM n'est pas garantie (drift 32 : un script se justifie quand le déterminisme l'exige). |
| D21 | **Lecture de l'invariant par une bibliothèque**, écrite dans le champ `invariant` de l'entrée `library` : le paquet construit, installé comme le ferait un consommateur, est l'application lancée de la règle 14, et le harnais e2e n'en importe que l'API publique, jamais un module du dépôt ; chaque fonction ou classe de l'API publique est un entry point (règle 10) ; la composition root (règle 11) est la fabrique publique du paquet, qui reçoit les adaptateurs que seul le consommateur peut fournir et instancie les siens. | Tenir D5 sans dérogation et sans toucher à la règle 14 (D4, D14). |
| D22 | **L'archétype et la recette sont des points de départ, cités sans suivi.** A-001 et A-002 citent leur `id@version`, et le marqueur d'AGENTS.md les liste aussi (`archetype:web-app@1.0.0, recipe:ts-fastify-htmx@1.0.0`). En mode mise à jour, `f3 state init` signale seulement qu'une version plus récente existe, à titre d'information, sans diff ni proposition de mise à jour. Seules les `rules` et les skills sont mises à jour par le thème Practices. | Une recette est adaptée au projet (D9) et ne peut pas être comparée à sa source ; l'archétype ne sert qu'à l'init. |
| D23 | **Toutes les entrées du référentiel sont écrites en anglais** (archétypes, recettes, règles, skills). | Elles sont copiées telles quelles dans AGENTS.md et dans `.claude/skills/`, comme la partie invariante et les skills du toolkit, qui sont en anglais ; la langue de prose du projet ne concerne que les artefacts OpenSpec. |
| D24 | **Une skill de pratique est chargée par le mécanisme natif des deux outils** : sa `description` dit quand la charger (« Load before writing an Angular component »). Le developer, l'ux et le tester reçoivent une consigne générale : charger les skills `practice-*` du projet dont la description correspond à la tâche. Le champ `loaded-by` d'une skill documente les agents concernés ; il ne pilote rien. | Aucune ligne de plus dans AGENTS.md (drift 5), aucune dépendance à l'architecte à chaque change. |
| D25 | **Une entrée peut porter `status: draft`** : `f3 state init` et `f3 practices select` la listent comme non disponible, et l'architecte ne la propose pas. Une entrée passe en `stable` quand le workflow la prend en charge. | `service`, `library` et `ui-library` entrent au catalogue à l'étape 1, mais leur e2e n'est pris en charge qu'à l'étape 4 (§7). |
| D26 | **Chaque clé de `workflow-impact` nomme la sous-section de la section Stack qu'elle alimente** (`e2e` → End-to-end tests, `ui` → User interface…) ; l'architecte l'y écrit, adaptée au projet, pendant la phase Stack. | L'archétype n'est lu qu'à l'init ; la section Stack est chargée à chaque session, et c'est déjà elle qui porte le mécanisme d'e2e (D14). |
| D27 | **L'empreinte du texte importé est écrite avec sa version** : `source: f3 practices <id>@<version> sha256:<empreinte>` dans chaque skill importée, et `id@version#<empreinte courte>` pour chaque entrée `rules` du marqueur. `f3 state init` recalcule l'empreinte du texte du projet : si elle diffère, le texte a été modifié à la main. | Le référentiel ne garde que la version courante d'une entrée : après une montée de version, la comparaison du §3.5 n'a plus de texte d'origine. L'empreinte suffit, sans fichier de verrouillage (D17). |

## 3. Structure du référentiel

### 3.1 Emplacement

Un dossier racine `practices/` (D18). `install.sh` le lie vers `~/.local/share/f3/practices/`, comme les scripts et les schémas, et `f3 state init` le lit.

### 3.2 Types d'entrées

```
practices/
├── catalog.md                  index lisible : une ligne par entrée, ses critères, sa cible
├── archetypes/                 types de projet : point d'entrée de la sélection (§3.6)
│   ├── web-app/
│   ├── desktop-app/
│   ├── cli-tool/
│   ├── service/
│   ├── library/
│   └── ui-library/
├── recipes/                    recettes de stack : pré-remplissage de la section Stack
│   ├── ts-fastify-htmx/
│   ├── ts-electron-angular/
│   └── python-uv-fastapi/
├── rules/                      blocs de règles courtes à écrire dans AGENTS.md
│   ├── frontend-architecture/
│   ├── api-security/
│   ├── service-contracts/
│   ├── accessibility/
│   └── observability/
└── skills/                     savoir-faire chargé à la demande, importé dans le projet
    ├── practice-angular/
    ├── practice-react/
    ├── practice-sql-migrations/
    ├── practice-openapi/
    └── practice-owasp-api/
```

La partie invariante n'est **pas** une entrée du référentiel (D4) : elle reste dans `f3-standards`.

Quatre types, chacun avec une cible distincte, ce qui préserve « une information à un seul endroit » :

| Type | Ce qu'il contient | Où il atterrit dans le projet | Chargé quand |
|---|---|---|---|
| **archetype** | un type de projet : ce qui le caractérise, comment il applique la partie invariante, les questions qu'il ajoute à l'entretien, et des renvois vers les recettes, règles et skills qui lui conviennent (§3.6) | une entrée `arch/decisions.md` | pendant f3 init seulement |
| **recipe** | une combinaison de stack éprouvée : organisation du dépôt (monorepo ou non, D7), arborescence des modules, outil d'enforcement, commande de vérification, runner e2e, serveur MCP d'observation | section Stack d'AGENTS.md + une entrée `arch/decisions.md` | toujours (via AGENTS.md) |
| **rules** | 3 à 10 règles numérotées, chacune avec sa raison et un exemple, au format de la partie invariante, indépendantes de la techno (D10) | section Adopted practices d'AGENTS.md (§3.4) | toujours |
| **skill** | savoir-faire long, propre à une techno : patterns, anti-patterns, exemples de code, checklists ; sa `description` dit quand la charger, et `loaded-by` documente les agents concernés (D24) | `.claude/skills/practice-<nom>/`, lu par les deux outils (D13) | à la demande, par l'agent dont la tâche correspond à la description (D24) |

### 3.3 Métadonnées d'une entrée

Chaque entrée porte un en-tête qui permet un premier filtrage mécanique par `f3 practices select` (D20), avant le jugement de l'architecte :

```yaml
---
id: frontend-architecture
kind: rules                      # archetype | recipe | rules | skill
code: FA                         # rules seulement : préfixe des numéros de règle, unique (D19)
version: 1.2.0
status: stable                   # stable | draft (D25)
summary: Splitting a user interface into pages, view state and presentation components.
applies-when:
  archetypes: [web-app, desktop-app]
  has-ui: true
  languages: [typescript]
requires: []                     # entrées dont elle dépend
conflicts: []
pairs-with: [practice-angular, practice-react]   # skills qui la détaillent (D10)
size-budget: 60                  # lignes max écrites dans AGENTS.md (D11)
---
```

Les critères `applies-when` s'appuient sur l'archétype choisi et sur des réponses que l'entretien de `f3 init` produit déjà (thèmes Platform, Security, Design, Stack). Leur vocabulaire est fermé et défini par le format du référentiel : chaque critère est une option de `f3 practices select` (D20), dont l'architecte tire la valeur des réponses validées. Un critère absent d'une entrée ne filtre pas.

### 3.4 Où écrire les règles importées dans AGENTS.md

Une nouvelle section entre la partie invariante et la section Stack :

```markdown
## Adopted practices

<!-- f3 practices: archetype:web-app@1.0.0, recipe:ts-fastify-htmx@1.0.0, frontend-architecture@1.2.0, api-security@1.0.1 -->

### Frontend architecture (FA)

FA-1. **...** Raison : ... Exemple : ...
FA-2. **...**
```

- Chaque règle porte le code de sa pratique et son numéro dans celle-ci (D19) ; les règles spécifiques au projet restent numérotées 15, 16… après l'invariant.
- Le commentaire liste les entrées et versions importées : c'est ce que `f3 state init` lit pour détecter une mise à jour disponible.
- Le contenu est recopié tel quel depuis le référentiel, comme la partie invariante aujourd'hui : l'architecte ne le réécrit pas, il choisit. Toute adaptation au projet va dans « Project-specific rules ».
- Règle de classement d'une règle, étendue : principe du style → partie invariante ; pratique du référentiel → Adopted practices ; technologie → Stack ; produit seul → règle spécifique.

### 3.5 Trace de ce qui est importé

Le marqueur dans AGENTS.md (ci-dessus) et un en-tête `source: f3 practices <id>@<version>` dans chaque skill importée (D17). Pour savoir si une skill importée ou une section de pratique a été modifiée à la main, `f3 state init` recalcule l'empreinte de son texte et la compare à celle écrite à l'import (D27).

Une entrée `arch/decisions.md` par choix structurant (archétype, stack, pratiques adoptées et écartées avec leur raison). Celles de l'archétype et de la stack citent l'`id@version` de l'archétype et de la recette retenus (D22).

### 3.6 Les archétypes : le type de projet

Le type de projet conditionne presque tout le reste : la forme des modules, le livrable, les tests de bout en bout, et donc les pratiques pertinentes. Il devient le **premier niveau de sélection**, avant la stack. Aujourd'hui, la « forme des applications » est décidée dans la phase Stack en même temps que le langage ; l'archétype sépare ces deux décisions : d'abord *quel type de système*, ensuite *avec quelles technologies*.

Chaque archétype respecte D1 à D5 : un dépôt, la partie invariante telle quelle, et les autres projets vus comme l'extérieur.

| Archétype | Ce qui le caractérise | Comment il applique la partie invariante | Ce qu'il apporte au projet |
|---|---|---|---|
| `web-app` | une interface web et une API d'un même produit, dans un même dépôt | tel quel | recettes type `ts-fastify-htmx` ; `frontend-architecture`, `api-security` |
| `desktop-app` | application installée, souvent hors ligne, accès au système de fichiers | tel quel ; un handler IPC est un entry point | recettes type `ts-electron-angular` ; isolation des processus ; e2e avec dialogues natifs ; packaging et mises à jour |
| `cli-tool` | outil en ligne de commande | tel quel ; une commande CLI est un entry point | pas de phase design ; e2e en pilotant le binaire ; codes de sortie, sortie lisible par machine |
| `service` | un service parmi d'autres, déployé seul, qui publie un contrat et consomme ceux des autres | le service est une Application ; chaque autre service est l'extérieur : port + adaptateur sur son paquet client (D2) ; pas de type partagé (D3) | `service-contracts` (contrat versionné, compatibilité ascendante, idempotence des entry points appelés à distance, tests de contrat côté fournisseur) ; observabilité ; e2e du service seul avec des doubles des voisins tirés de leurs contrats publiés |
| `library` | paquet publié, consommé par d'autres projets : le mécanisme de liaison de D1 ; il porte un domaine (SDK, client d'API, moteur de calcul) | D21 : le paquet construit est l'application lancée ; l'API publique est l'ensemble des entry points ; la fabrique publique est la composition root ; la section Stack dit comment l'e2e l'exécute (D14), par exemple un harnais dans `tests/e2e/` qui installe le paquet construit et n'appelle que son API publique | API publique et semver ; documentation des contrats |
| `ui-library` | bibliothèque de composants d'interface publiée, sans règle métier | sans bounded context ni use case : les règles 1 à 8 et 12 n'ont pas d'objet tant qu'aucune règle métier n'apparaît (elle signalerait un autre archétype) ; le playground (par exemple Storybook) est l'application lancée de la règle 14, et ne contient aucune règle métier (règle 9) *(lecture à valider en rédigeant l'entrée)* | playground pilotable par le tester, chaque story étant une vue de `ux/views.md` ; API des composants et semver ; accessibilité ; tokens du design |

Plus tard : `mobile-app`, `data-pipeline`, `static-site`, `plugin`.

Contenu d'une entrée `archetype` (chaque renvoi vers une recette, une pratique ou une skill doit désigner une entrée existante : vérifié par les tests du toolkit) :

```yaml
---
id: service
kind: archetype
version: 1.0.0
status: draft                    # stable à l'étape 4 (D25)
summary: A service deployed on its own, which publishes its contract and consumes those of other services through their packages.
invariant: >                     # comment il applique la partie invariante, sans dérogation (D5)
  The service is an Application. Every other service is an external system:
  a port of the project, implemented by an adapter that uses the published client package.
interview:                       # questions ajoutées à l'entretien, au plus 3
  - Which services does this service call, and in what form do they publish their contract?
  - Synchronous communication, asynchronous, or both?
  - In what form does this service publish its own contract?
recipes: [python-uv-fastapi]
practices: [service-contracts, observability, api-security]
skills: [practice-openapi, practice-owasp-api]
workflow-impact:                 # sous-section de la Stack alimentée par chaque clé (D26)
  e2e: the service is launched alone; its neighbours are doubles generated from their published contracts
  ui: no user interface unless the service exposes one
---
```

Plus le corps de l'entrée : quand choisir cet archétype, quand ne pas le choisir (par exemple « un seul produit, une seule équipe, un seul déploiement : préférer `web-app` avec des bounded contexts »), et les pièges connus. L'architecte s'en sert pour argumenter sa recommandation.

## 4. Déroulé dans `f3 init`

### 4.1 Mode création

1. **Entretien** : inchangé.
2. **Nouvelle phase Type de projet**, juste avant la Stack, une fois les thèmes produit, plateforme, volumétrie et sécurité validés :
   - `f3 state init` fournit la liste des archétypes (id, résumé, quand le choisir) ;
   - l'architecte recommande un archétype, avec sa raison tirée des réponses, et dit lesquels il écarte et pourquoi ;
   - l'utilisateur choisit ; un projet hors catalogue reste possible (« aucun archétype » : la suite se déroule comme aujourd'hui, et `f3 practices select` part de tout le catalogue), à condition de respecter la partie invariante ;
   - si le produit décrit relève de plusieurs archétypes (par exemple trois services), l'architecte le dit : c'est plusieurs projets f3 (D1), et il propose de cadrer celui-ci seulement ;
   - les questions `interview` de l'archétype sont posées ;
   - la décision est écrite tout de suite dans `arch/decisions.md` (A-001) ; la décision de stack devient A-002.
3. **Phase Stack**, enrichie et restreinte par l'archétype :
   - *Contraintes* : inchangé.
   - *Recettes candidates* : celles de l'archétype d'abord, puis les autres recettes compatibles. L'architecte les présente parmi ses deux ou trois options, à côté d'éventuelles combinaisons hors référentiel.
   - *Recherche* : toujours obligatoire, y compris pour une recette (D9).
   - *Décision* : A-002.
   - *Section Stack* : si une recette est choisie, ses sous-sections servent de base, adaptées et validées.
4. **Nouvelle phase Practices**, après la Stack (car elle en dépend) :
   - l'architecte lance `f3 practices select` avec l'archétype et les faits tirés des réponses validées ; la commande renvoie les entrées de l'archétype puis les autres entrées compatibles, avec les dépendances et les conflits ;
   - l'architecte propose une sélection, avec pour chaque entrée une ligne « pourquoi pour ce projet » ; il signale celles qu'il écarte ;
   - l'utilisateur valide, retire, ajoute ;
   - `f3 practices select` est relancée sur la sélection validée : elle refuse une sélection qui laisse un conflit (`conflicts`), une dépendance manquante (`requires`) ou un dépassement du budget global (D11).
5. **Résumé et écriture** : le résumé inclut l'archétype et les pratiques retenues ; l'écriture lance `f3 practices apply`, qui ajoute la section Adopted practices avec son marqueur et copie les skills dans `.claude/skills/` (D20) ; l'architecte écrit les entrées de `arch/decisions.md`.

### 4.2 Mode adoption

L'archétype n'est pas choisi mais **reconnu** à partir du code (applications, livrables, dépendances vers d'autres projets), puis confirmé par l'utilisateur, comme la stack aujourd'hui. Un dépôt qui contient en réalité plusieurs produits liés autrement que par des paquets est signalé comme écart à D1, avec une entrée de `BACKLOG.md`.

Le classement existant des règles (« Existing code rules ») s'étend : chaque règle existante est comparée au référentiel. Une règle déjà portée par une pratique est remplacée par l'import de cette pratique ; un écart entre le code et une pratique adoptée devient une entrée de `BACKLOG.md`, comme aujourd'hui pour les écarts avec la partie invariante.

### 4.3 Mode mise à jour : nouveau thème Practices

- `f3 state init` compare les versions du marqueur avec celles du référentiel et signale les mises à jour des `rules` et des skills, les entrées retirées, les nouvelles entrées applicables, et le dépassement du budget global. Pour l'archétype et la recette, il signale seulement qu'une version plus récente existe, à titre d'information (D22).
- Le thème Practices propose : mettre à jour (avec le diff), ajouter, retirer. Rien n'est fait sans validation.
- Une skill importée modifiée localement n'est jamais écrasée sans accord.

### 4.4 Copie dans le projet plutôt qu'activation globale (D13)

| | Copie dans `.claude/skills/` | Skills globales activées par projet |
|---|---|---|
| Versionnée avec le projet, visible en revue | oui | non |
| Toute l'équipe a la même version | oui | dépend de l'install de chacun |
| Mise à jour | via le thème Practices | automatique (risque de dérive silencieuse) |
| Projet indépendant du toolkit installé (D1) | oui | non |
| Pollution des sessions hors projet | aucune | les skills apparaissent dans tous les projets |

### 4.5 Dossiers de skills lus par chaque outil (vérifié le 2026-11-16)

| Dossier | Claude Code 2.1.319 | OpenCode 2.2.5 |
|---|---|---|
| `.claude/skills/` (projet) | oui | oui (compatibilité) |
| `.agents/skills/` (projet) | non documenté | oui (compatibilité) |
| `.opencode/skills/` (projet) | non | oui |
| `~/.claude/skills/` (global) | oui | oui (compatibilité) |
| `~/.agents/skills/` (global) | non documenté | oui |
| `~/.config/opencode/skills/` (global) | non | oui |

Sources : [documentation OpenCode, Skills](https://opencode.ai/docs/skills/), [documentation Claude Code, Skills](https://code.claude.com/docs/en/skills). Vérification empirique pour OpenCode : un projet jetable contenant une skill sonde dans chacun des trois dossiers projet ; `opencode run` liste les trois.

Précédence en cas de même nom :

- **OpenCode** (du plus faible au plus fort) : skills intégrées, `.claude/skills` (global puis projet), `.agents/skills`, `~/.config/opencode/skills`, `.opencode/skills` du projet, entrées `skills` de `opencode.json`. L'identifiant vient du chemin du dossier, pas du `name` du frontmatter.
- **Claude Code** : entreprise, puis **personnel (`~/.claude/skills`) avant projet**. Une skill globale masque donc une skill de projet du même nom.

Conséquences :

1. **Un seul dossier de destination : `.claude/skills/`.** C'est le seul dossier projet lu par les deux outils. `.agents/skills/` aurait été le choix neutre, mais Claude Code ne le documente pas.
2. **Le préfixe `practice-`** évite qu'une skill globale masque la copie du projet. `install.sh` vérifie qu'aucune skill du toolkit ne porte ce préfixe.
3. **Effet de bord sur l'existant, hors périmètre** : quand le toolkit est installé pour les deux outils, OpenCode voit chaque skill f3 deux fois (`~/.claude/skills` et `~/.config/opencode/skills`). Les deux sont des liens vers le même fichier : sans conséquence aujourd'hui, mais `install.sh` pourrait n'installer les skills que dans `~/.claude/skills`. À noter à part.

Vérifications de l'étape 1 (2026-11-19, Claude Code 2.1.328, OpenCode 2.2.5 dans le HOME jetable du banc d'essai, projet jetable avec une skill sonde `.claude/skills/practice-probe/`) :

- **V-P1** : une clé inconnue (`source: f3 practices practice-probe@1.0.0 sha256:…`) dans le frontmatter n'empêche ni l'un ni l'autre outil de lister et de charger la skill. L'en-tête de D17 et D27 reste donc dans le frontmatter.
- **V-P2** : sous l'agent developer (`claude -p --agent developer`, `opencode run --agent developer`), une question qui correspond à la `description` fait charger la skill par l'outil Skill, sans consigne particulière (D24). Le flux de Claude Code montre l'appel `Skill {"skill":"practice-probe"}`, celui d'OpenCode `Skill "practice-probe"`.
- **V-P3** : OpenCode cesse de lire les `.claude/skills` si `OPENCODE_DISABLE_CLAUDE_CODE` ou `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS` est défini (lu dans le code d'OpenCode 2.2.5 : `claude: !(… DISABLE_CLAUDE_CODE || … DISABLE_CLAUDE_CODE_SKILLS)`). Aucune n'est active par défaut. Un essai en direct n'a pas pu le confirmer : `opencode run` passe par un service déjà lancé, qui ne reçoit pas les variables de la commande. À écrire dans les limites du GUIDE (étape 9).
- **V-P4** : vérifiée par un test de la garde à l'étape 4, une fois la règle de lecture ajoutée à `tester.permission`.

## 5. Contraintes de l'existant, et comment elles sont tenues

| Principe actuel | Tenu par |
|---|---|
| Chaque information vit à un seul endroit | règle dans AGENTS.md, savoir-faire dans la skill, raison du choix dans `arch/decisions.md` (§3.2) |
| La partie invariante n'est jamais adaptée | D4, D5 : ce sont les archétypes qui s'y conforment |
| Le contexte chargé doit rester petit (drift 5) | D10, D11 : règles courtes, détail dans des skills chargées à la demande |
| Deux outils, Claude Code et OpenCode | D13 : un seul dossier lu par les deux |
| L'architecte vérifie sur le web avant de proposer une techno | D9 |
| L'utilisateur décide ; une décision validée est écrite tout de suite | chaque phase propose, l'utilisateur valide, l'entrée `arch/decisions.md` est écrite aussitôt |
| Trois modes d'init | §4.1 à 4.3 |

## 6. Modifications à prévoir dans le toolkit

| Fichier / élément | Modification |
|---|---|
| `practices/` (nouveau) | le catalogue, ses quatre types, `catalog.md` ; premières entrées : les six archétypes, une recette par stack déjà pratiquée, `frontend-architecture`, `service-contracts`, une skill front |
| `install.sh` | lier `practices/` vers `~/.local/share/f3/practices/` ; l'inclure dans `--remove` ; vérifier qu'aucune skill du toolkit ne porte le préfixe `practice-` |
| `cli/lib/toolkit.mjs` | constante `PRACTICES_DIR` ; lecture des en-têtes des entrées (le parseur de frontmatter actuel ignore les listes : à étendre, ou à remplacer par une syntaxe plate) |
| `cli/` (nouvelle commande `f3 practices`) | `select` (filtre `applies-when`, `requires`, `conflicts`, budget global) et `apply` (copie des règles et des skills, marqueur), en mode création comme en mise à jour (D20) |
| `cli/lib/state.mjs` (entrée `init`) | nouveaux blocs : « Practices catalog » (id, kind, version, résumé, critères), « Practices adopted in the project » (lu dans le marqueur), « Practices updates available », taille de la section Adopted practices au regard du budget |
| `modules/openspec/commands/f3-init.md` | phase Type de projet, qui reprend « la forme des applications » de la phase Stack actuelle ; report de `workflow-impact` dans la section Stack (D26) ; recettes dans la phase Stack ; phase Practices ; thème Practices en mode Update ; reconnaissance de l'archétype en adoption ; écriture des skills ; liste « Produces » |
| `modules/openspec/skills/f3-standards/` | `agents-md.md` : section Adopted practices, sa place, son marqueur, la numérotation par code (D19), la règle de classement étendue ; la partie invariante n'est pas modifiée (D4, D14) ; `SKILL.md` : D1 (un projet = un dépôt indépendant) et skills importées comme nouvelle catégorie de fichiers du projet ; `arch-decisions.md` : exemples d'entrées archétype et pratiques adoptées |
| `modules/openspec/agents/architect.md` | table « Writing scope » : section Adopted practices et skills `.claude/skills/practice-*`, écrites seulement par `f3 practices apply`, à f3 init ; méthode : consulter le référentiel avant de proposer une stack |
| `modules/openspec/agents/developer.md`, `tester.md`, `modules/ux/agents/ux.md` | consigne générale : charger les skills `practice-*` du projet dont la description correspond à la tâche (D24) |
| `modules/openspec/skills/e2e-practice/` | e2e d'un `service` avec des doubles des voisins (D15) ; e2e d'un produit sans interface (bibliothèque, CLI) : objets d'accès au lieu de page objects, nommés d'après l'API publique ou les commandes (D14) |
| `modules/openspec/commands/f3-design-review.md` | un des sous-agents de revue vérifie le design contre les pratiques adoptées |
| `*.permission` | autoriser l'architecte à lancer `f3 practices select` et `f3 practices apply` ; aucune écriture directe dans `.claude/skills/` (D20). `tester.permission` : autoriser la lecture de `.claude/skills/practice-*`, que sa table de lecture refuse aujourd'hui (tout est refusé sauf une liste) |
| `cli/lib/toolkit.mjs` (`RESERVED`), `cli/f3.mjs` | `practices` devient une sous-commande réservée : aucune commande ne peut s'appeler `/f3-practices` |
| `cli/test/` | fixtures d'un mini-référentiel ; validité du référentiel (renvois existants, codes uniques, `size-budget` tenu) ; tests de `f3 practices` (filtre, dépendances, conflits, budget, copie à l'identique, marqueur) et de `state init` (catalogue, détection de mise à jour) ; tests d'install |
| `GUIDE.md`, `README.md` | sections 2 (principe D1), 4, 5.1, 5.2, 8 (step 0), 14 (adoption), 16 (limites) |

## 7. Plan d'action

Une étape à la fois, sur une branche `feat/practices-catalog` créée depuis celle-ci. Chaque étape se termine par un diff relu et `node --test cli/test/*.test.mjs` vert ; le commit se fait à la demande de l'utilisateur. Une modification d'un agent ou d'une commande est écrite d'abord dans les deux diffs attendus (`tests/ref/<outil>.diff`). Un écart trouvé en cours d'étape est rapporté avec sa preuve avant correction, et tranché par l'utilisateur (numéros E1, E2…).

| # | Étape | Contenu | Critère de fin |
|---|---|---|---|
| 1 | **Vérifications** — **Fait** (2026-11-19) : §4.5 | V-P1 : Claude Code et OpenCode chargent une skill de projet dont le frontmatter porte une clé inconnue (`source:`) ; sinon, l'en-tête passe dans un commentaire du corps (D17, D27). V-P2 : une skill de `.claude/skills/` est proposée et chargée par sa `description` à un agent lancé par `f3 <étape>`, sous chaque outil (D24). V-P3 : aucune option courante d'OpenCode ne désactive la lecture de `.claude/skills/` du projet (D13). V-P4 : la garde du tester laisse lire `.claude/skills/practice-*` une fois la règle ajoutée. D27 validée par l'utilisateur (2026-11-19). | Résultat de chaque vérification écrit au §4.5, avec la version des outils et la preuve ; projets jetables seulement |
| 2 | **Format et catalogue minimal** | `practices/` avec un `README.md` du format (champs, vocabulaire fermé des critères `applies-when`, `status`, `code`, `size-budget`) et `catalog.md`. Entrées réelles, en anglais (D23) : les six archétypes (`service`, `library`, `ui-library` en `draft`, D25 ; lecture de l'invariant de `ui-library` tranchée en l'écrivant), `ts-fastify-htmx` et `ts-electron-angular`, `frontend-architecture` et `service-contracts`, `practice-angular`. `cli/lib/toolkit.mjs` : `PRACTICES_DIR`, parseur étendu aux listes (en ligne `[a, b]` et en bloc `- item`) sans changer la lecture des sources existantes, lecture et validation du catalogue (renvois existants, `id` et `code` uniques, `size-budget` tenu, `kind` et `status` connus, préfixe `practice-` des skills). `install.sh` : lien vers `~/.local/share/f3/practices/`, `--remove`, refus d'une skill du toolkit préfixée `practice-`. `f3 state init` : bloc « Practices catalog » (archétypes disponibles : id, statut, version, résumé). Aucun changement de commande ni d'agent. | Tests verts : fixtures d'un mini-référentiel (entrée valide, renvoi cassé, code en double, budget dépassé) ; le vrai `practices/` passe la validation ; `catalog.md` liste exactement les entrées (test) ; `install.sh` essayé dans un HOME jetable ; diffs attendus inchangés ; **Fait** (2026-11-19), avec l'étape 3 dans le même commit : format décrit dans `practices/README.md` ; recettes réelles tirées de `exemple-p2` et du produit du drift log ; lecteur d'en-têtes propre au référentiel (`cli/lib/practices.mjs`), le parseur des sources reste inchangé ; critères `archetypes`, `ui`, `languages`, `frameworks`, `exposure` ; budget global de 150 lignes. `node --test` vert (225 tests) |
| 3 | **Commande `f3 practices`** (D20) | `practices` dans `RESERVED`. `select --archetype <id>\|none` et une option par critère : liste ordonnée (entrées de l'archétype, puis autres compatibles), entrées `draft` marquées non disponibles ; `select … --check <ids>` refuse un conflit, une dépendance manquante, un budget global dépassé. `apply <ids>` : écrit ou remplace la section Adopted practices juste avant `## Stack`, avec le marqueur (archétype, recette, entrées, empreintes, D22, D27) et la numérotation par code (D19) ; copie chaque skill dans `.claude/skills/practice-<nom>/` avec son en-tête `source:` ; refuse d'écraser un texte modifié à la main, sauf option explicite. Sortie lisible par l'agent, codes de sortie distincts pour refus et erreur. | Tests verts : filtre par critère et sans archétype, ordre, refus, insertion dans un AGENTS.md réel (partie invariante intacte, octet pour octet), remplacement idempotent, copie à l'identique, refus d'écraser, empreintes recalculées ; **Fait** (2026-11-19) : essayé aussi sur l'AGENTS.md réel de `exemple-p2` (section insérée avant `## Stack`, second `apply` identique) |
| 4 | **f3 init en mode création** | `f3-init.md` : phase Type de projet (catalogue de `state init`, recommandation, plusieurs produits = plusieurs projets, questions `interview`, A-001), phase Stack sans « la forme des applications » (A-002), phase Practices (`select`, sélection argumentée, `select --check`), écriture par `apply`, résumé et liste « Produces ». `f3-standards` : `agents-md.md` (section Adopted practices, place, marqueur, D19, règle de classement étendue ; partie invariante inchangée), `SKILL.md` (D1, skills importées comme fichiers du projet), `arch-decisions.md` (exemples A-001 archétype, A-002 avec recette, pratiques adoptées et écartées). `architect.md` : table d'écriture (D20) et consultation du référentiel. `architect.permission`, `tester.permission` (V-P4). | Sous Claude Code puis sous OpenCode, un projet d'exemple `web-app` cadré de bout en bout, sessions conduites par Claude : A-001, A-002, section Adopted practices identique au référentiel, skill copiée, marqueur juste ; un cadrage « aucun archétype » qui se déroule comme aujourd'hui ; preuves écrites |
| 5 | **Recettes dans la phase Stack** | Recettes candidates (celles de l'archétype, puis les compatibles) parmi les deux ou trois options ; recherche web toujours faite, guidée par ce que la recette dit de vérifier (D9) ; sous-sections de la recette comme base de la section Stack ; report de `workflow-impact` dans ses sous-sections (D26) ; A-002 cite `id@version` (D22). | Un cadrage `web-app` où la recette est retenue et adaptée, et un autre où l'utilisateur en écarte une : section Stack complète, A-002 juste, recherche web visible dans la session |
| 6 | **`service`, `library`, `ui-library` dans le workflow** | `e2e-practice` : doubles des voisins tirés de leurs contrats publiés (D15) ; objets d'accès nommés d'après l'API publique ou les commandes pour un produit sans interface (D14, D21) ; playground de `ui-library`, chaque story étant une vue de `ux/views.md`. `tester.md` en conséquence. Recettes avec leur mécanisme d'e2e (par exemple `python-uv-fastapi`, une recette de bibliothèque TypeScript). `service-contracts` complétée, `practice-openapi`. Passage en `stable`. | Pour `library` et `service`, un projet d'exemple cadré puis un change mené jusqu'à `f3 acceptance` vert sous un outil ; pour `ui-library`, cadrage et acceptance d'une story ; diffs attendus à jour |
| 7 | **Adoption et mise à jour** | `state init` : blocs « Practices adopted in the project », « Practices updates available » (versions, entrées retirées, nouvelles entrées applicables, texte modifié à la main par empreinte, budget global ; information seule pour archétype et recette, D22). `f3-init.md` : archétype reconnu en adoption, écart à D1 en BACKLOG, règles existantes confrontées au référentiel ; thème Practices en mode Update (mettre à jour avec le diff, ajouter, retirer, rien sans validation). | Tests verts sur fixtures (version montée, entrée retirée, texte modifié). Sur le projet de l'étape 4 : une entrée montée de version puis mise à jour par le thème Practices ; une skill modifiée à la main non écrasée sans accord. Un projet existant non cadré adopté avec reconnaissance de son archétype |
| 8 | **Exploitation par les autres étapes** | Consigne de D24 dans `developer.md`, `tester.md`, `modules/ux/agents/ux.md` ; `f3-design-review.md` : un sous-agent vérifie le design contre les règles de la section Adopted practices. | Sur le projet d'exemple, un change où le developer charge `practice-angular` (vu dans la session) et où la design review relève un écart volontaire à une règle `FA-*` |
| 9 | **Documentation** | `README.md` ; `GUIDE.md` : sections 2 (D1), 4 (`practices/`, `f3 practices`), 5.1 et 5.2 (Adopted practices, skills importées), 8 étape 0, 14 (adoption), 16 (limites : pas de parcours multi-service, D15 ; pas de surcharge d'équipe, D12) ; drift log (raisons des décisions). Ce document est retiré une fois l'étape 10 close, comme l'analyse multi-outils. | Relecture du diff de la documentation contre le code |
| 10 | **Déroulé complet sous chaque outil** | Un change de `f3 propose` à `f3 archive` sur le projet `web-app` cadré avec ses pratiques, sous chaque outil. | Chaque étape sous son agent ; pratiques chargées là où D24 l'attend ; écarts rapportés et tranchés ; `node --test` vert |

## 8. Risques

- **Une skill non chargée** : D24 repose sur le jugement de l'agent face à la `description`. Vérifié à l'étape 1 (V-P2) et observé aux étapes 8 et 10 ; repli possible : citer la skill dans les tâches de `tasks.md`, comme les écrans (drift 18).
- **AGENTS.md qui grossit** : le budget global (D11) le borne ; son plafond est fixé à l'étape 2 et revu après l'étape 4 sur un vrai projet.
- **Des recettes qui vieillissent** : la recherche web reste obligatoire (D9) et `state init` signale une version plus récente (D22).
- **Des archétypes qui ne tiennent pas D5** : `ui-library` est le plus exposé ; sa lecture de l'invariant est tranchée à l'étape 2, et l'archétype reste en `draft` tant que l'étape 6 ne l'a pas validé.
- **Doublon des skills f3 sous OpenCode** (§4.5, point 3) : hors périmètre, à traiter séparément.

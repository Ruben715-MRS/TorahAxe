# Consignes pour Claude Code

## Git

- Ruben a donné une autorisation permanente : Claude Code peut **pousser directement sur `main`** (branche par défaut) dans ce dépôt, sans demander de confirmation à chaque fois.
- **À chaque fois** : à la fin de chaque tâche, Claude Code commite puis pousse sur `main` (en plus de la branche de travail de la session), sans attendre qu'on le lui redemande. Si `main` a avancé, il fusionne d'abord `origin/main` dans sa branche (jamais de rebase ni de force), résout les conflits, relance `node --test`, puis pousse.
- La branche de travail par défaut reste `claude/funny-volta-05kwai` ; les autres branches ne sont poussées que si Ruben le demande.
- Ne jamais forcer le push (`--force`) sur `main` et ne jamais réécrire son historique.
- Ne créer une pull request que si Ruben le demande explicitement.

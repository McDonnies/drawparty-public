# SPÉCIFICATION DES ACTIONS UTILISATEUR \- DrawParty

Vue d’ensemble des actions utilisateur pour le projet DrawParty, organisées par écrans et fonctionnalités clés\. Ce document sert de référence rapide pour l’implémentation et les tests\.

## Page d’accueil

- Choisir le mode de jeu Gartic Phone
- Choisir le mode de jeu Skribbl\.io
- Se connecter &#x2F; S’inscrire
- Ouvrir le panneau utilisateur \(si connecté\)

## Authentification

- Se connecter avec email&#x2F;mot de passe
- Se connecter avec Google \(Auth0\)
- S’inscrire avec email
- Se déconnecter

## Panneau utilisateur &#x2F; Amis

- Chercher un ami \(barre de recherche\)
- Ajouter un ami
- Supprimer un ami
- Inviter un ami à rejoindre une partie
- Accepter une invitation d’ami
- Refuser une invitation d’ami
- Aller au dashboard
- Fermer le panneau

## Dashboard

- Voir ses statistiques Skribbl\.io
- Modifier son nom d’utilisateur
- Changer son avatar
- Changer son mot de passe
- Voir le nombre de parties jouées par mode
- Voir sa position dans le leaderboard Skribbl\.io

## Lobby \(Gartic Phone &#x2F; Skribbl\.io\)

- Copier le code de la room
- Inviter des amis
- Changer le nombre de rounds
- Changer le temps par round
- Choisir les catégories de mots \(Skribbl uniquement\)
- Ajouter un bot IA \(Skribbl uniquement\)
- Expulser un joueur \(si host\)
- Démarrer la partie \(si host\)
- Envoyer un message dans le chat
- Quitter le lobby

## En jeu \- Gartic Phone

- Écrire le prompt initial
- Dessiner sur le canvas
- Écrire une description du dessin
- Soumettre son dessin
- Soumettre sa description
- Voir le statut des autres joueurs \(qui a fini\)
- Voir le rewind final \(chaînes de transformations\)
- Naviguer entre les différentes chaînes
- Partager une chaîne \(export image\)

## En jeu \- Skribbl\.io

- Choisir un mot parmi 3 options \(si drawer\)
- Dessiner le mot \(si drawer\)
- Deviner le mot \(envoyer une réponse\)
- Voir les indices progressifs
- Voir le leaderboard en temps réel
- Voir qui a deviné correctement
- Passer au round suivant

## Outils de dessin \(Canvas\)

- Sélectionner une couleur
- Changer l’épaisseur du trait
- Dessiner avec le pinceau
- Utiliser la gomme
- Annuler le dernier trait \(undo\)
- Tout effacer \(clear canvas\)

## Page résultats

- Voir le podium \(top 3\)
- Voir le leaderboard final complet
- Voir ses statistiques personnelles de la partie
- Rejouer avec les mêmes joueurs
- Créer une nouvelle partie
- Retourner à l’accueil
- Partager les résultats \(screenshot\)

## Actions système

- Voir les règles du jeu
- Signaler un bug&#x2F;problème
- Fermer des modals&#x2F;dialogs
- Voir les notifications \(toasts\)
- Se reconnecter après une déconnexion


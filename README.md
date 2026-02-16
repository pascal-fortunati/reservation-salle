# Système de Réservation de Salle - TechSpace Solutions

## Description du Projet

Application web permettant la gestion et la réservation d'une salle de réunion au sein d'une entreprise. Le système offre une interface de planning hebdomadaire interactive, des opérations CRUD complètes sur les réservations, et un système d'authentification sécurisé par JWT.

## Objectifs

- Permettre aux utilisateurs de visualiser la disponibilité de la salle sur une semaine donnée
- Gérer les réservations de créneaux horaires avec prévention des conflits
- Assurer une authentification sécurisée avec gestion de session
- Fournir une documentation API complète et accessible

## Architecture Technique

### Technologies Utilisées

**Frontend**
- React 18 avec TypeScript
- Vite (outil de build)
- TailwindCSS pour le style
- DaisyUI v5 (composants UI)
- Material-UI Icons
- Axios pour les requêtes HTTP

**Backend**
- Node.js avec Express
- TypeScript
- MySQL2 pour la base de données
- JWT pour l'authentification
- bcrypt pour le hashage des mots de passe
- XSS pour la sanitisation des entrées

**Documentation**
- OpenAPI 3.0 (Swagger)

## Prérequis

Avant de commencer l'installation, assurez-vous d'avoir les éléments suivants :

- Node.js version 18 ou supérieure
- MySQL version 8 ou supérieure
- npm ou yarn comme gestionnaire de paquets

## Installation et Configuration

### Étape 1 : Clonage du Dépôt

```bash
git clone https://github.com/votre-username/reservation-salle.git
cd reservation-salle
```

### Étape 2 : Configuration de la Base de Données

Créez la base de données et les tables nécessaires en exécutant les commandes SQL suivantes :

```sql
CREATE DATABASE IF NOT EXISTS reservation_salle 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE reservation_salle;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  prenom VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  object VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reservations_user_id 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE
);
```

Vous pouvez également utiliser le fichier `backend/shema.sql` fourni dans le projet.

### Étape 3 : Configuration du Backend

Installez les dépendances :

```bash
cd backend
npm install
```

Créez un fichier `.env` à la racine du dossier backend avec le contenu suivant :

```ini
NODE_ENV=development
PORT=4000
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=votre_secret_jwt_minimum_32_caracteres

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=votre_mot_de_passe
DB_NAME=reservation_salle
DB_PORT=3306
```

**Important :** Remplacez `JWT_SECRET` par une chaîne aléatoire de minimum 32 caractères.

Démarrez le serveur de développement :

```bash
npm run dev
```

Le serveur sera accessible à l'adresse `http://localhost:4000`

### Étape 4 : Configuration du Frontend

Installez les dépendances :

```bash
cd frontend
npm install
```

(Optionnel) Créez un fichier `.env` à la racine du dossier frontend si vous souhaitez personnaliser l'URL de l'API :

```ini
VITE_API_URL=http://localhost:4000/api
```

Par défaut, l'application utilise `http://localhost:4000/api`.

Démarrez le serveur de développement :

```bash
npm run dev
```

L'application sera accessible à l'adresse `http://localhost:5173`

## Fonctionnalités Principales

### Gestion du Planning

- Affichage hebdomadaire du planning de la salle
- Créneaux horaires : lundi au vendredi, de 8h à 19h
- Intervalles de réservation : 1 heure minimum
- Code couleur :
  - Vert : créneau disponible
  - Rouge : créneau occupé
  - Gris : créneau passé (non réservable)

### Gestion des Réservations

- Création de réservations avec objet obligatoire (255 caractères maximum)
- Modification de l'objet d'une réservation existante
- Suppression de ses propres réservations
- Prévention des conflits de réservation (code HTTP 409)
- Impossible de réserver dans le passé

### Authentification et Autorisation

- Inscription des utilisateurs avec validation des données
- Connexion sécurisée par JWT
- Session glissante de 24 heures (renouvellement automatique du token)
- Protection des routes sensibles
- Restriction : un utilisateur ne peut modifier que ses propres réservations (code HTTP 403)

## Documentation API

### Spécification OpenAPI

La spécification complète de l'API est disponible dans le fichier `backend/openapi.yaml`.

### Accès à la Documentation

- **Interface de documentation** : `http://localhost:5173/docs`
- **Redirection depuis l'API** : `http://localhost:4000/docs`
- **Fichier YAML brut** : `http://localhost:4000/openapi.yaml`
- **Endpoints JSON** : `http://localhost:4000/api/docs/routes`

## Structure des Routes

### Routes Publiques

- `/` - Redirection automatique (dashboard si authentifié, login sinon)
- `/login` - Page de connexion
- `/register` - Page d'inscription
- `/docs` - Documentation de l'API

### Routes Protégées

- `/dashboard` - Planning de réservation (nécessite authentification)
- `/profile` - Profil utilisateur (nécessite authentification)

### Routes Système

- `*` - Page 404 pour les routes non trouvées

## Sécurité

Le système implémente plusieurs mécanismes de sécurité :

- **Authentification JWT** : Tokens stockés en localStorage côté client
- **Session glissante** : Renouvellement automatique du token à chaque requête authentifiée (expiration après 24h d'inactivité)
- **Requêtes préparées** : Protection contre les injections SQL via mysql2
- **Sanitisation XSS** : Validation et nettoyage des entrées utilisateur avec la bibliothèque xss
- **Hashage sécurisé** : Mots de passe hashés avec bcrypt
- **CORS configuré** : Restriction des origines autorisées
- **HTTPS obligatoire** : En production (via reverse-proxy)

## Structure du Projet

```
reservation-salle/
├── backend/              # API REST
│   ├── src/
│   │   ├── config/      # Configuration (variables d'environnement)
│   │   ├── db/          # Connexion base de données
│   │   ├── middleware/  # Middlewares Express
│   │   ├── routes/      # Définition des routes
│   │   └── utils/       # Utilitaires
│   ├── openapi.yaml     # Spécification API
│   └── shema.sql        # Script de création de base de données
│
├── frontend/            # Application React
│   ├── src/
│   │   ├── lib/        # Bibliothèques et utilitaires
│   │   ├── state/      # Gestion d'état (Context API)
│   │   └── ui/         # Composants et pages
│   └── public/         # Assets statiques
│
└── conceptions/        # Documents de conception
    ├── maquettes/
    └── wireframe/
```

## Développement

### Scripts Disponibles

**Backend**
```bash
npm run dev      # Mode développement avec rechargement automatique
npm run build    # Compilation TypeScript
npm start        # Démarrage en production
```

**Frontend**
```bash
npm run dev      # Mode développement
npm run build    # Build de production
npm run preview  # Prévisualisation du build
```

## Auteurs

TechSpace Solutions

## Licence

Ce projet est un projet académique développé dans un cadre pédagogique.

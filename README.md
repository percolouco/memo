# Todo / Mémos avec rappels Discord

Application web de gestion de tâches avec rappels quotidiens via Discord. Chaque mémo non terminé génère une notification Discord à l'heure configurée, tous les jours, jusqu'à ce qu'il soit marqué comme fait.

## Fonctionnalités

- Créer des mémos avec titre, description et heure de rappel
- Rappel Discord quotidien à l'heure choisie tant que la tâche n'est pas faite
- Marquer comme fait / rouvrir / modifier / supprimer
- Onglet historique des tâches terminées

## Stack

- **Backend** : Python FastAPI + SQLite
- **Rappels** : APScheduler (vérifie chaque minute)
- **Notifications** : webhook Discord
- **Frontend** : HTML/CSS/JS vanilla
- **Déploiement** : Docker + Traefik

## Déploiement

```bash
cd /opt/container/memo
docker compose up -d --build
```

Accessible sur **https://todo.nas.percolouco.com**

## Configuration

Dans l'app, cliquer sur ⚙️ et coller l'URL du webhook Discord (Paramètres du canal Discord → Intégrations → Webhooks).

## Structure

```
memo/
├── app/
│   ├── main.py           # API FastAPI (routes CRUD)
│   ├── database.py       # SQLite + initialisation schema
│   ├── scheduler.py      # APScheduler — vérifie les rappels chaque minute
│   └── discord_notify.py # Envoi des notifications via webhook Discord
├── static/
│   ├── style.css
│   └── app.js
├── templates/
│   └── index.html
├── Dockerfile
└── requirements.txt
```

Les données (base SQLite) sont persistées dans `/opt/container/memo/data/`.

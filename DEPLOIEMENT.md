# 🚀 GUIDE DE DÉPLOIEMENT — ServMarket

> **Architecture en clair** : ce projet est un monorepo Next.js.
> Il n'y a PAS de dossier `/backend` séparé — le backend **vit dans `/app/api/`**.
> Le seul service séparé est le serveur **Socket.io** (`/server/socket.ts`).

---

## 📐 Architecture complète du projet

```
servmarketplace/
│
├── app/                          ← FRONTEND (pages React)
│   ├── page.tsx                  ← Page d'accueil
│   ├── search/                   ← Recherche providers
│   ├── profile/[id]/             ← Profil provider
│   ├── chat/[id]/                ← Chat temps réel
│   ├── booking/                  ← Création réservation
│   ├── payment/                  ← Paiement Stripe
│   ├── bookings/                 ← Mes réservations
│   ├── messages/                 ← Liste conversations
│   ├── account/                  ← Paramètres compte
│   └── admin/                    ← Panel admin
│
├── app/api/                      ← BACKEND (API REST serverless)
│   ├── auth/                     ← Login, register, refresh, logout
│   ├── providers/                ← Recherche & profils providers
│   ├── bookings/                 ← CRUD réservations
│   ├── messages/                 ← Chat & conversations
│   ├── payments/                 ← Stripe, PayPal, webhooks
│   ├── reviews/                  ← Avis & notes
│   ├── services/                 ← Services des providers
│   ├── calls/                    ← Token Agora pour appels
│   ├── notifications/            ← Notifications
│   ├── upload/                   ← Upload audio
│   ├── users/                    ← Profil utilisateur
│   └── admin/                    ← Gestion admin
│
├── server/
│   └── socket.ts                 ← SERVEUR SOCKET.IO (service séparé)
│
├── prisma/
│   ├── schema.prisma             ← Schéma base de données
│   └── seed.ts                   ← Données de démonstration
│
├── lib/                          ← Utilitaires partagés
├── components/                   ← Composants UI
├── hooks/                        ← Hooks React
├── services/                     ← Services (payment, email, agora)
└── types/                        ← Types TypeScript
```

---

## 🧩 Les 3 services à déployer

| Service | Rôle | Hébergement recommandé |
|---------|------|------------------------|
| **Next.js App** | Frontend + API REST | **Vercel** (gratuit) |
| **Socket.io** | Temps réel (chat, appels) | **Railway** (5$/mois) |
| **PostgreSQL** | Base de données | **Neon** (gratuit) ou Railway |

---

## ÉTAPE 1 — Base de données PostgreSQL sur Neon (GRATUIT)

### 1.1 Créer le compte et la base

1. Aller sur **https://neon.tech** → Sign Up (gratuit)
2. Créer un nouveau projet → nommer `servmarket`
3. Choisir la région la plus proche de vos utilisateurs
4. Copier la **Connection string** qui ressemble à :

```
postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

5. Garder cette URL — c'est votre `DATABASE_URL`

### 1.2 Initialiser le schéma

Sur votre machine locale :

```bash
# Cloner le projet
git clone <votre-repo> servmarket
cd servmarket

# Installer les dépendances
npm install

# Copier et remplir les variables d'environnement
cp .env.example .env
# → Mettre DATABASE_URL avec la connexion Neon

# Pousser le schéma Prisma vers Neon
npx prisma db push

# Générer le client Prisma
npx prisma generate

# (Optionnel) Insérer les données de démonstration
npx tsx prisma/seed.ts
```

**Vérifier** : aller sur https://console.neon.tech et voir les tables créées.

---

## ÉTAPE 2 — Serveur Socket.io sur Railway

Le serveur Socket.io **ne peut pas** tourner sur Vercel (serverless ne supporte pas les connexions persistantes WebSocket).

### 2.1 Créer un compte Railway

1. Aller sur **https://railway.app** → Sign Up avec GitHub
2. Nouveau projet → **"Deploy from GitHub repo"**
3. Sélectionner votre dépôt

### 2.2 Configurer le service Socket.io

Dans Railway, après avoir connecté votre repo :

**Settings → Builder** :
```text
Dockerfile Path = Dockerfile.socket
```

Si Railway détecte automatiquement le `Dockerfile` racine, il va builder toute l'app Next.js au lieu du service Socket.io.

**Settings → Start Command** :
```bash
npx tsx server/socket.ts
```

**Settings → Watch Paths** (pour le redéploiement auto) :
```
server/**
```

### 2.3 Variables d'environnement Railway

Dans l'onglet **Variables** de Railway, ajouter :

```env
JWT_ACCESS_SECRET=votre-secret-jwt-min-32-caracteres-ici
NODE_ENV=production
SOCKET_PORT=3001
NEXT_PUBLIC_APP_URL=https://votre-app.vercel.app
```

### 2.4 Récupérer l'URL du socket

Après déploiement, Railway génère une URL du type :
```
https://servmarket-socket.up.railway.app
```

**Garder cette URL** — c'est votre `NEXT_PUBLIC_SOCKET_URL`.

---

## ÉTAPE 3 — Application Next.js sur Vercel

### 3.1 Préparer le projet sur GitHub

```bash
# Sur votre machine
cd servmarket
git init
git add .
git commit -m "Initial commit — ServMarket platform"

# Créer un repo sur GitHub.com puis :
git remote add origin https://github.com/VOTRE-USER/servmarket.git
git push -u origin main
```

### 3.2 Connecter à Vercel

1. Aller sur **https://vercel.com** → Sign Up avec GitHub
2. **"Add New Project"** → Importer votre repo GitHub
3. Framework : **Next.js** (auto-détecté)
4. **Build Command** : `npx prisma generate && npm run build`
5. **Output Directory** : `.next` (par défaut)
6. Cliquer **Deploy** (le premier build échouera — normal, les variables manquent)

### 3.3 Variables d'environnement Vercel

Dans **Settings → Environment Variables**, ajouter TOUTES ces variables :

```env
# ── Base de données ─────────────────────────────────────────────
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require

# ── Authentification ─────────────────────────────────────────────
JWT_ACCESS_SECRET=un-secret-tres-long-min-32-caracteres-impossible-a-deviner
JWT_REFRESH_SECRET=un-autre-secret-tres-long-min-32-caracteres-different

# ── URLs de l'application ────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://votre-projet.vercel.app
NEXT_PUBLIC_SOCKET_URL=https://servmarket-socket.up.railway.app

# ── Stripe ───────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_...          (ou sk_test_... pour les tests)
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# ── Agora (appels vidéo/audio) ───────────────────────────────────
AGORA_APP_ID=votre-agora-app-id
AGORA_APP_CERTIFICATE=votre-agora-certificate
NEXT_PUBLIC_AGORA_APP_ID=votre-agora-app-id

# ── PayPal (optionnel) ───────────────────────────────────────────
PAYPAL_CLIENT_ID=votre-paypal-client-id
PAYPAL_CLIENT_SECRET=votre-paypal-secret
PAYPAL_MODE=sandbox

# ── Email (optionnel) ────────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre@gmail.com
SMTP_PASS=votre-app-password
```

### 3.4 Redéployer

Après avoir ajouté les variables :
- **Deployments → (dernier déploiement) → Redeploy**
- Ou faire un `git push` qui déclenche un redéploiement automatique

---

## ÉTAPE 4 — Configurer Stripe

### 4.1 Créer les clés Stripe

1. Aller sur **https://dashboard.stripe.com**
2. **Developers → API Keys**
3. Copier **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
4. Copier **Secret key** → `STRIPE_SECRET_KEY`

### 4.2 Activer Stripe Connect

1. Dashboard Stripe → **Connect → Get started**
2. Choisir **Platform or marketplace**
3. Compléter la configuration du compte plateforme

### 4.3 Configurer le webhook

1. **Developers → Webhooks → Add endpoint**
2. URL : `https://votre-projet.vercel.app/api/payments/webhook`
3. Sélectionner ces événements :
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `account.updated` (pour Stripe Connect)
4. Copier le **Signing secret** → `STRIPE_WEBHOOK_SECRET`

### 4.4 Test local des webhooks Stripe

```bash
# Installer Stripe CLI
brew install stripe/stripe-cli/stripe

# Authentifier
stripe login

# Écouter et forwarder vers le dev local
stripe listen --forward-to localhost:3000/api/payments/webhook

# Dans un autre terminal, tester un paiement
stripe trigger payment_intent.succeeded
```

---

## ÉTAPE 5 — Configurer Agora (appels vidéo/voix)

1. Aller sur **https://console.agora.io** → Sign Up (gratuit jusqu'à 10 000 min/mois)
2. Créer un projet → choisir **Secured mode (APP ID + Token)**
3. Copier **App ID** → `AGORA_APP_ID` et `NEXT_PUBLIC_AGORA_APP_ID`
4. Copier **Primary Certificate** → `AGORA_APP_CERTIFICATE`

---

## ÉTAPE 6 — Vérification finale

### Checklist post-déploiement

```
[ ] https://votre-app.vercel.app       → Page d'accueil visible
[ ] /auth/register                     → Inscription fonctionne
[ ] /auth/login                        → Connexion fonctionne
[ ] /search                            → Liste des providers
[ ] /admin/login                       → admin@servmarket.com / Admin1234!
[ ] /admin/dashboard                   → Statistiques visibles
[ ] Chat temps réel                    → Messages s'envoient instantanément
[ ] Paiement                           → Stripe checkout fonctionne
```

### Tester le chat temps réel

Ouvrir deux onglets avec deux comptes différents → envoyer un message → vérifier qu'il arrive instantanément.

Si le chat ne fonctionne pas en temps réel :
- Vérifier que `NEXT_PUBLIC_SOCKET_URL` pointe bien vers Railway
- Vérifier les logs Railway pour des erreurs JWT

---

## 🔄 Alternative à Railway : Render.com

Si Railway pose problème, utiliser **Render** (gratuit avec limitations) :

1. **https://render.com** → New Web Service
2. Connecter votre repo GitHub
3. **Start Command** : `npx tsx server/socket.ts`
4. **Environment** : Node
5. Ajouter les mêmes variables d'environnement
6. Copier l'URL générée → `NEXT_PUBLIC_SOCKET_URL`

> ⚠️ Sur Render en plan gratuit, le serveur "dort" après 15 min d'inactivité.
> Pour éviter ça, utiliser Railway ($5/mois) ou Fly.io.

---

## 🔄 Alternative complète : Tout sur Railway

Si vous préférez tout regrouper sur Railway :

```
Railway Project
├── Service 1 : Next.js App    (PORT=3000)
├── Service 2 : Socket.io      (PORT=3001)
└── Service 3 : PostgreSQL     (Railway Postgres plugin)
```

### Sur Railway pour Next.js :

**Start Command** :
```bash
npx prisma generate && npx prisma db push && npm run build && npm start
```

**Variables** : identiques à Vercel + `PORT=3000`

---

## 📂 Résumé des URLs après déploiement

| Service | URL |
|---------|-----|
| Application web | `https://votre-projet.vercel.app` |
| API REST | `https://votre-projet.vercel.app/api/...` |
| Admin panel | `https://votre-projet.vercel.app/admin` |
| Socket.io | `https://servmarket-socket.up.railway.app` |
| Webhook Stripe | `https://votre-projet.vercel.app/api/payments/webhook` |
| Base de données | Neon (interne, pas exposé publiquement) |

---

## 🐛 Problèmes fréquents

### "Module not found: @prisma/client"

```bash
# Dans Vercel Build Command, vérifier :
npx prisma generate && npm run build
```

### "Can't reach database server"

- Vérifier que `DATABASE_URL` est dans les variables Vercel
- Sur Neon : vérifier que le projet n'est pas en pause (plan gratuit se met en veille)
- Ajouter `?sslmode=require` à la fin de la DATABASE_URL

### "Socket connection failed"

- Vérifier que Railway tourne (logs sans erreur)
- Vérifier `NEXT_PUBLIC_SOCKET_URL` dans Vercel (sans slash final)
- Vérifier `JWT_ACCESS_SECRET` identique sur Vercel ET Railway

### "Stripe webhook signature invalid"

- Utiliser `STRIPE_WEBHOOK_SECRET` de la section Webhooks, pas des API Keys
- Sur Vercel, le body du webhook ne doit pas être parsé avant vérification (déjà géré)

### "Build failed on Vercel"

```bash
# Tester le build localement d'abord
npm run build
```

Erreur TypeScript → corriger en local puis push.

---

## 🔐 Sécurité en production

Avant de lancer en production réelle :

```bash
# Générer des secrets JWT sécurisés
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# → Copier ce hash pour JWT_ACCESS_SECRET
# → Générer un second hash pour JWT_REFRESH_SECRET
```

- ✅ Passer Stripe de **test** (`sk_test_`) à **live** (`sk_live_`)
- ✅ Passer PayPal de `sandbox` à `live`
- ✅ Activer HTTPS partout (automatique sur Vercel et Railway)
- ✅ Mettre `NODE_ENV=production` partout

---

## 📞 Contacts des services utilisés

| Service | Support | Documentation |
|---------|---------|---------------|
| Vercel | vercel.com/support | vercel.com/docs |
| Railway | railway.app/help | docs.railway.app |
| Neon | neon.tech/docs | neon.tech/docs |
| Stripe | support.stripe.com | stripe.com/docs |
| Agora | console.agora.io | docs.agora.io |

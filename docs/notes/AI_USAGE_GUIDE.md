# Guide d'utilisation - Chat Assistant IA et Dashboard

## Accès aux pages IA

### 1. Chat Assistant IA
- **URL**: http://localhost:4200/ai-assistant
- **Authentification**: Connexion Keycloak requise
- **Utilisateur de test**: `demo-employer` / `Employer@123`

**Fonctionnalités**:
- ✅ Chat multi-tour avec contexte ERP
- ✅ Recherche RAG sur documents indexés (devis, factures, stock)
- ✅ Réponses en streaming (SSE)
- ✅ Historique de conversations persisté
- ✅ Raccourcis rapides pour questions courantes

**Exemples de questions**:
- "Quel est l'état du stock critique en ce moment ?"
- "Combien de devis en attente de réponse ?"
- "Liste les factures impayées et leur montant total"
- "Rédige un devis pour une fenêtre 1.2m x 1.4m double vitrage"

### 2. Dashboard Prédictions IA
- **URL**: http://localhost:4200/ai-dashboard
- **Authentification**: SUPER_ADMIN, EMPLOYER
- **Utilisateur de test**: `demo-employer` / `Employer@123`

**Métriques affichées**:
- 📊 Chiffre d'affaires mensuel (historique + prévisions 90j)
- 📉 Taux de conversion devis/commandes
- 🚨 Risque de stock (critical, high, medium, low)
- 💰 Factures expirant bientôt
- 🎯 Anomalies détectées (commandes, paiements, stock)

## Architecture Backends

### API Endpoints disponibles

**Chat & Assistant**
```
POST /api/v1/ai/chat
  - Conversation simple avec contexte ERP
  - Réponse unique (JSON)

POST /api/v1/ai/chat/stream
  - Chat avec streaming SSE
  - Réponses chunk par chunk

POST /api/v1/ai/assistant
  - Chat avec RAG (Retrieval-Augmented Generation)
  - Retourne sources (documents) + réponse

POST /api/v1/ai/assistant-test
  - Version test sans authentification
  - Idéale pour démo et développement
```

**Données & Recherche**
```
POST /api/v1/ai/documents/search
  - Recherche par similarité (pgvector)
  - Retourne documents pertinents

GET /api/v1/ai/conversations
  - Historique des conversations de l'utilisateur
```

**Prédictions & Prévisions**
```
POST /api/v1/ai/stock-forecast
  - Prévision de rupture de stock
  - Calcul du risque par SKU

GET /api/v1/ai/model-status
  - Statut des modèles Ollama
  - Modèles disponibles
```

### Stack Technique

| Composant | Version | Port | Statut |
|-----------|---------|------|--------|
| PostgreSQL 16 | pgvector | 5432 | ✅ UP |
| Ollama (Mistral) | latest | 11434 | ✅ UP (model pulled) |
| FastAPI (ai-service) | - | 8000 | ✅ UP |
| Spring Gateway | - | 8443 | ✅ UP |
| Keycloak | 24 | 8180 | ✅ UP |
| Angular Frontend | 17 | 4200 | 🔄 Starting |

## Données de Test

### Documents indexés
- 29 documents AI (devis, factures, stock)
- 24 embeddings (vecteurs de similarité)
- Documents d'exemple:
  - Fenêtre 1.2m x 1.4m double vitrage (devis)
  - Porte-fenêtre 2m x 2.4m (devis)
  - Facture F-2026-001 (7,000 TND solde impayé)
  - État du stock (profils T60, T80, vitrages)
  - Vitrages sur mesure lot commercial

### Multi-tenant
- Tenant ID: `00000000-0000-0000-0000-000000000001`
- RLS (Row Level Security) activée
- Chaque utilisateur ne voit que ses données

## Étapes de démarrage

### 1. Backend services (déjà UP)
```powershell
docker-compose ps
# Vérifier: postgres, ollama, gateway, ai-service, keycloak
```

### 2. Frontend (en cours de compilation)
```powershell
# Terminal 1: Attendre 2-3 min pour compilation Angular
# URL: http://localhost:4200 (auto-ouverture)
```

### 3. Test Chat Assistant
```
1. Ouvrir http://localhost:4200
2. Cliquer "Login" → Keycloak
3. Entrer: demo-employer / Employer@123
4. Aller à: http://localhost:4200/ai-assistant
5. Écrire: "Quel est l'état du stock?"
6. Observer: Recherche RAG → 3 documents trouvés → Réponse IA
```

### 4. Test Dashboard
```
1. Aller à: http://localhost:4200/ai-dashboard
2. Observer: 
   - Chiffre d'affaires (graphique)
   - Prévisions 90 jours
   - Risques de stock
   - Factures expirant bientôt
```

## Débogage

### Endpoints de santé
```powershell
# AI Service
curl http://localhost:8000/api/v1/ai/health

# Gateway
curl https://localhost:8443/api/v1/identity/health -k

# Keycloak (dev)
curl http://localhost:8180/realms/master/protocol/openid-connect/.well-known/openid-configuration
```

### Logs
```powershell
# AI Service logs
docker logs erp-ai -f

# Frontend build output
# Observable dans terminal ng serve

# PostgreSQL
docker exec erp-postgres psql -U erp -d erp_db -c "SELECT * FROM ai_documents LIMIT 5;"

# Ollama models
docker exec erp-ollama ollama list
```

### Troubleshooting

**Frontend ne démarre pas**
```
rm -r node_modules
npm install --legacy-peer-deps
ng serve --proxy-config proxy.conf.json
```

**Keycloak authentification échoue**
- Vérifier: http://localhost:8180/admin
- Admin: admin / admin
- Vérifier le realm "erp-realm" existe

**Ollama model non trouvé**
```
docker exec erp-ollama ollama pull mistral
```

**Pas de réponse du chat**
- Vérifier Ollama: `docker logs erp-ollama`
- Vérifier PostgreSQL: `docker logs erp-postgres`
- Vérifier AI service: `docker logs erp-ai`

## Améliorations futures

- [ ] Fine-tuning du modèle Mistral avec données domaine
- [ ] Ajout prédictions: cashflow, recommandations achat
- [ ] Intégration notifications (push, email)
- [ ] Dashboard temps réel (WebSocket)
- [ ] Export PDF des prédictions
- [ ] Feedback utilisateur (thumbs up/down) pour amélioration IA

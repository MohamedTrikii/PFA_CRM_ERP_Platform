#!/bin/bash

# Script pour tester le service AI
# Obtenir un token Keycloak et faire des appels API

KEYCLOAK_URL="http://localhost:8180"
REALM="erp-realm"
CLIENT_ID="erp-client"
CLIENT_SECRET="erp-client-secret"
USERNAME="demo-employer"
PASSWORD="Employer@123"

echo "=== Test Service AI ==="
echo ""

# 1. Obtenir le token Keycloak
echo "[1] Obtenir le token Keycloak..."
TOKEN_RESPONSE=$(curl -s -X POST \
  "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=$CLIENT_ID" \
  -d "client_secret=$CLIENT_SECRET" \
  -d "username=$USERNAME" \
  -d "password=$PASSWORD" \
  -d "grant_type=password")

echo "$TOKEN_RESPONSE" | jq .

TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')
echo "Token reçu: ${TOKEN:0:50}..."
echo ""

# 2. Tester l'endpoint chat
echo "[2] Tester l'endpoint /api/v1/ai/chat..."
CHAT_RESPONSE=$(curl -s -X POST \
  "http://localhost:8000/api/v1/ai/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "message": "Quel est l'\''état actuel de mon stock?",
    "context": "Stock actuel: Profil T60: 500 unités (critique à 100), Verre 4-16-4: 1000 m²",
    "temperature": 0.7
  }')

echo "$CHAT_RESPONSE" | jq .
echo ""

# 3. Tester l'endpoint test sans auth
echo "[3] Tester /api/v1/ai/assistant-test (sans authentification)..."
TEST_RESPONSE=$(curl -s -X POST \
  "http://localhost:8000/api/v1/ai/assistant-test" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: 00000000-0000-0000-0000-000000000001" \
  -d '{
    "message": "Combien de devis en attente?",
    "use_rag": true,
    "top_k": 3,
    "temperature": 0.7
  }')

echo "$TEST_RESPONSE" | jq .
echo ""

# 4. Tester search documents
echo "[4] Tester /api/v1/ai/documents/search..."
SEARCH_RESPONSE=$(curl -s -X POST \
  "http://localhost:8000/api/v1/ai/documents/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "facture impayée montant",
    "k": 5
  }')

echo "$SEARCH_RESPONSE" | jq .
echo ""

# 5. Tester model status
echo "[5] Tester /api/v1/ai/model-status..."
STATUS_RESPONSE=$(curl -s -X GET \
  "http://localhost:8000/api/v1/ai/model-status" \
  -H "Authorization: Bearer $TOKEN")

echo "$STATUS_RESPONSE" | jq .
echo ""

# 6. Tester stock forecast
echo "[6] Tester /api/v1/ai/stock-forecast..."
FORECAST_RESPONSE=$(curl -s -X POST \
  "http://localhost:8000/api/v1/ai/stock-forecast" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "items": [
      {
        "product_id": "prof-t60",
        "product_reference": "T60-PROFIL",
        "current_quantity": 500,
        "reorder_point": 100,
        "daily_consumptions": [5, 3, 8, 2, 4, 6, 5, 3, 2, 4]
      },
      {
        "product_id": "verre-416",
        "product_reference": "VERRE-4-16-4",
        "current_quantity": 1000,
        "reorder_point": 200,
        "daily_consumptions": [10, 15, 8, 12, 20, 5, 3, 15, 10, 8]
      }
    ]
  }')

echo "$FORECAST_RESPONSE" | jq .
echo ""

echo "=== Tests terminés ==="

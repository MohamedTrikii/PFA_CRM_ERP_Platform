#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# start.sh  –  Lance la plateforme ERP complète
#
# Usage :
#   ./start.sh              # Démarrage normal
#   ./start.sh --build      # Reconstruction des images Docker
#   ./start.sh --pull-model # Télécharger le modèle Mistral (Ollama)
#   ./start.sh --down       # Arrêt complet
#   ./start.sh --logs       # Suivi des logs après démarrage
#   ./start.sh --help       # Aide
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── Couleurs ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; MAGENTA='\033[0;35m'; GRAY='\033[0;37m'; NC='\033[0m'

step()  { echo -e "\n${MAGENTA}  ══►  $*${NC}"; }
ok()    { echo -e "${GREEN}  [✔]  $*${NC}"; }
info()  { echo -e "${CYAN}  [·]  $*${NC}"; }
warn()  { echo -e "${YELLOW}  [!]  $*${NC}"; }
fail()  { echo -e "${RED}  [✖]  $*${NC}"; exit 1; }

# ─── Arguments ────────────────────────────────────────────────────────────────
BUILD=false; PULL_MODEL=false; DOWN=false; LOGS=false; SKIP_FRONTEND=false

for arg in "$@"; do
  case "$arg" in
    --build)        BUILD=true ;;
    --pull-model)   PULL_MODEL=true ;;
    --down)         DOWN=true ;;
    --logs)         LOGS=true ;;
    --skip-frontend) SKIP_FRONTEND=true ;;
    --help|-h)
      echo "Usage: ./start.sh [--build] [--pull-model] [--down] [--logs] [--skip-frontend]"
      exit 0 ;;
    *) warn "Option inconnue: $arg (ignorée)" ;;
  esac
done

# ─── Bannière ─────────────────────────────────────────────────────────────────
echo -e "${CYAN}"
echo "  ╔═══════════════════════════════════════════════════════════════╗"
echo "  ║   ERP Platform  –  Menuiserie Aluminium  –  Self-hosted       ║"
echo "  ║   Multi-tenant SaaS · PostgreSQL RLS · Keycloak · Docker      ║"
echo "  ╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ─── Mode arrêt ───────────────────────────────────────────────────────────────
if $DOWN; then
  step "Arrêt de tous les services"
  cd "$ROOT"
  docker-compose down --remove-orphans
  ok "Tous les conteneurs sont arrêtés"
  exit 0
fi

# ─── Prérequis ────────────────────────────────────────────────────────────────
step "Vérification des prérequis"

command -v docker >/dev/null 2>&1 || fail "Docker n'est pas installé."
docker info >/dev/null 2>&1      || fail "Docker daemon n'est pas démarré."
ok "Docker est en cours d'exécution"

command -v docker-compose >/dev/null 2>&1 || \
  docker compose version >/dev/null 2>&1  || \
  fail "docker-compose non trouvé. Installez Docker Desktop."

# Normalise la commande compose (Docker Desktop v2 intègre 'docker compose')
if command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  COMPOSE="docker compose"
fi
ok "docker-compose disponible ($COMPOSE)"

NODE_OK=false
if command -v node >/dev/null 2>&1; then
  NODE_OK=true
  ok "Node.js $(node --version) détecté"
else
  warn "Node.js non trouvé — le serveur Angular ne sera pas démarré automatiquement."
fi

# ─── Environnement ────────────────────────────────────────────────────────────
step "Configuration de l'environnement"
cd "$ROOT"

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    warn ".env créé depuis .env.example"
    warn "Mots de passe par défaut utilisés — modifiez .env avant la production !"
  else
    warn ".env introuvable. Les valeurs par défaut de docker-compose.yml seront utilisées."
  fi
else
  ok ".env trouvé"
fi

# ─── Docker Compose ───────────────────────────────────────────────────────────
step "Démarrage des conteneurs Docker"

COMPOSE_ARGS=("up" "-d")
if $BUILD; then
  COMPOSE_ARGS+=("--build")
  info "Reconstruction des images (--build)..."
  info "Maven va compiler tous les modules (~5-10 min au premier lancement)"
fi

$COMPOSE "${COMPOSE_ARGS[@]}"
ok "Conteneurs lancés (health checks en cours...)"

# ─── Attente des conteneurs ───────────────────────────────────────────────────
wait_healthy() {
  local name="$1" timeout="${2:-300}"
  info "Attente de $name..."
  local deadline=$(( $(date +%s) + timeout ))
  while [ "$(date +%s)" -lt "$deadline" ]; do
    local status
    status=$(docker inspect --format='{{.State.Health.Status}}' "$name" 2>/dev/null || echo "")
    [ "$status" = "healthy" ]   && { ok "$name est prêt";     return 0; }
    [ "$status" = "unhealthy" ] && { fail "$name est unhealthy. Logs: docker logs $name"; }
    sleep 5
  done
  fail "$name n'est pas devenu healthy en ${timeout}s. Logs: docker logs $name"
}

wait_http() {
  local url="$1" name="$2" timeout="${3:-180}"
  info "Attente de $name ($url)..."
  local deadline=$(( $(date +%s) + timeout ))
  while [ "$(date +%s)" -lt "$deadline" ]; do
    if curl -sf --max-time 4 "$url" -o /dev/null 2>/dev/null; then
      ok "$name est prêt"
      return 0
    fi
    sleep 5
  done
  fail "$name n'a pas répondu en ${timeout}s ($url)"
}

step "Attente des services critiques"

wait_healthy "erp-postgres"  120
wait_healthy "erp-valkey"     60
wait_healthy "erp-rabbitmq"   90

info "Attente de Keycloak (peut prendre 2-3 minutes)..."
wait_healthy "erp-keycloak"  300

wait_http "http://localhost:8082/actuator/health" "Identity Service"  420
wait_http "http://localhost:8083/actuator/health" "CRM Service"       420
wait_http "http://localhost:8084/actuator/health" "Sales Service"     420
wait_http "http://localhost:8085/actuator/health" "Inventory Service" 420
wait_http "http://localhost:8086/actuator/health" "Achat Service"     420
wait_http "http://localhost:8087/actuator/health" "CMS Service"       420
wait_http "http://localhost:8443/actuator/health" "API Gateway"       420

wait_http "http://localhost:9411"            "Zipkin"      60
wait_http "http://localhost:9090/-/ready"    "Prometheus"  60
wait_http "http://localhost:3001/api/health" "Grafana"     60
wait_http "http://localhost:3100/ready"      "Loki"        60
wait_http "http://localhost:8000/api/v1/ai/health" "AI Service" 120

# ─── Modèle Ollama ────────────────────────────────────────────────────────────
if $PULL_MODEL; then
  step "Téléchargement du modèle Mistral (Ollama)"
  info "Cette opération peut prendre plusieurs minutes (~4 Go)..."
  if docker exec erp-ollama ollama pull mistral; then
    ok "Modèle Mistral téléchargé"
  else
    warn "Échec du téléchargement. Réessayez : docker exec erp-ollama ollama pull mistral"
  fi
else
  info "Modèle Ollama non téléchargé. Pour activer le chat IA :"
  info "  docker exec erp-ollama ollama pull mistral"
fi

# ─── Frontend Angular ─────────────────────────────────────────────────────────
if $NODE_OK && ! $SKIP_FRONTEND; then
  step "Démarrage du serveur Angular"
  FRONTEND_DIR="$ROOT/frontend"

  if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    info "Première exécution : installation des dépendances npm..."
    (cd "$FRONTEND_DIR" && npm ci)
    ok "Dépendances npm installées"
  fi

  info "Lancement d'Angular en arrière-plan (http://localhost:4200)..."
  # Détection du terminal disponible
  if command -v gnome-terminal >/dev/null 2>&1; then
    gnome-terminal -- bash -c "cd '$FRONTEND_DIR'; npm start; bash"
  elif command -v xterm >/dev/null 2>&1; then
    xterm -e "cd '$FRONTEND_DIR'; npm start" &
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS : ouvrir dans Terminal.app
    osascript -e "tell application \"Terminal\" to do script \"cd '$FRONTEND_DIR' && npm start\""
  else
    # Fallback : lancer en arrière-plan dans le même terminal
    (cd "$FRONTEND_DIR" && npm start) &
    FRONTEND_PID=$!
    ok "Angular lancé en arrière-plan (PID $FRONTEND_PID)"
    info "Arrêter avec : kill $FRONTEND_PID"
  fi
  ok "Serveur Angular démarré → http://localhost:4200"
elif ! $NODE_OK; then
  warn "Angular non démarré (Node.js absent)."
  warn "Installez Node.js 20+ puis : cd frontend && npm ci && npm start"
fi

# ─── Application mobile Flutter ───────────────────────────────────────────────
step "Application mobile Flutter"

if command -v flutter >/dev/null 2>&1; then
  FLUTTER_VER=$(flutter --version 2>/dev/null | head -1)
  ok "Flutter détecté : $FLUTTER_VER"
  info "Pour lancer l'application mobile :"
  echo "    cd mobile && flutter pub get && flutter run"
  echo "    flutter run -d chrome       # Version web"
  echo "    flutter build apk --release # APK Android"

  # Vérification des devices disponibles
  DEVICES=$(flutter devices 2>/dev/null | grep -cE "mobile|emulator" || echo "0")
  if [ "$DEVICES" -gt 0 ]; then
    ok "$DEVICES device(s) détecté(s) — lancez 'cd mobile && flutter run'"
  else
    info "Aucun device mobile détecté. Démarrez un émulateur ou connectez un appareil."
  fi
else
  warn "Flutter SDK non trouvé. Installez Flutter 3.22+ : https://docs.flutter.dev/get-started/install"
  info "L'application mobile n'est pas démarrée automatiquement."
fi

# ─── Mode logs ────────────────────────────────────────────────────────────────
if $LOGS; then
  step "Suivi des logs (Ctrl+C pour quitter)"
  $COMPOSE logs -f
fi

# ─── Résumé ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}  ╔═══════════════════════════════════════════════════════════════╗"
echo -e "  ║              PLATEFORME ERP DÉMARRÉE  ✔                      ║"
echo -e "  ╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}  Service                      URL${NC}"
echo -e "${GRAY}  ───────────────────────────  ─────────────────────────────────────${NC}"
echo -e "${GREEN}  Frontend Angular             http://localhost:4200${NC}"
echo -e "${GREEN}  Mobile Flutter               flutter run  (dans mobile/)${NC}"
echo -e "${CYAN}  API Gateway                  http://localhost:8443${NC}"
echo -e "${CYAN}  Keycloak Admin Console       http://localhost:8080/admin${NC}"
echo -e "${CYAN}  Grafana (dashboards)         http://localhost:3001${NC}"
echo    "  Prometheus                   http://localhost:9090"
echo    "  Zipkin (traces)              http://localhost:9411"
echo    "  Loki (logs)                  http://localhost:3100"
echo    "  RabbitMQ Management          http://localhost:15672"
echo    "  SeaweedFS Filer              http://localhost:8888"
echo    "  Ollama API                   http://localhost:11434"
echo    "  AI Service (Swagger)         http://localhost:8000/api/v1/ai/docs"
echo -e "${GRAY}  ── Services Spring Boot ──   ─────────────────────────────────────${NC}"
echo -e "${GRAY}  Gateway health               http://localhost:8443/actuator/health${NC}"
echo -e "${GRAY}  Identity Service             http://localhost:8082/actuator/health${NC}"
echo -e "${GRAY}  CRM Service                  http://localhost:8083/actuator/health${NC}"
echo -e "${GRAY}  Sales Service                http://localhost:8084/actuator/health${NC}"
echo -e "${GRAY}  Inventory Service            http://localhost:8085/actuator/health${NC}"
echo -e "${GRAY}  Achat Service                http://localhost:8086/actuator/health${NC}"
echo -e "${GRAY}  CMS Service                  http://localhost:8087/actuator/health${NC}"
echo ""
echo -e "${YELLOW}  Identifiants démo :${NC}"
echo "  ┌─────────────────┬──────────────────────────┬──────────────────┐"
echo "  │ Rôle            │ Email                    │ Mot de passe     │"
echo "  ├─────────────────┼──────────────────────────┼──────────────────┤"
echo "  │ SUPER_ADMIN     │ super@erp.local          │ SuperAdmin@123   │"
echo "  │ EMPLOYER        │ demo@demo-tenant.local   │ Employer@123     │"
echo "  │ EMPLOYEE        │ emp@demo-tenant.local    │ Employee@123     │"
echo "  │ CLIENT          │ client@demo-tenant.local │ Client@123       │"
echo "  └─────────────────┴──────────────────────────┴──────────────────┘"
echo ""
echo -e "${GRAY}  Keycloak admin : admin / admin_secret  (modifiez .env en production)"
echo "  Grafana admin  : admin / admin_secret  (modifiez .env en production)"
echo ""
echo "  Commandes utiles :"
echo "    ./start.sh --down               # Arrêter tout"
echo "    ./start.sh --build              # Reconstruire les images Docker"
echo "    ./start.sh --build --pull-model # Build + télécharger Mistral (IA)"
echo "    ./start.sh --logs               # Voir les logs en temps réel"
echo "    ./start.sh --skip-frontend      # Lancer sans Angular (CI/CD)"
echo "    docker-compose ps               # Statut de tous les conteneurs"
echo "    docker-compose logs -f erp-gateway  # Logs d'un service"
echo "    docker exec erp-ollama ollama pull mistral  # Modèle IA manuel"
echo ""
echo "  Mobile Flutter :"
echo "    cd mobile && flutter pub get && flutter run"
echo "    flutter run -d chrome       # Version web"
echo "    flutter build apk --release # APK Android"
echo -e "${NC}"
echo -e "${GREEN}  ╔═══════════════════════════════════════════════════════════════╗"
echo -e "  ║  Bon développement !  🚀                                      ║"
echo -e "  ╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

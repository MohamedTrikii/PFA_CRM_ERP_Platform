#Requires -Version 5.1
<#
.SYNOPSIS
    Lance la plateforme ERP complete (Docker Compose + serveur Angular).

.DESCRIPTION
    Ce script gere le cycle de vie complet du projet :
      1. Verification des prerequis (Docker, Node.js)
      2. Creation du fichier .env si absent
      3. Demarrage de tous les services via Docker Compose
      4. Attente des health checks (PostgreSQL, Keycloak, services Spring Boot...)
      5. Tirage optionnel du modele Ollama/Mistral
      6. Lancement du serveur de developpement Angular

.PARAMETER Build
    Force la reconstruction des images Docker (--build).

.PARAMETER PullModel
    Telecharge le modele Mistral dans Ollama apres le demarrage
    (necessite une connexion internet, ~4 Go).

.PARAMETER Down
    Arrete et supprime tous les conteneurs et reseaux.

.PARAMETER Logs
    Affiche les logs en temps reel apres le demarrage.

.PARAMETER SkipFrontend
    Ne lance pas le serveur Angular (utile en CI ou si deja demarre).

.PARAMETER WithAI
    Demarre aussi Ollama et le service AI (necessite ~2 Go de telechargement).

.EXAMPLE
    .\start.ps1                     # Premier lancement normal (sans Ollama)
    .\start.ps1 -WithAI             # Avec Ollama + AI Service
    .\start.ps1 -Build              # Reconstruction des images
    .\start.ps1 -WithAI -PullModel  # Avec AI + telechargement Mistral
    .\start.ps1 -Down               # Arret complet
#>

param(
    [switch]$Build,
    [switch]$PullModel,
    [switch]$Down,
    [switch]$Logs,
    [switch]$SkipFrontend,
    [switch]$WithAI
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ROOT = $PSScriptRoot

# --- Couleurs / helpers -------------------------------------------------------
function Write-Banner {
    $lines = @(
        "",
        "  +===============================================================+",
        "  |   ERP Platform  -  Menuiserie Aluminium  -  Self-hosted       |",
        "  |   Multi-tenant SaaS . PostgreSQL RLS . Keycloak . Docker      |",
        "  +===============================================================+",
        ""
    )
    foreach ($l in $lines) { Write-Host $l -ForegroundColor Blue }
}

function step($msg)  { Write-Host "`n  ==>  $msg" -ForegroundColor Magenta }
function ok($msg)    { Write-Host "  [OK] $msg"   -ForegroundColor Green }
function info($msg)  { Write-Host "  [..] $msg"   -ForegroundColor Cyan }
function warn($msg)  { Write-Host "  [!!] $msg"   -ForegroundColor Yellow }
function err($msg)   { Write-Host "  [XX] $msg"   -ForegroundColor Red; exit 1 }

function Wait-ContainerHealthy {
    param([string]$Name, [int]$Timeout = 300)
    info "Attente de $Name..."
    $deadline = (Get-Date).AddSeconds($Timeout)
    while ((Get-Date) -lt $deadline) {
        try {
            $status = docker inspect --format='{{.State.Health.Status}}' $Name 2>$null
            if ($status -eq "healthy")   { ok "$Name est pret"; return }
            if ($status -eq "unhealthy") { err "$Name est en etat unhealthy. Verifiez: docker logs $Name" }
        } catch {}
        Start-Sleep -Seconds 5
    }
    err "$Name n'est pas devenu healthy en ${Timeout}s. Verifiez: docker logs $Name"
}

function Wait-Http {
    param([string]$Url, [string]$Name, [int]$Timeout = 180)
    info "Attente de $Name ($Url)..."
    $deadline = (Get-Date).AddSeconds($Timeout)
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri $Url -TimeoutSec 4 -UseBasicParsing -ErrorAction Stop
            if ($r.StatusCode -lt 500) { ok "$Name est pret (HTTP $($r.StatusCode))"; return }
        } catch {}
        Start-Sleep -Seconds 5
    }
    err "$Name n'a pas repondu en ${Timeout}s ($Url)"
}

# --- Banniere -----------------------------------------------------------------
Write-Banner

# --- Mode arret ---------------------------------------------------------------
if ($Down) {
    step "Arret de tous les services"
    Set-Location $ROOT
    docker-compose down --remove-orphans
    ok "Tous les conteneurs sont arretes"
    exit 0
}

# --- Prerequisites ------------------------------------------------------------
step "Verification des prerequis"

# Docker : verifier d'abord si l'executable est dans le PATH
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    err "Docker n'est pas installe ou n'est pas dans le PATH. Installez Docker Desktop."
}
# Puis verifier si le daemon tourne (on ignore stderr via redirection separee)
$ErrorActionPreference = "Continue"
$dockerOut = & docker info 2>&1
$ErrorActionPreference = "Stop"
if ($LASTEXITCODE -ne 0) {
    err "Docker Desktop n'est pas demarre. Lancez Docker Desktop puis relancez ce script."
}
ok "Docker est en cours d'execution"

# docker-compose
if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    err "docker-compose non trouve. Installez Docker Desktop (inclut Compose)."
}
ok "docker-compose est disponible"

# Node.js
$nodeOk = $false
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
    $nodeVer = & node --version 2>&1
    $nodeOk  = $true
    ok "Node.js $nodeVer detecte"
} else {
    warn "Node.js non trouve -- le serveur Angular ne sera pas demarre automatiquement."
    warn "Installez Node.js 20+ depuis https://nodejs.org/"
}

# Ports critiques
$portsOccupes = @()
@(5432, 6379, 8180, 8443, 9090, 3001) | ForEach-Object {
    $conn = Test-NetConnection -ComputerName localhost -Port $_ -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($conn.TcpTestSucceeded) { $portsOccupes += $_ }
}
if ($portsOccupes.Count -gt 0) {
    warn "Les ports suivants sont deja utilises : $($portsOccupes -join ', ')"
    warn "Cela peut provoquer des conflits. Arretez les services concernes ou modifiez docker-compose.yml."
}

# --- Environnement ------------------------------------------------------------
step "Configuration de l'environnement"
Set-Location $ROOT
$envFile    = Join-Path $ROOT ".env"
$envExample = Join-Path $ROOT ".env.example"

if (-not (Test-Path $envFile)) {
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile
        warn ".env cree depuis .env.example"
        warn "Les mots de passe par defaut sont utilises. Modifiez .env avant la mise en production !"
    } else {
        warn ".env introuvable et pas de .env.example. Les valeurs par defaut de docker-compose.yml seront utilisees."
    }
} else {
    ok ".env trouve"
}

# --- Docker Compose -----------------------------------------------------------
step "Demarrage des conteneurs Docker"

$composeArgs = @("up", "-d")
if ($Build)  { $composeArgs += "--build" }
if ($WithAI) { $composeArgs = @("--profile", "ai") + $composeArgs }

if ($Build) {
    info "Reconstruction des images Docker (--build)..."
    info "Note : Maven va compiler tous les modules (~5-10 min au premier lancement)"
}
if ($WithAI) {
    info "Mode AI active -- Ollama (1.8 Go) et AI Service seront demarre(s)."
} else {
    info "Mode standard (sans Ollama). Ajoutez -WithAI pour activer l'assistant IA."
}

docker-compose @composeArgs
if ($LASTEXITCODE -ne 0) {
    err "docker-compose up a echoue. Consultez les erreurs ci-dessus."
}
ok "Conteneurs lances (les health checks sont en cours...)"

# --- Attente des services -----------------------------------------------------
step "Attente des services critiques"

# Infrastructure
Wait-ContainerHealthy "erp-postgres"  120
Wait-ContainerHealthy "erp-valkey"     60
Wait-ContainerHealthy "erp-rabbitmq"   90

# Keycloak (long demarrage)
info "Attente de Keycloak (peut prendre 2-3 minutes)..."
Wait-ContainerHealthy "erp-keycloak"  300

# Services Spring Boot
Wait-Http "http://localhost:8082/actuator/health" "Identity Service"  420
Wait-Http "http://localhost:8083/actuator/health" "CRM Service"       420
Wait-Http "http://localhost:8084/actuator/health" "Sales Service"     420
Wait-Http "http://localhost:8085/actuator/health" "Inventory Service" 420
Wait-Http "http://localhost:8086/actuator/health" "Achat Service"     420
Wait-Http "http://localhost:8087/actuator/health" "CMS Service"       420
Wait-Http "http://localhost:8443/actuator/health" "API Gateway"       420

# Observabilite
Wait-Http "http://localhost:9411"            "Zipkin"      60
Wait-Http "http://localhost:9090/-/ready"    "Prometheus"  60
Wait-Http "http://localhost:3001/api/health" "Grafana"     60
Wait-Http "http://localhost:3100/ready"      "Loki"        60

# AI service (seulement si -WithAI)
if ($WithAI) {
    Wait-Http "http://localhost:8000/api/v1/ai/health" "AI Service" 180
}

# --- Modele Ollama ------------------------------------------------------------
if ($WithAI -and $PullModel) {
    step "Telechargement du modele Mistral (Ollama)"
    info "Cette operation peut prendre plusieurs minutes (~4 Go)..."
    docker exec erp-ollama ollama pull mistral
    if ($LASTEXITCODE -eq 0) {
        ok "Modele Mistral telecharge avec succes"
    } else {
        warn "Le telechargement du modele a echoue. Reessayez manuellement :"
        warn "  docker exec erp-ollama ollama pull mistral"
    }
} elseif (-not $WithAI) {
    info "Ollama desactive. Pour activer l'IA : .\start.ps1 -WithAI -PullModel"
}

# --- Frontend Angular ---------------------------------------------------------
if ($nodeOk -and -not $SkipFrontend) {
    step "Demarrage du serveur Angular"
    $frontendDir = Join-Path $ROOT "frontend"

    $nodeModules = Join-Path $frontendDir "node_modules"
    if (-not (Test-Path $nodeModules)) {
        info "Premiere execution : installation des dependances npm..."
        Push-Location $frontendDir
        npm install --legacy-peer-deps
        if ($LASTEXITCODE -ne 0) { err "npm install a echoue dans le dossier frontend/" }
        Pop-Location
        ok "Dependances npm installees"
    }

    info "Lancement du serveur Angular dans une nouvelle fenetre PowerShell..."
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$frontendDir'; Write-Host '[Angular] Demarrage sur http://localhost:4200' -ForegroundColor Cyan; npm start"
    )
    ok "Serveur Angular lance (http://localhost:4200)"
    info "Attendez quelques secondes que la compilation soit terminee."
} elseif (-not $nodeOk) {
    warn "Angular non demarre (Node.js absent)."
    warn "Installez Node.js 20+ puis executez dans frontend/ : npm install --legacy-peer-deps && npm start"
}

# --- Application mobile Flutter -----------------------------------------------
step "Application mobile Flutter"
$flutterDir = Join-Path $ROOT "mobile"
$flutterOk  = $false

$flutterCmd = Get-Command flutter -ErrorAction SilentlyContinue
if ($flutterCmd) {
    $ErrorActionPreference = "Continue"
    $flutterVer = (& flutter --version 2>&1 | Select-Object -First 1) -replace "\r?\n", ""
    $ErrorActionPreference = "Stop"
    $flutterOk  = $true
    ok "Flutter detecte : $flutterVer"
} else {
    warn "Flutter SDK non trouve dans le PATH."
    warn "Installez Flutter 3.22+ depuis https://docs.flutter.dev/get-started/install"
}

if ($flutterOk) {
    $pubspec = Join-Path $flutterDir "pubspec.yaml"
    if (Test-Path $pubspec) {
        info "Pour lancer l'application mobile :"
        Write-Host "    cd mobile" -ForegroundColor DarkGray
        Write-Host "    flutter pub get" -ForegroundColor DarkGray
        Write-Host "    flutter run              # emulateur/device connecte" -ForegroundColor DarkGray
        Write-Host "    flutter run -d chrome    # version web" -ForegroundColor DarkGray
        Write-Host "    flutter build apk        # APK Android" -ForegroundColor DarkGray

        $devices = flutter devices 2>$null | Where-Object { $_ -match "(mobile)|emulator" }
        if ($devices) {
            info "Device(s) detecte(s) -- lancez 'cd mobile; flutter run' pour demarrer"
        } else {
            info "Aucun device mobile detecte. Demarrez un emulateur Android ou connectez un appareil."
        }
    }
} else {
    info "Mobile non lance. Installez Flutter SDK et relancez le script."
}

# --- Mode logs ----------------------------------------------------------------
if ($Logs) {
    step "Affichage des logs (Ctrl+C pour quitter)"
    docker-compose logs -f
}

# --- Resume ------------------------------------------------------------------
Write-Host ""
Write-Host "  +===============================================================+" -ForegroundColor Green
Write-Host "  |              PLATEFORME ERP DEMARREE  [OK]                   |" -ForegroundColor Green
Write-Host "  +===============================================================+" -ForegroundColor Green
Write-Host ""
Write-Host "  Service                     URL" -ForegroundColor White
Write-Host "  --------------------------  -------------------------------------" -ForegroundColor DarkGray
Write-Host "  Frontend Angular            http://localhost:4200" -ForegroundColor Green
Write-Host "  Mobile Flutter              flutter run  (dans mobile/)" -ForegroundColor Green
Write-Host "  API Gateway                 http://localhost:8443" -ForegroundColor Cyan
Write-Host "  Keycloak Admin Console      http://localhost:8180/admin" -ForegroundColor Cyan
Write-Host "  Grafana (dashboards)        http://localhost:3001" -ForegroundColor Cyan
Write-Host "  Prometheus                  http://localhost:9090" -ForegroundColor White
Write-Host "  Zipkin (traces)             http://localhost:9411" -ForegroundColor White
Write-Host "  Loki (logs)                 http://localhost:3100" -ForegroundColor White
Write-Host "  RabbitMQ Management         http://localhost:15672" -ForegroundColor White
Write-Host "  SeaweedFS Filer             http://localhost:8888" -ForegroundColor White
if ($WithAI) {
    Write-Host "  Ollama API                  http://localhost:11434" -ForegroundColor White
    Write-Host "  AI Service (Swagger)        http://localhost:8000/api/v1/ai/docs" -ForegroundColor White
} else {
    Write-Host "  Ollama / AI Service         desactive  (ajoutez -WithAI)" -ForegroundColor DarkGray
}
Write-Host "  --- Services Spring Boot -------------------------------------------" -ForegroundColor DarkGray
Write-Host "  Gateway health              http://localhost:8443/actuator/health" -ForegroundColor DarkGray
Write-Host "  Identity Service            http://localhost:8082/actuator/health" -ForegroundColor DarkGray
Write-Host "  CRM Service                 http://localhost:8083/actuator/health" -ForegroundColor DarkGray
Write-Host "  Sales Service               http://localhost:8084/actuator/health" -ForegroundColor DarkGray
Write-Host "  Inventory Service           http://localhost:8085/actuator/health" -ForegroundColor DarkGray
Write-Host "  Achat Service               http://localhost:8086/actuator/health" -ForegroundColor DarkGray
Write-Host "  CMS Service                 http://localhost:8087/actuator/health" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Identifiants demo :" -ForegroundColor Yellow
Write-Host "  +------------------+-----------------------------+------------------+" -ForegroundColor DarkGray
Write-Host "  | Role             | Email                       | Mot de passe     |" -ForegroundColor DarkGray
Write-Host "  +------------------+-----------------------------+------------------+" -ForegroundColor DarkGray
Write-Host "  | SUPER_ADMIN      | superadmin@erp.local        | SuperAdmin@123   |" -ForegroundColor Yellow
Write-Host "  | EMPLOYER         | employer@demo.erp.local     | Employer@123     |" -ForegroundColor Yellow
Write-Host "  | EMPLOYEE         | employee@demo.erp.local     | Employee@123     |" -ForegroundColor Yellow
Write-Host "  | CLIENT           | client@demo.erp.local       | Client@123       |" -ForegroundColor Yellow
Write-Host "  +------------------+-----------------------------+------------------+" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Keycloak admin : admin / change_me_in_prod  (modifiez .env en production)" -ForegroundColor DarkGray
Write-Host "  Grafana admin  : admin / change_me_in_prod  (modifiez .env en production)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Commandes utiles :" -ForegroundColor White
Write-Host "    .\start.ps1 -Down                    # Arreter tout" -ForegroundColor DarkGray
Write-Host "    .\start.ps1 -Build                   # Reconstruire les images Docker" -ForegroundColor DarkGray
Write-Host "    .\start.ps1 -WithAI                  # Avec Ollama + AI Service" -ForegroundColor DarkGray
Write-Host "    .\start.ps1 -WithAI -PullModel       # AI + telecharger Mistral (~4 Go)" -ForegroundColor DarkGray
Write-Host "    .\start.ps1 -Logs                    # Voir les logs en temps reel" -ForegroundColor DarkGray
Write-Host "    .\start.ps1 -SkipFrontend            # Lancer sans Angular (CI/CD)" -ForegroundColor DarkGray
Write-Host "    docker-compose ps                    # Statut de tous les conteneurs" -ForegroundColor DarkGray
Write-Host "    docker-compose logs -f erp-gateway   # Logs d'un service" -ForegroundColor DarkGray
Write-Host "    docker exec erp-ollama ollama pull mistral  # Modele IA manuel" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Mobile Flutter :" -ForegroundColor White
Write-Host "    cd mobile" -ForegroundColor DarkGray
Write-Host "    flutter pub get; flutter run          # Android/iOS" -ForegroundColor DarkGray
Write-Host "    flutter run -d chrome                 # Web browser" -ForegroundColor DarkGray
Write-Host "    flutter build apk --release           # APK Android" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  +===============================================================+" -ForegroundColor Green
Write-Host "  |  Bon developpement !                                          |" -ForegroundColor Green
Write-Host "  +===============================================================+" -ForegroundColor Green
Write-Host ""

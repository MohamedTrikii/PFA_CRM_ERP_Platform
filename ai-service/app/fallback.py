"""Rule-based fallback responses used when Ollama/Mistral is unavailable."""

import re
from typing import AsyncGenerator, Optional, List
from . import context_builder

# (keyword_tuple, french_response) pairs — first match wins
_RULES: list[tuple[tuple[str, ...], str]] = [
    (
        ("devis", "quotat", "قسيمة", "offre de prix", "rédige"),
        """\
Je suis en mode **hors-ligne** (Ollama indisponible) — voici comment gérer vos devis :

**Créer un devis**
1. Allez dans **Ventes → Devis** puis cliquez sur « Nouveau Devis »
2. Sélectionnez le client et ajoutez les lignes de produits
3. Pour l'aluminium : précisez la série (T45/T60/T70), les dimensions (mm) et le type de vitrage

**Statuts possibles**
- ⏳ En attente — devis envoyé au client
- ✅ Accepté — à convertir en commande
- ❌ Refusé — clôturé sans suite

**Suggestion de prix**
L'outil **Suggérer prix** (icône calculatrice) calcule le prix HT automatiquement selon la surface et le type de vitrage.""",
    ),
    (
        ("facture", "invoice", "impayé", "paiement", "encaissement", "فاتورة", "régler"),
        """\
Je suis en mode **hors-ligne** (Ollama indisponible) — voici comment gérer les factures :

**Consulter les factures**
- **Ventes → Factures** — liste complète avec filtre par statut
- Statuts : Brouillon · Émise · Partiellement payée · Soldée

**Enregistrer un paiement**
1. Ouvrez la facture concernée
2. Cliquez sur **« Enregistrer paiement »**
3. Saisissez le montant, le mode et la date

**Factures impayées**
Filtrez par statut « Émise » et triez par date d'échéance pour identifier les retards.""",
    ),
    (
        ("stock", "inventaire", "مخزون", "rupture", "réapprovisionnement", "quantit"),
        """\
Je suis en mode **hors-ligne** (Ollama indisponible) — voici comment gérer le stock :

**Situation du stock**
- **Inventaire → Articles** → colonne « Qté disponible »
- 🔴 Critique : quantité ≤ point de réapprovisionnement
- 🟠 Faible : quantité ≤ 2× le point de réapprovisionnement

**Enregistrer un mouvement**
- **Entrée** (réception fournisseur) → bouton « Entrée de stock »
- **Sortie** (consommation/vente) → bouton « Sortie de stock »

**Alertes automatiques**
Le tableau de bord Employeur affiche les articles critiques en temps réel.""",
    ),
    (
        ("commande", "bon de commande", "طلبية", "achat fournisseur", "purchase"),
        """\
Je suis en mode **hors-ligne** (Ollama indisponible) — voici comment gérer les commandes :

**Commandes clients**
- **Ventes → Commandes** : liste de toutes les commandes en cours
- Pour générer une commande depuis un devis accepté : ouvrez le devis → « Générer commande »

**Bons de commande fournisseurs**
- **Achats → Bons de commande** : pour passer des commandes aux fournisseurs
- Renseignez : fournisseur, articles, quantités, délai de livraison souhaité

**Suivi**
Statuts : En attente · Partiellement livré · Livré · Annulé""",
    ),
    (
        ("client", "crm", "prospect", "contact", "عميل", "opportunité", "lead"),
        """\
Je suis en mode **hors-ligne** (Ollama indisponible) — voici comment gérer vos clients et prospects :

**CRM → Clients**
- Fiche client avec historique des devis, commandes et factures
- Ajout d'une note ou d'une activité directement depuis la fiche

**CRM → Prospects**
- Pipeline de prospection avec statuts : Nouveau · Contacté · Qualifié · Proposition · Gagné/Perdu
- Convertir un prospect en client : bouton « Convertir »

**Portail client**
Les clients peuvent consulter leurs devis et factures via le portail en ligne.""",
    ),
    (
        ("rapport", "report", "statistique", "chiffre", "dashboard", "tableau de bord"),
        """\
Je suis en mode **hors-ligne** (Ollama indisponible) — voici les tableaux de bord disponibles :

**Tableau de bord Employeur**
- Chiffre d'affaires mensuel (graphique sur 12 mois)
- Stock en alerte (articles critiques / à réapprovisionner)
- Taux de conversion des devis
- Dernières activités CRM

**Rapports disponibles**
- **Ventes** : CA par période, par client, par commercial
- **Stock** : situation instantanée, mouvements du mois
- **Achats** : volume par fournisseur, délais moyens""",
    ),
]

_DEFAULT = """\
Je suis en mode **hors-ligne** — le modèle IA (Ollama/Mistral) n'est pas disponible.

Je peux vous orienter sur les fonctionnalités de l'ERP :

| Module | Accès |
|--------|-------|
| 📋 **Devis & Ventes** | Ventes → Devis / Commandes / Factures |
| 📦 **Inventaire** | Inventaire → Articles / Mouvements |
| 👥 **CRM** | CRM → Clients / Prospects |
| 🛒 **Achats** | Achats → Bons de commande |
| 📊 **Rapports** | Tableau de bord Employeur |

Posez votre question en précisant le sujet (ex : « comment créer un devis ? ») et je vous guiderai étape par étape."""


def _match(message: str) -> str:
    lower = message.lower()
    for keywords, response in _RULES:
        if any(kw in lower for kw in keywords):
            return response
    return _DEFAULT


async def stream_fallback(
    message: str,
    tenant_id: Optional[str] = None,
    roles: Optional[List[str]] = None,
    user_id: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """Yield the fallback reply token-by-token (word by word) to simulate streaming.

    If `tenant_id` is provided and the message appears to request business data
    (CA, factures, stock), fetch a live ERP summary via `context_builder`.
    """
    lower = message.lower()
    # If tenant provided and message mentions business keywords, fetch live ERP summary
    business_keywords = ("chiffre", "ca", "encaisse", "facture", "impay", "stock", "rupture", "devis")
    if tenant_id and any(kw in lower for kw in business_keywords):
        try:
            # Use context_builder to fetch a role-aware ERP summary
            erp_summary = await context_builder._fetch_erp_summary(tenant_id, roles or [], user_id)
            response = "Je suis en mode hors-ligne (modèle IA indisponible). Voici les données ERP actuelles :\n\n" + erp_summary
        except Exception:
            response = _match(message)
    else:
        response = _match(message)

    words = re.split(r"(\s+)", response)
    for word in words:
        if word:
            yield word

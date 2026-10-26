"""Dynamic ERP context builder for the AI assistant.

Queries the database for live business summaries tailored to the user's role.
The returned string is injected into the system prompt so the LLM always has
an accurate, up-to-date picture of the tenant's data to answer business questions.
"""
from __future__ import annotations
import logging
from datetime import date
from typing import Optional

from . import db

logger = logging.getLogger(__name__)

ROLE_SUPER_ADMIN = "SUPER_ADMIN"
ROLE_EMPLOYER    = "EMPLOYER"
ROLE_EMPLOYEE    = "EMPLOYEE"
ROLE_CLIENT      = "CLIENT"

MANAGER_ROLES = {ROLE_SUPER_ADMIN, ROLE_EMPLOYER}


# ── Public API ────────────────────────────────────────────────────────────────

async def build_system_prompt(
    tenant_id: str,
    roles: list[str],
    user_id: Optional[str] = None,
) -> str:
    today = date.today().strftime("%d/%m/%Y")
    role_label = _primary_role(roles)

    try:
        erp_summary = await _fetch_erp_summary(tenant_id, roles, user_id)
    except Exception as exc:
        logger.warning("context_builder: DB summary failed: %s", exc)
        erp_summary = "(données ERP temporairement indisponibles)"

    return _PROMPT_TEMPLATE.format(
        today=today,
        role_label=role_label,
        erp_summary=erp_summary,
        instructions=_role_instructions(roles),
    )


# ── Role helpers ──────────────────────────────────────────────────────────────

def _primary_role(roles: list[str]) -> str:
    for r in (ROLE_SUPER_ADMIN, ROLE_EMPLOYER, ROLE_EMPLOYEE, ROLE_CLIENT):
        if r in roles:
            return r
    return "Utilisateur"


def _role_instructions(roles: list[str]) -> str:
    if any(r in roles for r in MANAGER_ROLES):
        return (
            "Tu as accès à toutes les données de l'entreprise. "
            "Pour toute question sur le chiffre d'affaires, les factures, le stock ou les devis, "
            "base-toi UNIQUEMENT sur les chiffres fournis dans la section ÉTAT ACTUEL DE L'ENTREPRISE ci-dessus. "
            "Si une période précise est demandée (semaine, mois, année), utilise les chiffres correspondants. "
            "Pour les factures impayées, liste celles présentes dans le contexte avec leurs références et montants. "
            "Pour le stock, indique les articles en alerte avec leurs quantités."
        )
    if ROLE_EMPLOYEE in roles:
        return (
            "Tu peux répondre sur : devis en cours, produits du catalogue, "
            "niveau de stock, commandes clients et livraisons. "
            "Base-toi sur les données du contexte pour répondre avec précision."
        )
    if ROLE_CLIENT in roles:
        return (
            "Tu peux répondre uniquement sur les devis et factures de CE CLIENT. "
            "Ne révèle aucune information sur d'autres clients."
        )
    return "Tu réponds aux questions générales sur le système ERP."


# ── Data fetchers ─────────────────────────────────────────────────────────────

async def _fetch_erp_summary(
    tenant_id: str,
    roles: list[str],
    user_id: Optional[str],
) -> str:
    if any(r in roles for r in MANAGER_ROLES):
        return await _manager_summary(tenant_id)
    if ROLE_EMPLOYEE in roles:
        return await _employee_summary(tenant_id, user_id)
    if ROLE_CLIENT in roles:
        return await _client_summary(tenant_id, user_id)
    return ""


async def _manager_summary(tenant_id: str) -> str:
    sections: list[str] = []

    async with db.connection(tenant_id) as conn:

        # ── 1. Chiffre d'affaires (encaissements réels) ──────────────────────
        try:
            ca = await conn.fetchrow(
                """
                SELECT
                  COALESCE(SUM(amount) FILTER (WHERE payment_date = CURRENT_DATE),          0)::numeric(14,2) AS ca_auj,
                  COALESCE(SUM(amount) FILTER (WHERE payment_date >= CURRENT_DATE - 6),      0)::numeric(14,2) AS ca_7j,
                  COALESCE(SUM(amount) FILTER (WHERE payment_date >= DATE_TRUNC('week',  CURRENT_DATE)), 0)::numeric(14,2) AS ca_semaine,
                  COALESCE(SUM(amount) FILTER (WHERE payment_date >= DATE_TRUNC('month', CURRENT_DATE)), 0)::numeric(14,2) AS ca_mois,
                  COALESCE(SUM(amount) FILTER (WHERE payment_date >= DATE_TRUNC('year',  CURRENT_DATE)), 0)::numeric(14,2) AS ca_annee,
                  COUNT(*)            FILTER (WHERE payment_date >= DATE_TRUNC('month', CURRENT_DATE))                     AS nb_enc_mois
                FROM encaissements
                WHERE tenant_id = $1::uuid
                """,
                tenant_id,
            )
            if ca:
                sections.append(
                    "## Chiffre d'affaires (encaissements reçus)\n"
                    f"- Aujourd'hui : {ca['ca_auj']} TND\n"
                    f"- 7 derniers jours : {ca['ca_7j']} TND\n"
                    f"- Semaine en cours : {ca['ca_semaine']} TND\n"
                    f"- Mois en cours : {ca['ca_mois']} TND ({ca['nb_enc_mois']} encaissements)\n"
                    f"- Année en cours : {ca['ca_annee']} TND"
                )
        except Exception as exc:
            logger.debug("CA from encaissements failed: %s", exc)

        # ── 2. Chiffre d'affaires facturé (factures émises) ──────────────────
        try:
            fac_ca = await conn.fetchrow(
                """
                SELECT
                  COALESCE(SUM(total_ttc) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW())), 0)::numeric(14,2) AS fa_mois,
                  COALESCE(SUM(total_ttc) FILTER (WHERE created_at >= DATE_TRUNC('year',  NOW())), 0)::numeric(14,2) AS fa_annee,
                  COUNT(*)              FILTER (WHERE created_at >= DATE_TRUNC('month', NOW()))                       AS nb_fac_mois
                FROM factures
                WHERE status IN ('EMISE','PARTIELLEMENT_PAYEE','PAYEE','EN_RETARD')
                  AND tenant_id = $1::uuid
                """,
                tenant_id,
            )
            if fac_ca and (fac_ca['fa_mois'] or fac_ca['fa_annee']):
                sections.append(
                    "## Chiffre d'affaires facturé\n"
                    f"- Mois en cours : {fac_ca['fa_mois']} TND ({fac_ca['nb_fac_mois']} factures)\n"
                    f"- Année en cours : {fac_ca['fa_annee']} TND"
                )
        except Exception as exc:
            logger.debug("Factures CA failed: %s", exc)

        # ── 3. Factures impayées (EMISE + EN_RETARD) ─────────────────────────
        try:
            unpaid = await conn.fetch(
                """
                SELECT f.reference,
                       c.name    AS client_name,
                       f.total_ttc::numeric(14,2) AS montant,
                       f.amount_paid::numeric(14,2) AS paye,
                       (f.total_ttc - COALESCE(f.amount_paid,0))::numeric(14,2) AS reste,
                       f.due_date,
                       f.status
                FROM factures f
                LEFT JOIN clients c ON c.id = f.client_id AND c.tenant_id = f.tenant_id
                WHERE f.status IN ('EMISE','EN_RETARD','PARTIELLEMENT_PAYEE')
                  AND f.tenant_id = $1::uuid
                ORDER BY f.status DESC, f.due_date ASC NULLS LAST
                LIMIT 15
                """,
                tenant_id,
            )
            if unpaid:
                total_reste = sum(float(r['reste']) for r in unpaid)
                en_retard   = [r for r in unpaid if r['status'] == 'EN_RETARD']
                lines = [
                    f"## Factures non encaissées ({len(unpaid)} — reste à recevoir : {total_reste:.2f} TND)",
                ]
                if en_retard:
                    lines.append(f"  ⚠️  {len(en_retard)} facture(s) EN RETARD")
                for r in unpaid:
                    ech = r['due_date'].strftime('%d/%m/%Y') if r['due_date'] else 'N/A'
                    tag = " [EN RETARD]" if r['status'] == 'EN_RETARD' else ""
                    lines.append(
                        f"  - {r['reference']} | {r['client_name'] or '?'} | "
                        f"Montant: {r['montant']} TND | Restant: {r['reste']} TND | Échéance: {ech}{tag}"
                    )
                sections.append("\n".join(lines))
        except Exception as exc:
            logger.debug("Unpaid invoices failed: %s", exc)

        # ── 4. Devis pipeline ─────────────────────────────────────────────────
        try:
            devis_rows = await conn.fetch(
                """
                SELECT d.reference, c.name AS client_name,
                       d.total_ttc::numeric(14,2) AS montant, d.status, d.valid_until
                FROM devis d
                LEFT JOIN clients c ON c.id = d.client_id AND c.tenant_id = d.tenant_id
                WHERE d.status IN ('BROUILLON','ENVOYE')
                  AND d.tenant_id = $1::uuid
                ORDER BY d.created_at DESC
                LIMIT 10
                """,
                tenant_id,
            )
            if devis_rows:
                total_pipe = sum(float(r['montant']) for r in devis_rows)
                lines = [f"## Devis en cours ({len(devis_rows)} — valeur pipeline : {total_pipe:.2f} TND)"]
                for r in devis_rows:
                    tag = " [ENVOYÉ]" if r['status'] == 'ENVOYE' else " [BROUILLON]"
                    lines.append(
                        f"  - {r['reference']} | {r['client_name'] or '?'} | {r['montant']} TND{tag}"
                    )
                sections.append("\n".join(lines))

            # Devis acceptés ce mois
            acc = await conn.fetchrow(
                """
                SELECT COUNT(*) AS nb,
                       COALESCE(SUM(total_ttc),0)::numeric(14,2) AS total
                FROM devis
                WHERE status = 'ACCEPTE'
                  AND created_at >= DATE_TRUNC('month', NOW())
                  AND tenant_id = $1::uuid
                """,
                tenant_id,
            )
            if acc and acc['nb']:
                sections.append(
                    f"## Devis acceptés ce mois\n"
                    f"- {acc['nb']} devis — valeur totale : {acc['total']} TND"
                )
        except Exception as exc:
            logger.debug("Devis pipeline failed: %s", exc)

        # ── 5. Commandes clients ──────────────────────────────────────────────
        try:
            cmd_row = await conn.fetchrow(
                """
                SELECT
                  COUNT(*) FILTER (WHERE status = 'EN_ATTENTE')  AS en_attente,
                  COUNT(*) FILTER (WHERE status = 'EN_COURS')    AS en_cours,
                  COUNT(*) FILTER (WHERE status = 'CONFIRMEE')   AS confirmees
                FROM commandes
                WHERE status NOT IN ('LIVREE','ANNULEE')
                  AND tenant_id = $1::uuid
                """,
                tenant_id,
            )
            if cmd_row and (cmd_row['en_attente'] or cmd_row['en_cours'] or cmd_row['confirmees']):
                sections.append(
                    f"## Commandes clients actives\n"
                    f"- En attente : {cmd_row['en_attente']}\n"
                    f"- Confirmées : {cmd_row['confirmees']}\n"
                    f"- En cours de traitement : {cmd_row['en_cours']}"
                )
        except Exception as exc:
            logger.debug("Commandes failed: %s", exc)

        # ── 6. Stock ──────────────────────────────────────────────────────────
        try:
            stock_rows = await conn.fetch(
                """
                SELECT product_reference,
                       COALESCE(product_name, product_reference) AS product_name,
                       quantity::numeric(10,2)     AS qty,
                       min_quantity::numeric(10,2) AS min_qty
                FROM stock_items
                WHERE quantity <= min_quantity AND min_quantity > 0
                  AND tenant_id = $1::uuid
                ORDER BY (quantity / NULLIF(min_quantity, 0)) ASC
                LIMIT 12
                """,
                tenant_id,
            )
            total_items = await conn.fetchval(
                "SELECT COUNT(*) FROM stock_items WHERE tenant_id = $1::uuid",
                tenant_id,
            )
            if stock_rows:
                lines = [
                    f"## Stock en alerte ({len(stock_rows)} référence(s) en dessous du seuil min — "
                    f"{total_items} références au total)"
                ]
                for r in stock_rows:
                    rupture = " [RUPTURE]" if float(r['qty']) == 0 else ""
                    lines.append(
                        f"  - {r['product_name']} ({r['product_reference']}): "
                        f"{r['qty']} unités (seuil min: {r['min_qty']}){rupture}"
                    )
                sections.append("\n".join(lines))
            elif total_items:
                sections.append(f"## Stock\n- {total_items} références — aucun article en alerte")
        except Exception as exc:
            logger.debug("Stock summary failed: %s", exc)

        # ── 7. CRM ────────────────────────────────────────────────────────────
        try:
            crm = await conn.fetchrow(
                """
                SELECT COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE type = 'PARTICULIER') AS particuliers,
                       COUNT(*) FILTER (WHERE active = TRUE)        AS actifs
                FROM clients
                WHERE tenant_id = $1::uuid
                """,
                tenant_id,
            )
            if crm:
                sections.append(
                    f"## CRM — Base clients\n"
                    f"- Total : {crm['total']} clients\n"
                    f"- Actifs : {crm['actifs']} | Particuliers : {crm['particuliers']}"
                )
        except Exception as exc:
            logger.debug("CRM summary failed: %s", exc)

    return "\n\n".join(sections) if sections else "Aucune donnée disponible pour ce tenant."


async def _employee_summary(tenant_id: str, user_id: Optional[str]) -> str:
    lines: list[str] = []
    async with db.connection(tenant_id) as conn:
        if user_id:
            try:
                row = await conn.fetchrow(
                    "SELECT COUNT(*) AS nb FROM devis "
                    "WHERE status IN ('BROUILLON','ENVOYE') AND created_by = $1::uuid AND tenant_id = $2::uuid",
                    user_id, tenant_id,
                )
                if row and row['nb']:
                    lines.append(f"Vos devis en cours : {row['nb']}")
            except Exception:
                pass

        try:
            row = await conn.fetchrow(
                "SELECT COUNT(*) AS nb FROM stock_items "
                "WHERE quantity <= min_quantity AND min_quantity > 0 AND tenant_id = $1::uuid",
                tenant_id,
            )
            if row and row['nb']:
                lines.append(f"Articles en stock critique : {row['nb']}")
        except Exception:
            pass

    return "\n".join(lines) if lines else "Aucune alerte en cours."


async def _client_summary(tenant_id: str, user_id: Optional[str]) -> str:
    if not user_id:
        return "Impossible de charger vos données (utilisateur non identifié)."
    lines: list[str] = []
    async with db.connection(tenant_id) as conn:
        try:
            row = await conn.fetchrow(
                "SELECT COUNT(*) AS nb, COALESCE(SUM(total_ttc),0)::numeric(14,2) AS total "
                "FROM devis WHERE status IN ('BROUILLON','ENVOYE') "
                "AND client_id = $1::uuid AND tenant_id = $2::uuid",
                user_id, tenant_id,
            )
            if row and row['nb']:
                lines.append(f"Vos devis en cours : {row['nb']} — {row['total']} TND")
        except Exception:
            pass

        try:
            row = await conn.fetchrow(
                "SELECT COUNT(*) AS nb, COALESCE(SUM(total_ttc),0)::numeric(14,2) AS total "
                "FROM factures WHERE status IN ('EMISE','EN_RETARD','PARTIELLEMENT_PAYEE') "
                "AND client_id = $1::uuid AND tenant_id = $2::uuid",
                user_id, tenant_id,
            )
            if row and row['nb']:
                lines.append(f"Vos factures impayées : {row['nb']} — {row['total']} TND")
        except Exception:
            pass

    return "\n".join(lines) if lines else "Aucune donnée pour votre compte."


# ── System prompt template ────────────────────────────────────────────────────

_PROMPT_TEMPLATE = """\
Tu es un assistant IA intelligent intégré dans le système ERP d'une entreprise de menuiserie aluminium en Tunisie (profilés aluminium, vitrages, fenêtres, portes, volets, stores).

Date d'aujourd'hui : {today}
Rôle de l'utilisateur : {role_label}

=== ÉTAT ACTUEL DE L'ENTREPRISE ===
{erp_summary}
===================================

{instructions}

=== RÈGLES DE COMPORTEMENT ===
1. Langue : réponds TOUJOURS dans la langue utilisée par l'utilisateur (français par défaut, arabe ou anglais si l'utilisateur écrit dans ces langues).
2. Salutations : réponds naturellement aux salutations (bonjour, salut, مرحبا, hello…) et propose ton aide en expliquant ce que tu peux faire.
3. Précision : utilise UNIQUEMENT les chiffres fournis dans la section ÉTAT ACTUEL. N'invente jamais de données.
4. Données absentes : si une information n'est pas dans le contexte, dis-le clairement et indique où la trouver dans l'ERP.
5. Monnaie : les montants sont en TND (Dinar Tunisien). La TVA est à 19%.
6. Confidentialité : ne révèle jamais de données d'un autre client ou tenant.
7. Format : pour les listes de factures ou de stock, présente les données de façon claire et structurée.
8. Calculs : tu peux faire des calculs (totaux, moyennes, pourcentages) à partir des données fournies.

=== CE QUE TU PEUX FAIRE ===
- Répondre aux questions sur le chiffre d'affaires (aujourd'hui, cette semaine, ce mois, cette année)
- Lister et analyser les factures non payées ou en retard
- Donner l'état du stock et signaler les ruptures
- Suivre les devis en cours et le pipeline commercial
- Analyser les commandes clients actives
- Répondre aux questions générales sur la menuiserie aluminium et les produits
- Expliquer les fonctionnalités de l'ERP
"""

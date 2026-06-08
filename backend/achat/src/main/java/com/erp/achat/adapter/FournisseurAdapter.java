package com.erp.achat.adapter;

import com.erp.achat.domain.Fournisseur;
import org.springframework.stereotype.Component;

/**
 * Adapter — convertit les données fournisseur issues d'un système externe
 * vers le modèle domaine interne Fournisseur, et vice-versa.
 *
 * Permet d'intégrer des flux EDI, CSV ou API tiers sans modifier le domaine.
 */
@Component
public class FournisseurAdapter {

    /** Externe → domaine interne */
    public Fournisseur toFournisseur(ExternalFournisseurData external) {
        return Fournisseur.builder()
                .code(external.supplierCode())
                .nom(external.companyName())
                .email(external.contactEmail())
                .telephone(external.phoneNumber())
                .adresse(external.streetAddress())
                .pays(external.country() != null ? external.country() : "MA")
                .ice(external.taxId())
                .rc(external.tradeRegisterNumber())
                .rib(external.bankAccountNumber())
                .delaiPaiementJours(external.paymentTermsDays())
                .actif(true)
                .build();
    }

    /** Domaine interne → format externe */
    public ExternalFournisseurData toExternal(Fournisseur fournisseur) {
        return new ExternalFournisseurData(
                fournisseur.getCode(),
                fournisseur.getNom(),
                fournisseur.getEmail(),
                fournisseur.getTelephone(),
                fournisseur.getAdresse(),
                fournisseur.getPays(),
                fournisseur.getIce(),
                fournisseur.getRc(),
                fournisseur.getRib(),
                fournisseur.getDelaiPaiementJours()
        );
    }
}

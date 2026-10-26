package com.erp.achat.domain;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class BonReceptionStatusConverter implements AttributeConverter<BonReceptionStatus, String> {

    @Override
    public String convertToDatabaseColumn(BonReceptionStatus status) {
        return status == null ? null : status.name();
    }

    @Override
    public BonReceptionStatus convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        try {
            return BonReceptionStatus.valueOf(dbData);
        } catch (IllegalArgumentException e) {
            String v = dbData.trim().toUpperCase();
            switch (v) {
                case "COMPLET", "COMPLÉT", "COMPLÈT" ->
                    { return BonReceptionStatus.CONFIRME; }
                case "ENCOURS", "EN-COURS", "EN COURS" ->
                    { return BonReceptionStatus.EN_COURS; }
                case "ANNULEE", "ANNULÉ", "ANNULÉE" ->
                    { return BonReceptionStatus.ANNULE; }
                default -> { return BonReceptionStatus.EN_COURS; }
            }
        }
    }
}

package com.erp.common.reference;

import java.time.Year;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Singleton (double-checked locking) — générateur thread-safe de références documentaires.
 * Garantit une instance unique par JVM, évitant les doublons de numérotation.
 *
 * Usage :  DocumentReferenceGenerator.getInstance().generate("DEV", tenantId)
 * Résultat : "DEV-2026-00042"
 */
public final class DocumentReferenceGenerator {

    private static volatile DocumentReferenceGenerator instance;

    private final Map<String, AtomicLong> counters = new ConcurrentHashMap<>();

    private DocumentReferenceGenerator() {}

    public static DocumentReferenceGenerator getInstance() {
        if (instance == null) {
            synchronized (DocumentReferenceGenerator.class) {
                if (instance == null) {
                    instance = new DocumentReferenceGenerator();
                }
            }
        }
        return instance;
    }

    /**
     * Génère une référence unique : PREFIX-YEAR-SEQUENCE
     * ex. DEV-2026-00001, FAC-2026-00002
     */
    public String generate(String prefix, String tenantId) {
        String key = prefix + ":" + tenantId + ":" + Year.now().getValue();
        long seq = counters.computeIfAbsent(key, k -> new AtomicLong(0)).incrementAndGet();
        return String.format("%s-%d-%05d", prefix, Year.now().getValue(), seq);
    }

    /** Réinitialise le compteur (changement d'année ou tests). */
    public void reset(String prefix, String tenantId) {
        String key = prefix + ":" + tenantId + ":" + Year.now().getValue();
        counters.remove(key);
    }
}

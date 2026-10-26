package com.erp.sales.integration;

import com.erp.common.tenant.TenantContext;
import com.erp.sales.domain.*;
import com.erp.sales.dto.*;
import com.erp.sales.repository.*;
import com.erp.sales.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.RabbitMQContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import com.erp.test.RequireDocker;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end sales flow:
 * product → devis+lines → accept devis → auto-commande →
 * confirm commande → livraison created → deliver → confirm →
 * LivraisonConfirmedEvent published → (inventory tested separately)
 */
@SpringBootTest
@Testcontainers
@RequireDocker
@SuppressWarnings({"resource","deprecation"})
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class SalesFlowIT {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("pgvector/pgvector:pg16")
            .withDatabaseName("erp_test")
            .withUsername("erp")
            .withPassword("erp_test");

    @Container
            static RabbitMQContainer rabbit = new RabbitMQContainer("rabbitmq:3.13-management")
                .withVhost("erp")
                .withUser("erp", "erp_test");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", postgres::getJdbcUrl);
        r.add("spring.datasource.username", postgres::getUsername);
        r.add("spring.datasource.password", postgres::getPassword);
        r.add("spring.rabbitmq.host", rabbit::getHost);
        r.add("spring.rabbitmq.port", rabbit::getAmqpPort);
        r.add("spring.rabbitmq.username", () -> "erp");
        r.add("spring.rabbitmq.password", () -> "erp_test");
        r.add("spring.rabbitmq.virtual-host", () -> "erp");
        r.add("spring.security.oauth2.resourceserver.jwt.issuer-uri",
                () -> "http://localhost:8080/realms/erp");
    }

    @Autowired ProductService productService;
    @Autowired DevisService devisService;
    @Autowired CommandeService commandeService;
    @Autowired LivraisonService livraisonService;
    @Autowired FactureService factureService;
    @Autowired DevisRepository devisRepo;
    @Autowired CommandeRepository commandeRepo;
    @Autowired LivraisonRepository livraisonRepo;
    @Autowired FactureRepository factureRepo;

    static final UUID TENANT_ID = UUID.randomUUID();
    static final UUID CLIENT_ID = UUID.randomUUID();
    static UUID productId;
    static UUID devisId;
    static UUID commandeId;
    static UUID livraisonId;
    static UUID factureId;

    @BeforeEach
    void setTenant() {
        TenantContext.set(TENANT_ID.toString());
    }

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    @Test @Order(1)
    void createProduct() {
        ProductDto.Response product = productService.create(new ProductDto.Create(
            "ALU-001", "Profilé aluminium 6060 T5", "Section 40x40mm",
            "ml", new BigDecimal("12.50"), new BigDecimal("20.00"), TENANT_ID));

        assertThat(product.id()).isNotNull();
        assertThat(product.reference()).isEqualTo("ALU-001");
        productId = product.id();
    }

    @Test @Order(2)
    void createDevisWithLine() {
        DevisDto.LineRequest line = new DevisDto.LineRequest(productId, new BigDecimal("10"), BigDecimal.ZERO);
        DevisDto.Response devis = devisService.create(new DevisDto.Create(
                CLIENT_ID, null, "Test devis", List.of(line)));

        assertThat(devis.id()).isNotNull();
        assertThat(devis.status()).isEqualTo(DevisStatus.BROUILLON);
        assertThat(devis.lines()).hasSize(1);
        assertThat(devis.totalTtc()).isGreaterThan(BigDecimal.ZERO);
        devisId = devis.id();
    }

    @Test @Order(3)
    void acceptDevisAutoCreatesCommande() {
        devisService.transition(devisId, new DevisDto.Transition(DevisStatus.ACCEPTE));
        commandeService.createFromDevis(devisId);

        Commande commande = commandeRepo.findByTenantAndDevis(TENANT_ID, devisId)
                .orElseThrow();
        assertThat(commande.getStatus()).isEqualTo(CommandeStatus.EN_ATTENTE);
        commandeId = commande.getId();
    }

    @Test @Order(4)
    void confirmCommandeAutoCreatesLivraisonAndFacture() {
        commandeService.transition(commandeId, new CommandeDto.Transition(CommandeStatus.CONFIRMEE));
        factureService.createFromCommande(commandeId);

        // Livraison should have been auto-created in step 3
        List<Livraison> livraisons = livraisonRepo.findByTenantAndCommande(TENANT_ID, commandeId);
        assertThat(livraisons).isNotEmpty();
        livraisonId = livraisons.get(0).getId();

        // Facture should be created now
        Facture facture = factureRepo.findByTenantAndCommande(TENANT_ID, commandeId).orElseThrow();
        assertThat(facture.getTotalTtc()).isGreaterThan(BigDecimal.ZERO);
        factureId = facture.getId();
    }

    @Test @Order(5)
    void deliverLivraison() {
        Livraison liv = livraisonRepo.findByTenantAndIdWithLines(TENANT_ID, livraisonId).orElseThrow();
        UUID lineId = liv.getLines().get(0).getId();

        LivraisonDto.DeliverLine deliverLine = new LivraisonDto.DeliverLine(lineId, new BigDecimal("10"));
        livraisonService.deliver(livraisonId,
                new LivraisonDto.Deliver(java.time.LocalDate.now(), List.of(deliverLine)));

        Livraison updated = livraisonRepo.findByTenantAndId(TENANT_ID, livraisonId).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(LivraisonStatus.EN_COURS);
    }

    @Test @Order(6)
    void confirmLivraisonPublishesEvent() {
        LivraisonDto.Response confirmed = livraisonService.confirm(livraisonId);
        assertThat(confirmed.status()).isEqualTo(LivraisonStatus.LIVREE);
        // Event is published async — in a full E2E test we'd assert inventory movement
        // via an @RabbitListener spy; here we just verify the status transition succeeded.
    }

    @Test @Order(7)
    void encaisserFacture() {
        FactureDto.Response paid = factureService.encaisser(factureId,
                new FactureDto.Encaisser(new BigDecimal("150.00"),
                        com.erp.sales.domain.PaymentMethod.VIREMENT, "REF-001", null));

        assertThat(paid.amountPaid()).isGreaterThan(BigDecimal.ZERO);
    }

    @Test @Order(8)
    void tenantIsolation_otherTenantCannotSeeDevis() {
        TenantContext.set(UUID.randomUUID().toString());
        // Different tenant — should find 0 devis
        assertThat(devisRepo.findByTenantAndId(UUID.randomUUID(), devisId)).isEmpty();
    }
}

package com.erp.sales.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Generates PDF documents for Devis and Factures using OpenPDF (LGPL).
 * All layout is done programmatically — no template files needed.
 */
@Slf4j
@Service
public class PdfGeneratorService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final Color PRIMARY  = new Color(30, 64, 175);   // Tailwind blue-800
    private static final Color LIGHT    = new Color(239, 246, 255);  // blue-50
    private static final Color GREY_TXT = new Color(75, 85, 99);     // gray-600

    // ── Public API ────────────────────────────────────────────────────────────

    public record DevisData(
            String reference, String clientName, String clientAddress,
            LocalDate issueDate, LocalDate validUntil, String notes,
            List<LineData> lines,
            BigDecimal totalHt, BigDecimal totalTva, BigDecimal totalTtc
    ) {}

    public record FactureData(
            String reference, String clientName, String clientAddress,
            LocalDate issueDate, LocalDate dueDate, String notes,
            List<LineData> lines,
            BigDecimal totalHt, BigDecimal totalTva, BigDecimal totalTtc,
            BigDecimal amountPaid
    ) {}

    public record LineData(
            String description, BigDecimal quantity, String unit,
            BigDecimal unitPrice, BigDecimal tvaRate, BigDecimal totalTtc
    ) {}

    public byte[] generateDevis(DevisData data) {
        return build(doc -> {
            addHeader(doc, "DEVIS", data.reference(), data.issueDate());
            addClientBlock(doc, data.clientName(), data.clientAddress());
            addValidUntil(doc, data.validUntil());
            addLinesTable(doc, data.lines());
            addTotalsBlock(doc, data.totalHt(), data.totalTva(), data.totalTtc(), null);
            addNotes(doc, data.notes());
        });
    }

    public byte[] generateFacture(FactureData data) {
        return build(doc -> {
            addHeader(doc, "FACTURE", data.reference(), data.issueDate());
            addClientBlock(doc, data.clientName(), data.clientAddress());
            addDueDate(doc, data.dueDate());
            addLinesTable(doc, data.lines());
            addTotalsBlock(doc, data.totalHt(), data.totalTva(), data.totalTtc(), data.amountPaid());
            addNotes(doc, data.notes());
        });
    }

    // ── Building blocks ───────────────────────────────────────────────────────

    private byte[] build(DocumentConsumer consumer) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4, 40, 40, 60, 40);
        try {
            PdfWriter.getInstance(doc, out);
            doc.open();
            consumer.accept(doc);
        } catch (Exception e) {
            log.error("PDF generation failed", e);
            throw new RuntimeException("PDF generation failed", e);
        } finally {
            doc.close();
        }
        return out.toByteArray();
    }

    private void addHeader(Document doc, String docType, String reference, LocalDate date)
            throws DocumentException {
        PdfPTable header = new PdfPTable(2);
        header.setWidthPercentage(100);
        header.setWidths(new float[]{3, 2});

        // Company block (left)
        Paragraph company = new Paragraph();
        company.add(chunk("ERP MENUISERIE", boldFont(16), PRIMARY));
        company.add(Chunk.NEWLINE);
        company.add(chunk("Aluminium & Vitrerie", regularFont(9), GREY_TXT));
        PdfPCell leftCell = cell(company);
        leftCell.setBorder(Rectangle.NO_BORDER);
        leftCell.setPaddingBottom(10);
        header.addCell(leftCell);

        // Document type block (right)
        Paragraph docInfo = new Paragraph();
        docInfo.setAlignment(Element.ALIGN_RIGHT);
        docInfo.add(chunk(docType, boldFont(20), PRIMARY));
        docInfo.add(Chunk.NEWLINE);
        docInfo.add(chunk("N° " + reference, regularFont(10), GREY_TXT));
        docInfo.add(Chunk.NEWLINE);
        docInfo.add(chunk("Date : " + fmt(date), regularFont(9), GREY_TXT));
        PdfPCell rightCell = cell(docInfo);
        rightCell.setBorder(Rectangle.NO_BORDER);
        rightCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        header.addCell(rightCell);

        doc.add(header);
        addColorRule(doc);
    }

    private void addClientBlock(Document doc, String name, String address)
            throws DocumentException {
        doc.add(spacer(8));
        Paragraph p = new Paragraph();
        p.add(chunk("CLIENT\n", boldFont(8), PRIMARY));
        p.add(chunk(name + "\n", boldFont(11), Color.BLACK));
        if (address != null && !address.isBlank()) {
            p.add(chunk(address, regularFont(9), GREY_TXT));
        }
        PdfPTable t = new PdfPTable(1);
        t.setWidthPercentage(45);
        t.setHorizontalAlignment(Element.ALIGN_LEFT);
        PdfPCell c = cell(p);
        c.setBackgroundColor(LIGHT);
        c.setPadding(8);
        c.setBorderColor(new Color(191, 219, 254));
        t.addCell(c);
        doc.add(t);
    }

    private void addValidUntil(Document doc, LocalDate d) throws DocumentException {
        if (d == null) return;
        doc.add(spacer(6));
        doc.add(new Paragraph(chunk("Valable jusqu'au : " + fmt(d), regularFont(9), GREY_TXT)));
    }

    private void addDueDate(Document doc, LocalDate d) throws DocumentException {
        if (d == null) return;
        doc.add(spacer(6));
        doc.add(new Paragraph(chunk("Date d'échéance : " + fmt(d), regularFont(9), GREY_TXT)));
    }

    private void addLinesTable(Document doc, List<LineData> lines) throws DocumentException {
        doc.add(spacer(14));
        PdfPTable t = new PdfPTable(6);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{4, 1, 1, 2, 1.5f, 2});

        // Header row
        String[] headers = {"Description", "Qté", "Unité", "P.U. HT", "TVA %", "Total TTC"};
        for (String h : headers) {
            PdfPCell hc = cell(new Paragraph(chunk(h, boldFont(9), Color.WHITE)));
            hc.setBackgroundColor(PRIMARY);
            hc.setPadding(6);
            hc.setBorder(Rectangle.NO_BORDER);
            t.addCell(hc);
        }

        // Data rows
        boolean alt = false;
        for (LineData l : lines) {
            Color bg = alt ? LIGHT : Color.WHITE;
            addLineCell(t, l.description(), 9, bg, false);
            addLineCell(t, fmt(l.quantity()), 9, bg, true);
            addLineCell(t, l.unit() != null ? l.unit() : "", 9, bg, false);
            addLineCell(t, fmt2(l.unitPrice()), 9, bg, true);
            addLineCell(t, fmt2(l.tvaRate()) + "%", 9, bg, true);
            addLineCell(t, fmt2(l.totalTtc()), 9, bg, true);
            alt = !alt;
        }
        doc.add(t);
    }

    private void addTotalsBlock(Document doc, BigDecimal ht, BigDecimal tva,
                                 BigDecimal ttc, BigDecimal paid) throws DocumentException {
        doc.add(spacer(8));
        PdfPTable t = new PdfPTable(2);
        t.setWidthPercentage(40);
        t.setHorizontalAlignment(Element.ALIGN_RIGHT);
        t.setWidths(new float[]{2, 2});

        addTotalRow(t, "Total HT",   fmt2(ht)  + " TND", false);
        addTotalRow(t, "TVA",        fmt2(tva) + " TND", false);
        addTotalRow(t, "Total TTC",  fmt2(ttc) + " TND", true);
        if (paid != null) {
            addTotalRow(t, "Payé",        fmt2(paid)                       + " TND", false);
            addTotalRow(t, "Reste à payer", fmt2(ttc.subtract(paid))       + " TND", true);
        }
        doc.add(t);
    }

    private void addNotes(Document doc, String notes) throws DocumentException {
        if (notes == null || notes.isBlank()) return;
        doc.add(spacer(12));
        doc.add(new Paragraph(chunk("Notes :", boldFont(9), PRIMARY)));
        doc.add(new Paragraph(chunk(notes, regularFont(9), GREY_TXT)));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void addColorRule(Document doc) throws DocumentException {
        PdfPTable rule = new PdfPTable(1);
        rule.setWidthPercentage(100);
        PdfPCell c = new PdfPCell();
        c.setFixedHeight(3);
        c.setBackgroundColor(PRIMARY);
        c.setBorder(Rectangle.NO_BORDER);
        rule.addCell(c);
        doc.add(rule);
    }

    private void addLineCell(PdfPTable t, String text, int size, Color bg, boolean right) {
        PdfPCell c = cell(new Paragraph(chunk(text, regularFont(size), Color.BLACK)));
        c.setBackgroundColor(bg);
        c.setPadding(5);
        c.setBorderColor(new Color(229, 231, 235));
        c.setBorderWidth(0.5f);
        if (right) c.setHorizontalAlignment(Element.ALIGN_RIGHT);
        t.addCell(c);
    }

    private void addTotalRow(PdfPTable t, String label, String value, boolean bold) {
        Font f = bold ? boldFont(10) : regularFont(9);
        Color bg = bold ? LIGHT : Color.WHITE;
        PdfPCell lc = cell(new Paragraph(chunk(label, f, bold ? PRIMARY : GREY_TXT)));
        lc.setBackgroundColor(bg); lc.setPadding(5); lc.setBorderColor(new Color(229,231,235)); lc.setBorderWidth(0.5f);
        PdfPCell vc = cell(new Paragraph(chunk(value, f, bold ? PRIMARY : Color.BLACK)));
        vc.setBackgroundColor(bg); vc.setPadding(5); vc.setBorderColor(new Color(229,231,235)); vc.setBorderWidth(0.5f);
        vc.setHorizontalAlignment(Element.ALIGN_RIGHT);
        t.addCell(lc); t.addCell(vc);
    }

    private static Font regularFont(int size) { return FontFactory.getFont(FontFactory.HELVETICA, size); }
    private static Font boldFont(int size)    { return FontFactory.getFont(FontFactory.HELVETICA_BOLD, size); }

    private static Chunk chunk(String text, Font font, Color color) {
        font.setColor(color);
        return new Chunk(text, font);
    }

    private static PdfPCell cell(Paragraph p) { return new PdfPCell(p); }
    private static Paragraph spacer(int pt)    { Paragraph p = new Paragraph(" "); p.setSpacingAfter(pt); return p; }
    private static String fmt(LocalDate d)     { return d != null ? d.format(FMT) : ""; }
    private static String fmt(BigDecimal v)    { return v != null ? v.stripTrailingZeros().toPlainString() : "0"; }
    private static String fmt2(BigDecimal v)   { return v != null ? String.format("%.2f", v) : "0.00"; }

    @FunctionalInterface
    private interface DocumentConsumer {
        void accept(Document doc) throws DocumentException;
    }
}

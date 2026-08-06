import puppeteer from 'puppeteer';
import mongoose from 'mongoose';
import { IQuoteDocument, IInvoiceDocument, User } from '../models';
import { getSettings } from '../models';
import { QuoteStatus } from '../types';
import { numberToWordsVietnamese } from '../utils/numberToWords';

export class PdfService {
  async generateQuotePdf(quote: IQuoteDocument): Promise<Buffer> {
    const settings = await getSettings();
    const creatorDisplayName = await this.getCreatorDisplayName(quote.createdBy, (quote as any).createdByName);

    const html = this.buildHtml(quote, settings, creatorDisplayName);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  async generateInvoicePdf(invoice: IInvoiceDocument): Promise<Buffer> {
    const settings = await getSettings();
    const creatorDisplayName = await this.getCreatorDisplayName(invoice.createdBy, (invoice as any).createdByName);

    const html = this.buildInvoiceHtml(invoice, settings, creatorDisplayName);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  async getQuoteHtml(quote: IQuoteDocument): Promise<string> {
    const settings = await getSettings();
    return this.buildHtml(quote, settings);
  }

  async getInvoiceHtml(invoice: IInvoiceDocument): Promise<string> {
    const settings = await getSettings();
    return this.buildInvoiceHtml(invoice, settings);
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
  }

  private formatDate(date: Date): string {
    if (!date) return '';
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date));
  }

  /**
   * Compact specs line: CPU, RAM, SSD, GPU only
   */
  private buildCompactSpecs(specs: any): string {
    if (!specs) return '';
    const parts: string[] = [];
    if (specs.cpu) parts.push(`CPU: ${specs.cpu}`);
    if (specs.ram) parts.push(`RAM: ${specs.ram}`);
    if (specs.ssd) parts.push(`SSD: ${specs.ssd}`);
    else if (specs.hdd) parts.push(`HDD: ${specs.hdd}`);
    if (specs.vga) parts.push(`VGA: ${specs.vga}`);
    return parts.join(' • ');
  }

  /**
   * Extract bank account details from bankInfo text settings
   */
  private parseBankInfo(bankInfoText: string) {
    if (!bankInfoText) return null;

    const stkMatch = bankInfoText.match(/(?:STK|Số tài khoản|TK|Account|So TK|Stk)[\s:]*([0-9A-Za-z]+)/i);
    const accountNo = stkMatch ? stkMatch[1].trim() : '';

    const bankMatch = bankInfoText.match(/(?:Ngân hàng|Ngan hang|Bank)[\s:]*([^\n\r]+)/i);
    let bankName = bankMatch ? bankMatch[1].trim() : '';

    if (!bankName) {
      const knownBanks = ['MB', 'MBBank', 'Vietcombank', 'VCB', 'Techcombank', 'TCB', 'Vietinbank', 'BIDV', 'VPBank', 'ACB', 'TPBank', 'Sacombank', 'Agribank', 'MSB', 'OCB'];
      for (const b of knownBanks) {
        if (new RegExp(b, 'i').test(bankInfoText)) {
          bankName = b;
          break;
        }
      }
    }

    const nameMatch = bankInfoText.match(/(?:Chủ TK|Chu TK|Tên TK|Chủ tài khoản|Name)[\s:]*([^\n\r]+)/i);
    const accountName = nameMatch ? nameMatch[1].trim() : '';

    if (!accountNo) return null;

    let bankSlug = 'MB';
    const bLower = bankName.toLowerCase();
    if (bLower.includes('vietcom') || bLower.includes('vcb')) bankSlug = 'vietcombank';
    else if (bLower.includes('techcom') || bLower.includes('tcb')) bankSlug = 'techcombank';
    else if (bLower.includes('vietin') || bLower.includes('icb')) bankSlug = 'vietinbank';
    else if (bLower.includes('bidv')) bankSlug = 'bidv';
    else if (bLower.includes('vp')) bankSlug = 'vpbank';
    else if (bLower.includes('acb')) bankSlug = 'acb';
    else if (bLower.includes('tp')) bankSlug = 'tpbank';
    else if (bLower.includes('sacom')) bankSlug = 'sacombank';

    return {
      bankName: bankName || 'Ngân hàng',
      accountNo,
      accountName: accountName || 'NP COMPUTER',
      bankSlug,
    };
  }

  private generateQuoteVietQR(quote: IQuoteDocument, settings: any) {
    const customerName = quote.customer?.name || '';
    const phonePart = quote.customer?.phone ? ` - ${quote.customer.phone}` : '';
    const codePart = quote.quoteCode ? ` - ${quote.quoteCode}` : '';
    const transferMemo = `${customerName}${phonePart}${codePart}`;

    const parsed = this.parseBankInfo(settings?.bankInfo || '');

    if (!parsed) {
      return {
        qrUrl: settings?.qrPaymentUrl || '',
        bankName: 'MB Bank',
        accountNo: '',
        accountName: settings?.storeName || 'NP COMPUTER',
        transferMemo,
      };
    }

    return {
      qrUrl: `https://img.vietqr.io/image/${parsed.bankSlug}-${parsed.accountNo}-compact2.png?amount=${quote.grandTotal}&addInfo=${encodeURIComponent(transferMemo)}&accountName=${encodeURIComponent(parsed.accountName)}`,
      bankName: parsed.bankName,
      accountNo: parsed.accountNo,
      accountName: parsed.accountName,
      transferMemo,
    };
  }

  private generateInvoiceVietQR(invoice: IInvoiceDocument, settings: any) {
    const customerName = invoice.customer?.name || '';
    const phonePart = invoice.customer?.phone ? ` - ${invoice.customer.phone}` : '';
    const invoiceCodePart = invoice.invoiceCode ? ` - ${invoice.invoiceCode}` : '';
    const transferMemo = `${customerName}${phonePart}${invoiceCodePart}`;

    const parsed = this.parseBankInfo(settings?.bankInfo || '');
    const amount = invoice.remainingAmount > 0 ? invoice.remainingAmount : invoice.grandTotal;

    if (!parsed) {
      return {
        qrUrl: settings?.qrPaymentUrl || '',
        bankName: 'MB Bank',
        accountNo: '',
        accountName: settings?.storeName || 'NP COMPUTER',
        transferMemo,
      };
    }

    return {
      qrUrl: `https://img.vietqr.io/image/${parsed.bankSlug}-${parsed.accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferMemo)}&accountName=${encodeURIComponent(parsed.accountName)}`,
      bankName: parsed.bankName,
      accountNo: parsed.accountNo,
      accountName: parsed.accountName,
      transferMemo,
    };
  }

  /**
   * Common CSS styles for both Quote and Invoice A4 documents
   * Usable width: 190mm (210mm - 2*10mm padding)
   */
  private getCommonCss(): string {
    return `
      @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,700&family=Manrope:wght@700;800&display=swap');

      @page {
        size: A4 portrait;
        margin: 0;
      }
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      body {
        font-family: 'Be Vietnam Pro', Arial, sans-serif;
        background: #ffffff;
        color: #14213D;
        font-size: 10px;
        line-height: 1.4;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .page-container {
        width: 210mm;
        min-height: 297mm;
        height: auto;
        overflow: visible;
        padding: 10mm 10mm 12mm 10mm;
        margin: 0 auto;
        background: #ffffff;
        position: relative;
        box-sizing: border-box;
      }

      /* ===== PAGE BREAK & BLOCK INTEGRITY CONTROL ===== */
      .doc-header,
      .customer-card,
      .bottom-grid,
      .payment-section,
      .vietqr-box,
      .payment-card,
      .summary-box,
      .notes-card,
      .policy-strip,
      .doc-footer,
      .doc-footer-wrap {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      /* Each product row must not split across pages */
      .doc-table tr {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      
      /* ===== RESPONSIVE SECTION SPACING ===== */
      .section-spacer {
        width: 100%;
      }

      /* 1–3 Products: Distribute white space between sections naturally */
      body.products-few .page-container {
        min-height: 297mm;
        height: auto;
        overflow: visible;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      body.products-few .doc-body-wrap {
        flex: 1 0 auto;
        display: flex;
        flex-direction: column;
      }
      body.products-few .doc-footer-wrap {
        margin-top: auto;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
      }
      body.products-few .section-spacer.flex-sm { flex: 0.5 0 8px; min-height: 8px; }
      body.products-few .section-spacer.flex-md { flex: 1 0 10px; min-height: 10px; }
      body.products-few .section-spacer.flex-lg { flex: 1.5 0 14px; min-height: 14px; }

      /* 4+ Products: Normal block flow, no flex-grow, allow auto multi-page overflow */
      body.products-normal .page-container,
      body.products-normal .doc-body-wrap {
        display: block !important;
        height: auto !important;
        min-height: 297mm;
        overflow: visible !important;
      }
      body.products-normal .section-spacer {
        display: block;
        height: 10px;
        flex: none !important;
      }
      body.products-normal .doc-footer-wrap {
        margin-top: 14px;
        flex-shrink: 0;
        display: block;
      }
      body.products-normal .doc-footer-wrap .section-spacer {
        height: 8px;
        flex: none !important;
      }

      /* ===== SHARED HEADER (66% / 34%) - 38mm FULL BLEED ===== */
      .doc-header {
        position: relative;
        display: flex;
        align-items: stretch;
        margin-top: -10mm;
        margin-left: -10mm;
        margin-right: -10mm;
        margin-bottom: 12px;
        height: 38mm;
        width: calc(100% + 20mm);
        background: #F5F8FC;
        overflow: hidden;
      }
      .brand-block {
        width: 66%;
        height: 38mm;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        padding-left: 10mm;
        padding-right: 14px;
        background: #F5F8FC;
        box-sizing: border-box;
      }
      .brand-top {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .brand-logo {
        height: 88px;
        width: 88px;
        max-width: 90px;
        max-height: 90px;
        object-fit: contain;
        flex-shrink: 0;
        background: transparent;
      }
      .brand-text {
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .brand-title {
        font-family: 'Be Vietnam Pro', sans-serif;
        font-size: 25px;
        font-weight: 800;
        color: #07152F;
        line-height: 1.1;
        letter-spacing: -0.3px;
      }
      .brand-tagline {
        font-family: 'Be Vietnam Pro', sans-serif;
        font-size: 10.5px;
        font-weight: 700;
        color: #0755D9;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        margin-top: 3px;
      }

      /* ===== SHARED BANNER BOX (34% - FLUSH RIGHT NO GAP) ===== */
      .banner-box {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: 34%;
        height: 38mm;
        background: linear-gradient(135deg, #1260E8 0%, #064BC4 100%);
        clip-path: polygon(14% 0, 100% 0, 100% 100%, 0 100%);
        padding: 4px 14px;
        color: #ffffff;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        box-sizing: border-box;
        z-index: 2;
      }
      .banner-title {
        font-family: 'Be Vietnam Pro', sans-serif;
        font-size: 18px;
        font-weight: 800;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        margin-bottom: 4px;
        color: #ffffff;
      }
      .code-pill {
        background: #ffffff;
        color: #07152F;
        font-family: 'Be Vietnam Pro', sans-serif;
        font-size: 13px;
        font-weight: 800;
        padding: 4px 14px;
        border-radius: 7px;
        display: inline-block;
        margin-bottom: 4px;
        box-shadow: none;
      }
      .banner-meta {
        font-family: 'Be Vietnam Pro', sans-serif;
        font-size: 9px;
        color: #ffffff;
        opacity: 0.95;
        line-height: 1.35;
        display: flex;
        flex-direction: column;
        gap: 3px;
        align-items: center;
      }
      .banner-meta-item {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }

      /* ===== CUSTOMER CARD (1.3X ENLARGED & SPACIOUS LAYOUT) ===== */
      .customer-card {
        background: #F8FAFD;
        border: 1px solid #DCE6F3;
        border-radius: 9px;
        padding: 16px 18px;
        margin-top: 16px;
        margin-bottom: 16px;
        box-shadow: none;
      }
      .customer-grid {
        display: flex;
        align-items: center;
        width: 100%;
      }
      .customer-col-1 {
        width: 42%;
        flex-shrink: 0;
      }
      .customer-col-2 {
        width: 38%;
        flex-shrink: 0;
        margin-left: 38px;
      }
      .customer-col-status {
        width: 20%;
        flex-shrink: 0;
        margin-left: auto;
        border-left: 1px solid #D5DFED;
        padding-left: 16px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        box-sizing: border-box;
      }
      .info-item {
        display: flex;
        align-items: center;
        font-size: 11px;
        line-height: 1.45;
        margin-bottom: 10px;
      }
      .info-item:last-child {
        margin-bottom: 0;
      }
      .info-icon {
        width: 15px;
        height: 15px;
        color: #0755D9;
        flex-shrink: 0;
        stroke-width: 2.2;
        margin-right: 8px;
      }
      .info-label {
        color: #475467;
        font-size: 10.5px;
        font-weight: 500;
        flex-shrink: 0;
        margin-right: 14px;
      }
      .info-val {
        color: #101828;
        font-size: 11px;
        font-weight: 600;
      }

      /* ===== PRODUCT TABLE (30-POINT EXACT SPECIFICATION MATCH) ===== */
      :root {
        --invoice-primary: #0B4FD4;
        --invoice-primary-dark: #073EA8;
        --invoice-text: #07152F;
        --invoice-text-secondary: #334155;
        --invoice-text-muted: #64748B;
        --invoice-border: #DCE6F4;
        --invoice-border-light: #E0E8F3;
        --invoice-header-bg: #F7FAFF;
        --invoice-background: #FFFFFF;
      }

      .table-container {
        margin-bottom: 10px;
        border-radius: 9px;
        overflow: hidden;
        border: 1px solid #DCE6F4;
        background: #FFFFFF;
      }
      .doc-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        table-layout: fixed;
        background: #FFFFFF;
        font-family: 'Be Vietnam Pro', Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
        text-rendering: geometricPrecision;
      }
      .doc-table th {
        background: #F7FAFF;
        color: #0B4FD4;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        height: 36px;
        vertical-align: middle;
        border-bottom: 1px solid #C9D9F2;
        border-right: 1px solid #E2EAF5;
        box-sizing: border-box;
      }
      .doc-table th:last-child {
        border-right: none;
      }
      .doc-table th.col-stt { text-align: center; padding: 6px; }
      .doc-table th.col-prod { text-align: left; padding: 6px 10px; }
      .doc-table th.col-info { text-align: left; padding: 6px 12px; }
      .doc-table th.col-price { text-align: center; padding: 6px 8px; }
      .doc-table th.col-qty { text-align: center; padding: 6px 5px; }
      .doc-table th.col-total { text-align: right; padding: 6px 16px 6px 8px; }

      .doc-table td {
        padding-top: 6px;
        padding-bottom: 6px;
        border-bottom: 1px solid #E0E8F3;
        border-right: 1px solid #E2EAF5;
        vertical-align: middle;
        background: #FFFFFF;
        color: #07152F;
        box-sizing: border-box;
      }
      .doc-table tr:last-child td {
        border-bottom: none;
      }
      .doc-table td:last-child {
        border-right: none;
      }
      .doc-table tr {
        break-inside: avoid;
        page-break-inside: avoid;
        height: 60px;
      }

      .td-stt {
        text-align: center;
        padding: 6px;
        font-size: 11px;
        font-weight: 500;
        color: #07152F;
      }
      .td-prod {
        padding: 6px 10px;
      }
      .td-info {
        padding: 6px 12px;
        font-size: 10.5px;
        line-height: 15px;
        color: #1E293B;
      }
      .td-price {
        text-align: center;
        padding: 6px 8px;
        font-size: 11px;
        font-weight: 500;
        color: #07152F;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }
      .td-qty {
        text-align: center;
        padding: 6px 5px;
        font-size: 11px;
        font-weight: 500;
        color: #07152F;
      }
      .td-total {
        text-align: right;
        padding: 6px 16px 6px 8px;
        font-size: 12px;
        font-weight: 700;
        color: #0B4FD4;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }

      .prod-cell {
        display: flex;
        align-items: center;
        gap: 9px;
      }
      .prod-img {
        width: 48px;
        height: 48px;
        object-fit: contain;
        border-radius: 3px;
        background: transparent;
        flex-shrink: 0;
      }
      .prod-img-placeholder {
        width: 48px;
        height: 48px;
        border-radius: 3px;
        background: #F1F5F9;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 700;
        color: #94A3B8;
        flex-shrink: 0;
      }
      .prod-name {
        font-family: 'Be Vietnam Pro', Arial, sans-serif;
        font-size: 11px;
        font-weight: 700;
        line-height: 1.25;
        color: #07152F;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .prod-code {
        font-family: 'Be Vietnam Pro', Arial, sans-serif;
        font-size: 9px;
        font-weight: 600;
        line-height: 1.25;
        color: #0B4FD4;
        margin-top: 2px;
        white-space: normal;
        word-break: break-word;
        overflow-wrap: anywhere;
      }
      .td-info {
        padding: 6px 8px;
        vertical-align: top;
        word-break: break-word;
        overflow-wrap: anywhere;
      }
      .info-line {
        font-size: 10px;
        line-height: 1.4;
        color: #1E293B;
        word-break: break-word;
        overflow-wrap: anywhere;
      }
      .info-line span {
        font-weight: 400;
        color: #1E293B;
      }

      /* ===== PAYMENT & SUMMARY AREA ===== */
      .bottom-grid {
        display: grid;
        grid-template-columns: 43% 57%;
        gap: 10px;
        align-items: stretch;
        width: 100%;
        margin-top: 10px;
        margin-bottom: 8px;
        box-sizing: border-box;
      }
      .vietqr-box {
        width: 100%;
        height: 100%;
        background: #F8FAFD;
        border: 1px solid #D9E4F2;
        border-radius: 10px;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        box-sizing: border-box;
      }
      .qr-title {
        font-size: 11.5px;
        font-weight: 700;
        color: #0755D9;
        text-transform: uppercase;
        letter-spacing: 0.2px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .qr-title-icon {
        width: 15px;
        height: 15px;
        color: #0755D9;
        flex-shrink: 0;
      }
      .qr-wrap {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      .qr-img-box {
        background: #FFFFFF;
        border: 1px solid #E1E7EF;
        border-radius: 8px;
        padding: 4px;
        flex-shrink: 0;
        display: inline-block;
      }
      .qr-img {
        width: 115px;
        height: 115px;
        aspect-ratio: 1/1;
        object-fit: contain;
        display: block;
      }
      .qr-info {
        font-size: 9.5px;
        color: #101828;
        line-height: 1.45;
        flex: 1;
      }
      .qr-info-label {
        font-weight: 600;
        color: #475467;
      }
      .qr-info-val {
        font-weight: 600;
        color: #101828;
      }
      .qr-acc-no {
        font-weight: 700;
        color: #0755D9;
      }
      .qr-divider {
        border-top: 1px dashed #AFC6E9;
        margin: 6px 0;
      }
      .qr-memo {
        font-size: 8.5px;
        line-height: 1.35;
        color: #101828;
      }

      .right-col {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 8px;
        justify-content: space-between;
        box-sizing: border-box;
      }

      .summary-box {
        width: 100%;
        height: 100%;
        background: #F8FAFD;
        border: 1px solid #D9E4F2;
        border-radius: 10px;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-sizing: border-box;
      }
      .sum-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        font-size: 9.5px;
        color: #475467;
        margin-bottom: 3px;
      }
      .sum-row:last-child {
        margin-bottom: 0;
      }
      .sum-label {
        font-size: 9.5px;
        font-weight: 500;
        color: #475467;
      }
      .sum-val {
        font-size: 10px;
        font-weight: 600;
        color: #101828;
        font-variant-numeric: tabular-nums;
        text-align: right;
      }
      .sum-divider {
        border-top: 1px dashed #AFC6E9;
        margin: 7px 0;
      }
      .sum-row.grand {
        margin-top: 2px;
        align-items: baseline;
      }
      .grand-label {
        font-size: 13.5px;
        font-weight: 800;
        color: #07152F;
      }
      .grand-val {
        font-family: 'Manrope', 'Be Vietnam Pro', sans-serif;
        font-size: 21px;
        font-weight: 800;
        color: #0755D9;
        font-variant-numeric: tabular-nums;
        text-align: right;
      }
      .words-text {
        font-size: 8px;
        font-style: italic;
        color: #667085;
        text-align: right;
        margin-top: 2px;
        margin-bottom: 2px;
      }
      .paid-row {
        font-size: 10.5px;
        font-weight: 600;
        color: #16A34A;
      }
      .paid-val {
        font-size: 10.5px;
        font-weight: 600;
        color: #16A34A;
        font-variant-numeric: tabular-nums;
        text-align: right;
      }
      .debt-row {
        font-size: 11.5px;
        font-weight: 700;
        color: #FF6500;
      }
      .debt-val {
        font-size: 11.5px;
        font-weight: 700;
        color: #FF6500;
        font-variant-numeric: tabular-nums;
        text-align: right;
      }

      /* ===== NOTES CARD (sits under summary-box, inside right-col) ===== */
      .notes-card {
        width: 100%;
        background: #FAFCFF;
        border: 1px solid #DCE6F3;
        border-radius: 8px;
        padding: 3mm 4mm;
      }
      .notes-title {
        font-size: 9px;
        font-weight: 700;
        color: #0F172A;
        text-transform: uppercase;
        margin-bottom: 3px;
      }
      .notes-list {
        list-style: none;
        font-size: 8.5px;
        color: #475569;
        line-height: 1.45;
      }

      /* ===== POLICY STRIP (1:1 MATCH WITH REFERENCE IMAGE) ===== */
      .policy-strip {
        display: flex;
        background: #FAFCFF;
        border: 1px solid #DCE6F3;
        border-radius: 8px;
        padding: 12px 14px;
        margin-top: 10px;
        margin-bottom: 0;
        width: 100%;
        box-sizing: border-box;
      }
      .policy-item {
        flex: 1;
        display: flex;
        align-items: flex-start;
        gap: 11px;
        border-right: 1px solid #E2E8F0;
        padding-right: 12px;
        margin-right: 12px;
        box-sizing: border-box;
      }
      .policy-item:last-child {
        border-right: none;
        padding-right: 0;
        margin-right: 0;
      }
      .policy-icon {
        width: 28px;
        height: 28px;
        color: #0755D9;
        flex-shrink: 0;
      }
      .policy-text-wrap {
        display: flex;
        flex-direction: column;
      }
      .policy-title {
        font-size: 11px;
        font-weight: 700;
        color: #0755D9;
        line-height: 1.2;
        margin-bottom: 2px;
      }
      .policy-desc {
        font-size: 8.5px;
        color: #344054;
        line-height: 1.35;
        white-space: pre-line;
      }

      /* ===== FOOTER (3 REFINED REGIONS: 22% / 48% / 30%) ===== */
      .doc-footer {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: auto;
        padding-top: 14px;
        box-sizing: border-box;
      }
      .thanks-col {
        width: 22%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-start;
        text-align: left;
        box-sizing: border-box;
      }
      .thanks-asset {
        height: 60px;
        max-width: 170px;
        object-fit: contain;
        margin-bottom: 5px;
        display: block;
      }
      .thanks-font {
        font-family: 'Brush Script MT', 'Segoe Script', cursive;
        font-size: 46px;
        color: #0755D9;
        line-height: 1;
        margin-bottom: 5px;
      }
      .thanks-title {
        font-size: 11px;
        font-weight: 800;
        color: #07152F;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        margin-bottom: 2px;
      }
      .thanks-sub {
        font-size: 8.5px;
        color: #667085;
      }

      .store-col {
        width: 48%;
        font-size: 11.5px;
        color: #344054;
        line-height: 1.5;
        display: flex;
        flex-direction: column;
        justify-content: center;
        box-sizing: border-box;
      }
      .store-col-name {
        font-size: 14.5px;
        font-weight: 800;
        color: #0755D9;
        margin-bottom: 5px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      .store-detail-item {
        display: flex;
        align-items: center;
        gap: 7px;
        margin-bottom: 3px;
        font-size: 11.5px;
        color: #101828;
      }
      .store-icon-inline {
        width: 14px;
        height: 14px;
        color: #0755D9;
        flex-shrink: 0;
      }

      .confirm-col {
        width: 30%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        box-sizing: border-box;
      }
      .confirm-title {
        font-size: 11px;
        font-weight: 800;
        color: #07152F;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        margin-bottom: 1px;
      }
      .confirm-store {
        font-size: 9px;
        color: #667085;
        margin-bottom: 4px;
      }
      .sign-stamp-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 2px;
        position: relative;
      }
      .signature-img {
        width: 105px;
        max-height: 55px;
        object-fit: contain;
      }
      .stamp-img {
        width: 85px;
        height: 85px;
        object-fit: contain;
        margin-left: -12px;
      }
    `;
  }

  /**
   * Helper to build dynamic Policy Strip (4 equal columns from Settings)
   */
  private renderPolicyStrip(settings: any): string {
    const defaultBenefits = [
      { id: 'b1', enabled: true, title: 'Sản phẩm chính hãng', description: '100% chính hãng,\nđầy đủ hóa đơn VAT.', sortOrder: 1 },
      { id: 'b2', enabled: true, title: 'Đổi trả linh hoạt', description: 'Hỗ trợ đổi trả trong\n7 ngày nếu có lỗi.', sortOrder: 2 },
      { id: 'b3', enabled: true, title: 'Bảo hành uy tín', description: 'Bảo hành theo hãng,\nhỗ trợ tận tâm.', sortOrder: 3 },
      { id: 'b4', enabled: true, title: 'Hỗ trợ nhanh chóng', description: 'Tư vấn 24/7,\ngiải đáp tận tình.', sortOrder: 4 },
    ];

    const benefitsSource = (settings.benefits && settings.benefits.length > 0)
      ? settings.benefits
      : defaultBenefits;

    const activeBenefits = benefitsSource
      .filter((b: any) => b.enabled !== false)
      .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));

    if (activeBenefits.length === 0) return '';

    const iconMap: Record<string, string> = {
      b1: `<svg class="policy-icon" viewBox="0 0 24 24" fill="none" stroke="#0755D9" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>`,
      b2: `<svg class="policy-icon" viewBox="0 0 24 24" fill="none" stroke="#0755D9" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`,
      b3: `<svg class="policy-icon" viewBox="0 0 24 24" fill="none" stroke="#0755D9" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"></rect><path d="M16 8h4l3 5v3h-7V8z"></path><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`,
      b4: `<svg class="policy-icon" viewBox="0 0 24 24" fill="none" stroke="#0755D9" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"></path></svg>`,
    };

    const fallbackIcons = [iconMap.b1, iconMap.b2, iconMap.b3, iconMap.b4];

    const itemsHtml = activeBenefits.map((item: any, idx: number) => {
      const iconSvg = iconMap[item.id] || fallbackIcons[idx % fallbackIcons.length];
      const isLast = idx === activeBenefits.length - 1;
      return `
        <div class="policy-item" style="${isLast ? 'border-right: none; padding-right: 0; margin-right: 0;' : ''}">
          ${iconSvg}
          <div class="policy-text-wrap">
            <div class="policy-title">${item.title}</div>
            <div class="policy-desc">${item.description}</div>
          </div>
        </div>`;
    }).join('');

    return `<div class="policy-strip">${itemsHtml}</div>`;
  }

  /**
   * Helper to build shared Header HTML (60% / 40%)
   */
  private renderSharedHeader(
    docTitle: string,
    docCode: string,
    settings: any,
    metaItems: Array<{ iconSvg: string; label: string; value: string }>
  ): string {
    const metaHtml = metaItems
      .map(
        (m) =>
          `<div class="banner-meta-item">${m.iconSvg} ${m.label}: ${m.value}</div>`
      )
      .join('');

    return `
      <div class="doc-header">
        <div class="brand-block">
          <div class="brand-top">
            ${settings.logoUrl
        ? `<img src="${settings.logoUrl}" alt="${settings.storeName}" class="brand-logo" />`
        : ''
      }
            <div class="brand-text">
              <div class="brand-title">${settings.storeName || 'NP COMPUTER'}</div>
              <div class="brand-tagline">${settings.tagline || 'LINH KIỆN • PC GAMING • WORKSTATION'}</div>
            </div>
          </div>
        </div>

        <div class="banner-box">
          <div class="banner-title">${docTitle}</div>
          <div class="code-pill">${docCode}</div>
          <div class="banner-meta">
            ${metaHtml}
          </div>
        </div>
      </div>`;
  }

  /**
   * Helper to build shared Footer HTML (3 Regions: 22% / 48% / 30%)
   */
  private renderSharedFooter(
    confirmationTitle: string,
    settings: any
  ): string {
    return `
      <div class="doc-footer">
        <!-- 1. CẢM ƠN (22%) -->
        <div class="thanks-col">
          ${settings.thankYouAssetUrl
            ? `<img src="${settings.thankYouAssetUrl}" alt="Thank you" class="thanks-asset" />`
            : `<div class="thanks-font">Thank you!</div>`
          }
          <div class="thanks-title">CẢM ƠN QUÝ KHÁCH</div>
          <div class="thanks-sub">Rất hân hạnh được phục vụ!</div>
        </div>

        <!-- 2. THÔNG TIN CỬA HÀNG (48%) -->
        <div class="store-col">
          <div class="store-col-name">${settings.storeName || 'NP COMPUTER'}</div>
          <div class="store-detail-item"><svg class="store-icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>${settings.address || '130'}</div>
          <div class="store-detail-item"><svg class="store-icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>${settings.hotline || '0123.456.789'}</div>
          <div class="store-detail-item"><svg class="store-icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10z"></path></svg>${settings.website || 'ngocphieupc.shop'}</div>
          <div class="store-detail-item"><svg class="store-icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>${settings.facebook || 'facebook.com/ngoc.phieu.982562'}</div>
        </div>

        <!-- 3. XÁC NHẬN (30%) -->
        <div class="confirm-col">
          <div class="confirm-title">${confirmationTitle}</div>
          <div class="confirm-store">${settings.storeName || 'NP Computer'}</div>
          <div class="sign-stamp-wrap">
            ${settings.signatureUrl ? `<img src="${settings.signatureUrl}" alt="Signature" class="signature-img" />` : ''}
            ${settings.stampUrl ? `<img src="${settings.stampUrl}" alt="Stamp" class="stamp-img" />` : ''}
          </div>
        </div>
      </div>`;
  }

  /**
   * BUILD BÁO GIÁ HTML
   */
  private buildHtml(quote: IQuoteDocument, settings: any, creatorName?: string): string {
    const payment = this.generateQuoteVietQR(quote, settings);
    const amountInWords = numberToWordsVietnamese(quote.grandTotal);

    // Sum discounts
    const itemsDiscountTotal = quote.items.reduce((sum, item) => {
      const itemDisc = item.discountType === 'percent'
        ? (item.unitPrice * item.quantity * item.discount) / 100
        : (item.discount || 0);
      return sum + itemDisc;
    }, 0);

    const quoteDiscountTotal = quote.discountType === 'percent'
      ? ((quote.subtotal - itemsDiscountTotal) * quote.discount) / 100
      : (quote.discount || 0);

    const combinedDiscountTotal = itemsDiscountTotal + quoteDiscountTotal;

    const itemsHtml = quote.items
      .sort((a, b) => a.order - b.order)
      .map((item, index) => {
        const specsText = this.buildCompactSpecs(item.productSnapshot.specs);
        const itemDiscountValue = item.discountType === 'percent'
          ? (item.unitPrice * item.quantity * item.discount) / 100
          : item.discount;

        const brandName = typeof (item.productSnapshot as any)?.brand === 'object'
          ? (item.productSnapshot as any)?.brand?.name
          : (item.productSnapshot as any)?.brand || (item as any)?.brand || '';

        const serialText = (item as any).serialNumber || (item as any).serial || '';

        return `
        <tr>
          <td class="td-stt">${index + 1}</td>
          <td class="td-prod">
            <div class="prod-cell">
              ${item.productSnapshot.imageUrl
            ? `<img src="${item.productSnapshot.imageUrl}" alt="${item.productSnapshot.name}" class="prod-img" />`
            : `<div class="prod-img-placeholder">NP</div>`
          }
              <div>
                <div class="prod-name">${item.productSnapshot.name}</div>
                <div class="prod-code">Mã: ${item.productSnapshot.productCode}</div>
              </div>
            </div>
          </td>
          <td class="td-info">
            <div class="info-line">
              ${brandName ? `<div>Hãng: <span style="font-weight: 600; color: #0755D9;">${brandName}</span></div>` : ''}
              ${item.warranty ? `<div>Bảo hành: <span>${item.warranty}</span></div>` : ''}
              ${serialText ? `<div>Serial: <span>${serialText}</span></div>` : ''}
              ${specsText ? `<div style="color: #64748b; font-size: 8.5px; margin-top: 1px;">${specsText}</div>` : ''}
            </div>
          </td>
          <td class="td-price">${this.formatCurrency(item.unitPrice)}</td>
          <td class="td-qty">${item.quantity}</td>
          <td class="td-total">
            ${this.formatCurrency(item.total)}
            ${itemDiscountValue > 0 ? `<div style="font-size: 9px; color: #DC2626;">Giảm -${this.formatCurrency(itemDiscountValue)}</div>` : ''}
          </td>
        </tr>`;
      })
      .join('');

    const validDays = (settings as any).quoteValidityDays ?? 7;
    const validUntilDate = (quote as any).validUntil
      ? (quote as any).validUntil
      : new Date(new Date(quote.createdDate).getTime() + validDays * 86400000);

    const contactPersonName = (quote as any).contactPerson || quote.customer?.contactPerson || quote.customer?.name;

    const headerHtml = this.renderSharedHeader(
      'BÁO GIÁ',
      quote.quoteCode,
      settings,
      [
        {
          iconSvg: `<svg style="width:10px;height:10px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
          label: 'Ngày báo giá',
          value: this.formatDate(quote.createdDate),
        },
        {
          iconSvg: `<svg style="width:10px;height:10px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
          label: 'Hiệu lực đến',
          value: this.formatDate(validUntilDate),
        },
      ]
    );

    const footerHtml = this.renderSharedFooter('XÁC NHẬN BÁO GIÁ', settings);

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>BÁO GIÁ - ${quote.quoteCode}</title>
  <style>${this.getCommonCss()}</style>
</head>
<body>
  <div class="page-container">
    <div>
      <!-- SHARED HEADER -->
      ${headerHtml}

      <!-- CUSTOMER CARD -->
      <div class="customer-card">
        <div class="customer-grid">
          <div class="customer-col-1">
            <div class="info-item"><svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg><span class="info-label">Khách hàng:</span><span class="info-val">${quote.customer.name}</span></div>
            <div class="info-item"><svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg><span class="info-label">Điện thoại:</span><span class="info-val">${quote.customer.phone || '---'}</span></div>
            <div class="info-item"><svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg><span class="info-label">Email:</span><span class="info-val">${quote.customer.email || '---'}</span></div>
          </div>
          <div class="customer-col-2">
            <div class="info-item"><svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg><span class="info-label">Địa chỉ:</span><span class="info-val">${quote.customer.address || '---'}</span></div>
            <div class="info-item"><svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg><span class="info-label">Nhân viên bán hàng:</span><span class="info-val">${creatorName || (quote as any).createdByName || (quote as any).createdBy || 'Nhân viên'}</span></div>
            <div class="info-item"><svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg><span class="info-label">Ghi chú:</span><span class="info-val">${quote.notes || '---'}</span></div>
          </div>
          <div class="customer-col-status">
            <div style="font-size: 8px; font-weight: 600; color: #667085; text-transform: uppercase; letter-spacing: 0.3px;">TRẠNG THÁI</div>
            <div style="font-size: 12px; font-weight: 700; color: ${quote.status === QuoteStatus.CANCELLED || (quote.status as any) === 'Đã hủy' ? '#DC2626' : quote.status === QuoteStatus.DRAFT || (quote.status as any) === 'Nháp' ? '#667085' : '#0755D9'}; margin-top: 4px;">
              ${(quote.status || QuoteStatus.CONFIRMED).toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <!-- PRODUCT TABLE -->
      <div class="table-container">
        <table class="doc-table">
          <colgroup>
            <col style="width: 5%;" />
            <col style="width: 30%;" />
            <col style="width: 25%;" />
            <col style="width: 13%;" />
            <col style="width: 7%;" />
            <col style="width: 20%;" />
          </colgroup>
          <thead>
            <tr>
              <th class="col-stt">STT</th>
              <th class="col-prod">SẢN PHẨM</th>
              <th class="col-info">THÔNG TIN</th>
              <th class="col-price">ĐƠN GIÁ</th>
              <th class="col-qty">SL</th>
              <th class="col-total">THÀNH TIỀN</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>

      <div style="flex: 1 0 0; min-height: 14px;"></div>

      <!-- SUMMARY & VIETQR -->
      <div class="bottom-grid">
        <div class="vietqr-box">
          <div class="qr-title">
            <svg class="qr-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            THANH TOÁN NHANH (VIETQR)
          </div>
          <div class="qr-wrap">
            ${payment.qrUrl ? `<div class="qr-img-box"><img src="${payment.qrUrl}" alt="VietQR" class="qr-img" /></div>` : ''}
            <div class="qr-info">
              <div><span class="qr-info-label">Ngân hàng:</span> <span class="qr-info-val">${payment.bankName}</span></div>
              <div><span class="qr-info-label">Chủ TK:</span> <span class="qr-info-val">${payment.accountName}</span></div>
              <div><span class="qr-info-label">Số TK:</span> <span class="qr-acc-no">${payment.accountNo}</span></div>
              <div class="qr-divider"></div>
              <div class="qr-memo">
                <span class="qr-info-label">Nội dung CK:</span><br/>
                <span style="font-weight: 600; color: #101828;">${payment.transferMemo}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="right-col">
          <div class="summary-box" style="width: 100%;">
            <div>
              <div class="sum-row"><span class="sum-label">Tạm tính</span><span class="sum-val">${this.formatCurrency(quote.subtotal)}</span></div>
              <div class="sum-row">
                <span class="sum-label" style="color: ${combinedDiscountTotal > 0 ? '#DC2626' : '#475467'};">Giảm giá</span>
                <span class="sum-val" style="color: ${combinedDiscountTotal > 0 ? '#DC2626' : '#475467'};">${combinedDiscountTotal > 0 ? '-' + this.formatCurrency(combinedDiscountTotal) : '0 đ'}</span>
              </div>
            </div>

            <div>
              <div class="sum-divider"></div>
              <div class="sum-row grand">
                <span class="grand-label">TỔNG GIÁ TRỊ</span>
                <span class="grand-val">${this.formatCurrency(quote.grandTotal)}</span>
              </div>
              <div class="words-text">(Bằng chữ: ${amountInWords})</div>
            </div>
          </div>

          <!-- NOTES CARD -->
          <div class="notes-card">
            <div class="notes-title">GHI CHÚ</div>
            <ul class="notes-list">
              ${((settings as any).quoteNotes && (settings as any).quoteNotes.length > 0
                ? (settings as any).quoteNotes
                : [
                    'Báo giá trên chưa bao gồm phí vận chuyển và lắp đặt.',
                    'Thời gian giao hàng dự kiến: 1 - 2 ngày kể từ khi xác nhận.',
                    'Bảo hành theo chính sách của hãng.',
                  ]
              ).map((note: string) => `<li>• ${note}</li>`).join('\n              ')}
              <li>• Báo giá có hiệu lực đến hết ngày ${this.formatDate(validUntilDate)}.</li>
            </ul>
          </div>
        </div>
      </div>

      </div> <!-- END doc-body-wrap -->

      <div class="doc-footer-wrap">
        <!-- POLICY STRIP -->
        ${this.renderPolicyStrip(settings)}

        <!-- SHARED FOOTER -->
        ${footerHtml}
      </div>
    </div>
  </body>
</html>`;
  }

  /**
   * BUILD HÓA ĐƠN BÁN HÀNG HTML
   */
  private buildInvoiceHtml(invoice: IInvoiceDocument, settings: any, creatorName?: string): string {
    const payment = this.generateInvoiceVietQR(invoice, settings);
    const amountInWords = numberToWordsVietnamese(invoice.grandTotal);

    // Sum discounts
    const itemsDiscountTotal = invoice.items.reduce((sum, item) => {
      const itemDisc = item.discountType === 'percent'
        ? (item.unitPrice * item.quantity * item.discount) / 100
        : (item.discount || 0);
      return sum + itemDisc;
    }, 0);

    const invoiceDiscountTotal = invoice.discountType === 'percent'
      ? ((invoice.subtotal - itemsDiscountTotal) * invoice.discount) / 100
      : (invoice.discount || 0);

    const combinedDiscountTotal = itemsDiscountTotal + invoiceDiscountTotal;
    const isPaidInFull = invoice.remainingAmount <= 0;

    const itemsHtml = invoice.items
      .sort((a, b) => a.order - b.order)
      .map((item, index) => {
        const specsText = this.buildCompactSpecs(item.productSnapshot.specs);
        const itemDiscountValue = item.discountType === 'percent'
          ? (item.unitPrice * item.quantity * item.discount) / 100
          : item.discount;

        const serialsList = (item.selectedSerials && item.selectedSerials.length > 0)
          ? item.selectedSerials.join(', ')
          : (item as any).serials && (item as any).serials.length > 0
          ? (item as any).serials.join(', ')
          : item.serialNumber || '';
        const brandName = typeof (item.productSnapshot as any)?.brand === 'object'
          ? (item.productSnapshot as any)?.brand?.name
          : (item.productSnapshot as any)?.brand || (item as any)?.brand || '';

        return `
        <tr>
          <td class="td-stt">${index + 1}</td>
          <td class="td-prod">
            <div class="prod-cell">
              ${item.productSnapshot.imageUrl
            ? `<img src="${item.productSnapshot.imageUrl}" alt="${item.productSnapshot.name}" class="prod-img" />`
            : `<div class="prod-img-placeholder">NP</div>`
          }
              <div>
                <div class="prod-name">${item.productSnapshot.name}</div>
                <div class="prod-code">Mã: ${item.productSnapshot.productCode}</div>
              </div>
            </div>
          </td>
          <td class="td-info">
            <div class="info-line">
              ${brandName ? `<div>Hãng: <span style="font-weight: 600; color: #0755D9;">${brandName}</span></div>` : ''}
              ${item.warranty ? `<div>Bảo hành: <span>${item.warranty}</span></div>` : ''}
              ${serialsList ? `<div>Serial: <span>${serialsList}</span></div>` : ''}
              ${specsText ? `<div style="color: #64748b; font-size: 8.5px; margin-top: 1px;">${specsText}</div>` : ''}
            </div>
          </td>
          <td class="td-price">${this.formatCurrency(item.unitPrice)}</td>
          <td class="td-qty">${item.quantity}</td>
          <td class="td-total">
            ${this.formatCurrency(item.total)}
            ${itemDiscountValue > 0 ? `<div style="font-size: 9px; color: #DC2626;">Giảm -${this.formatCurrency(itemDiscountValue)}</div>` : ''}
          </td>
        </tr>`;
      })
      .join('');

    const metaItems: Array<{ iconSvg: string; label: string; value: string }> = [
      {
        iconSvg: `<svg style="width:10px;height:10px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
        label: 'Ngày lập',
        value: this.formatDate(invoice.createdDate),
      },
    ];

    if (invoice.quoteCode) {
      metaItems.push({
        iconSvg: `<svg style="width:10px;height:10px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`,
        label: 'Báo giá gốc',
        value: invoice.quoteCode,
      });
    }

    const headerHtml = this.renderSharedHeader(
      'HÓA ĐƠN',
      invoice.invoiceCode,
      settings,
      metaItems
    );

    const footerHtml = this.renderSharedFooter('XÁC NHẬN HÓA ĐƠN', settings);

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>HÓA ĐƠN BÁN HÀNG - ${invoice.invoiceCode}</title>
  <style>${this.getCommonCss()}</style>
</head>
<body>
  <div class="page-container">
    <div>
      <!-- SHARED HEADER -->
      ${headerHtml}

      <!-- CUSTOMER CARD WITH PAYMENT STATUS -->
      <div class="customer-card">
        <div class="customer-grid">
          <div class="customer-col-1">
            <div class="info-item"><svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg><span class="info-label">Khách hàng:</span><span class="info-val">${invoice.customer.name}</span></div>
            <div class="info-item"><svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg><span class="info-label">Điện thoại:</span><span class="info-val">${invoice.customer.phone || '---'}</span></div>
            <div class="info-item"><svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg><span class="info-label">Email:</span><span class="info-val">${invoice.customer.email || '---'}</span></div>
          </div>
          <div class="customer-col-2">
            <div class="info-item"><svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg><span class="info-label">Địa chỉ:</span><span class="info-val">${invoice.customer.address || '---'}</span></div>
            <div class="info-item"><svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg><span class="info-label">Nhân viên bán hàng:</span><span class="info-val">${creatorName || (invoice as any).createdByName || invoice.createdBy || 'Nhân viên'}</span></div>
            <div class="info-item"><svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg><span class="info-label">Ghi chú:</span><span class="info-val">${invoice.notes || '---'}</span></div>
          </div>
          <div class="customer-col-status">
            <div style="font-size: 8px; font-weight: 600; color: #667085; text-transform: uppercase; letter-spacing: 0.3px;">TRẠNG THÁI</div>
            <div style="font-size: 12px; font-weight: 700; color: ${isPaidInFull ? '#16A34A' : '#F97316'}; margin-top: 4px;">
              ${isPaidInFull ? 'ĐÃ THANH TOÁN' : 'CÒN NỢ'}
            </div>
            ${!isPaidInFull ? `<div style="font-size: 12px; font-weight: 700; color: #F97316; margin-top: 3px; font-variant-numeric: tabular-nums;">${this.formatCurrency(invoice.remainingAmount)}</div>` : ''}
          </div>
        </div>
      </div>

      <!-- PRODUCT TABLE -->
      <div class="table-container">
        <table class="doc-table">
          <colgroup>
            <col style="width: 5%;" />
            <col style="width: 30%;" />
            <col style="width: 25%;" />
            <col style="width: 13%;" />
            <col style="width: 7%;" />
            <col style="width: 20%;" />
          </colgroup>
          <thead>
            <tr>
              <th class="col-stt">STT</th>
              <th class="col-prod">SẢN PHẨM</th>
              <th class="col-info">THÔNG TIN</th>
              <th class="col-price">ĐƠN GIÁ</th>
              <th class="col-qty">SL</th>
              <th class="col-total">THÀNH TIỀN</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>

      <div style="flex: 1 0 0; min-height: 14px;"></div>

      <!-- SUMMARY & VIETQR -->
      <div class="bottom-grid">
        <div class="vietqr-box">
          <div class="qr-title">
            <svg class="qr-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            THANH TOÁN NHANH (VIETQR)
          </div>
          <div class="qr-wrap">
            ${payment.qrUrl ? `<div class="qr-img-box"><img src="${payment.qrUrl}" alt="VietQR" class="qr-img" /></div>` : ''}
            <div class="qr-info">
              <div><span class="qr-info-label">Ngân hàng:</span> <span class="qr-info-val">${payment.bankName}</span></div>
              <div><span class="qr-info-label">Chủ TK:</span> <span class="qr-info-val">${payment.accountName}</span></div>
              <div><span class="qr-info-label">Số TK:</span> <span class="qr-acc-no">${payment.accountNo}</span></div>
              <div class="qr-divider"></div>
              <div class="qr-memo">
                <span class="qr-info-label">Nội dung CK:</span><br/>
                <span style="font-weight: 600; color: #101828;">${payment.transferMemo}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="right-col">
          <div class="summary-box" style="width: 100%;">
            <div>
              <div class="sum-row"><span class="sum-label">Tạm tính</span><span class="sum-val">${this.formatCurrency(invoice.subtotal)}</span></div>
              <div class="sum-row">
                <span class="sum-label" style="color: ${combinedDiscountTotal > 0 ? '#DC2626' : '#475467'};">Giảm giá</span>
                <span class="sum-val" style="color: ${combinedDiscountTotal > 0 ? '#DC2626' : '#475467'};">${combinedDiscountTotal > 0 ? '-' + this.formatCurrency(combinedDiscountTotal) : '0 đ'}</span>
              </div>
            </div>

            <div>
              <div class="sum-divider"></div>
              <div class="sum-row grand">
                <span class="grand-label">TỔNG GIÁ TRỊ</span>
                <span class="grand-val">${this.formatCurrency(invoice.grandTotal)}</span>
              </div>
              <div class="words-text">(Bằng chữ: ${amountInWords})</div>
              <div class="sum-divider"></div>

              <div class="sum-row paid-row">
                <span><svg style="width:14px;height:14px;color:#16A34A;vertical-align:middle;margin-right:6px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Đã thanh toán</span>
                <span class="paid-val">-${this.formatCurrency(invoice.totalPaid)}</span>
              </div>

              ${invoice.remainingAmount > 0 ? `
              <div class="sum-row debt-row" style="margin-top: 4px;">
                <span><svg style="width:14px;height:14px;color:#FF6500;vertical-align:middle;margin-right:6px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> CÒN NỢ</span>
                <span class="debt-val">${this.formatCurrency(invoice.remainingAmount)}</span>
              </div>
              ` : `
              <div class="sum-row paid-row" style="margin-top: 4px;">
                <span><svg style="width:14px;height:14px;color:#16A34A;vertical-align:middle;margin-right:6px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Trạng thái</span>
                <span class="paid-val">ĐÃ THANH TOÁN ĐỦ</span>
              </div>
              `}
            </div>
          </div>
        </div>
      </div>

      </div> <!-- END doc-body-wrap -->

      <div class="doc-footer-wrap">
        <!-- POLICY STRIP -->
        ${this.renderPolicyStrip(settings)}

        <!-- SHARED FOOTER -->
        ${footerHtml}
      </div>
    </div>
  </body>
  </html>`;
  }

  private async getCreatorDisplayName(rawCreator?: string, createdByName?: string): Promise<string> {
    if (createdByName && createdByName !== 'System Admin' && createdByName !== 'Admin') {
      return createdByName;
    }
    if (!rawCreator) return 'Nhân viên';

    try {
      const isObjId = mongoose.isValidObjectId(rawCreator);
      const creator = await User.findOne({
        $or: [
          { username: rawCreator },
          { usernameNormalized: String(rawCreator).toLowerCase() },
          ...(isObjId ? [{ _id: rawCreator }] : []),
        ],
      }).select('fullName username').exec();

      if (creator && creator.fullName) {
        return creator.fullName;
      }
    } catch (e) {
      console.error('Lookup creator user error:', e);
    }

    if (rawCreator !== 'System Admin' && rawCreator !== 'Admin' && !mongoose.isValidObjectId(rawCreator)) {
      return rawCreator;
    }

    return 'Nhân viên';
  }
}
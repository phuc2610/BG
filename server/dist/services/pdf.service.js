"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfService = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const models_1 = require("../models");
class PdfService {
    async generateQuotePdf(quote) {
        const settings = await (0, models_1.getSettings)();
        const html = this.buildHtml(quote, settings);
        const browser = await puppeteer_1.default.launch({
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
        }
        finally {
            await browser.close();
        }
    }
    async generateInvoicePdf(invoice) {
        const settings = await (0, models_1.getSettings)();
        const html = this.buildInvoiceHtml(invoice, settings);
        const browser = await puppeteer_1.default.launch({
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
        }
        finally {
            await browser.close();
        }
    }
    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
    }
    formatDate(date) {
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(new Date(date));
    }
    /**
     * Compact specs line: CPU, RAM, SSD, GPU only
     */
    buildCompactSpecs(specs) {
        if (!specs)
            return '';
        const parts = [];
        if (specs.cpu)
            parts.push(`CPU: ${specs.cpu}`);
        if (specs.ram)
            parts.push(`RAM: ${specs.ram}`);
        if (specs.ssd)
            parts.push(`SSD: ${specs.ssd}`);
        else if (specs.hdd)
            parts.push(`HDD: ${specs.hdd}`);
        if (specs.vga)
            parts.push(`VGA: ${specs.vga}`);
        return parts.join(' • ');
    }
    /**
     * Extract bank account details from bankInfo text settings
     */
    parseBankInfo(bankInfoText) {
        if (!bankInfoText)
            return null;
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
        if (!accountNo)
            return null;
        let bankSlug = 'MB';
        const bLower = bankName.toLowerCase();
        if (bLower.includes('vietcom') || bLower.includes('vcb'))
            bankSlug = 'vietcombank';
        else if (bLower.includes('techcom') || bLower.includes('tcb'))
            bankSlug = 'techcombank';
        else if (bLower.includes('vietin') || bLower.includes('icb'))
            bankSlug = 'vietinbank';
        else if (bLower.includes('bidv'))
            bankSlug = 'bidv';
        else if (bLower.includes('vpbank') || bLower.includes('vpb'))
            bankSlug = 'vpbank';
        else if (bLower.includes('acb'))
            bankSlug = 'acb';
        else if (bLower.includes('tpbank') || bLower.includes('tpb'))
            bankSlug = 'tpbank';
        else if (bLower.includes('sacom') || bLower.includes('stb'))
            bankSlug = 'sacombank';
        else if (bLower.includes('agri') || bLower.includes('vba'))
            bankSlug = 'agribank';
        else if (bLower.includes('msb'))
            bankSlug = 'msb';
        else if (bLower.includes('ocb'))
            bankSlug = 'ocb';
        else if (bLower.includes('mb'))
            bankSlug = 'MB';
        return {
            bankSlug,
            bankName: bankName || 'MB Bank',
            accountNo,
            accountName,
        };
    }
    generateVietQR(quote, settings) {
        const customerName = quote.customer?.name || '';
        const phonePart = quote.customer?.phone ? ` - ${quote.customer.phone}` : '';
        const quoteCodePart = quote.quoteCode ? ` - ${quote.quoteCode}` : '';
        const transferMemo = `${customerName}${phonePart}${quoteCodePart}`;
        const parsed = this.parseBankInfo(settings?.bankInfo || '');
        if (!parsed) {
            return {
                qrUrl: settings?.qrPaymentUrl || '',
                bankName: 'Ngân hàng',
                accountNo: '',
                accountName: '',
                transferMemo,
            };
        }
        const amount = quote.grandTotal || 0;
        const accountNameParam = parsed.accountName ? `&accountName=${encodeURIComponent(parsed.accountName)}` : '';
        const qrUrl = `https://img.vietqr.io/image/${parsed.bankSlug}-${parsed.accountNo}-qr_only.png?amount=${amount}&addInfo=${encodeURIComponent(transferMemo)}${accountNameParam}`;
        return {
            qrUrl,
            bankName: parsed.bankName,
            accountNo: parsed.accountNo,
            accountName: parsed.accountName,
            transferMemo,
        };
    }
    buildHtml(quote, settings) {
        const payment = this.generateVietQR(quote, settings);
        // Calculate sum of discounts
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
            const conditionBadge = (quote.showConditionInPdf && item.productSnapshot.condition)
                ? `<span class="badge badge-gray">${item.productSnapshot.condition}</span>`
                : '';
            const warrantyBadge = item.warranty
                ? `<span class="badge badge-brand">BH ${item.warranty}</span>`
                : '';
            return `
        <div class="product-item-card">
          <div class="item-index">${index + 1}</div>

          <div class="product-image-box">
            ${item.productSnapshot.imageUrl
                ? `<img src="${item.productSnapshot.imageUrl}" alt="${item.productSnapshot.name}" />`
                : `<div class="image-placeholder">
                  <svg viewBox="0 0 40 40" fill="none">
                    <rect x="12" y="12" width="16" height="16" rx="2" stroke="#94a3b8" stroke-width="1.5"/>
                    <path d="M16 8V12M24 8V12M16 28V32M24 28V32M8 16H12M8 24H12M28 16H32M28 24H32" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </div>`}
          </div>

          <div class="product-details">
            <div class="product-title-row">
              <h3 class="product-name">${item.productSnapshot.name}</h3>
              <div class="product-badges">
                ${conditionBadge}
                ${warrantyBadge}
              </div>
            </div>
            <p class="product-meta"><span class="product-code">Mã: ${item.productSnapshot.productCode}</span>${specsText ? ` • ${specsText}` : ''}</p>
          </div>

          <div class="product-pricing">
            <p class="unit-qty">${this.formatCurrency(item.unitPrice)} × ${item.quantity}</p>
            ${itemDiscountValue > 0
                ? `<p class="discount-tag">Giảm: -${item.discountType === 'percent' ? item.discount + '%' : this.formatCurrency(itemDiscountValue)}</p>`
                : ''}
            <p class="total-price">${this.formatCurrency(item.total)}</p>
          </div>
        </div>`;
        })
            .join('');
        return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Báo giá ${quote.quoteCode} - NP Computer</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.4;
      -webkit-font-smoothing: antialiased;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 20px 28px 24px;
      position: relative;
      background: #ffffff;
      display: block;
    }

    /* ===== COMPACT HEADER (70px) ===== */
    .header {
      height: 70px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 10px;
      border-bottom: 2px solid #0f172a;
      margin-bottom: 10px;
    }

    .brand-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-logo {
      height: 42px;
      max-width: 110px;
      object-fit: contain;
    }

    .brand-title {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #0f172a;
      line-height: 1;
    }

    .brand-subtitle {
      font-size: 8.5px;
      font-weight: 700;
      color: #2563eb;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-top: 3px;
    }

    .header-right {
      text-align: right;
    }

    .quote-code-badge {
      display: inline-block;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 6px 14px;
      border-radius: 8px;
    }

    .quote-code-title {
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #64748b;
    }

    .quote-code-val {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 1px;
    }

    .quote-date-val {
      font-size: 9.5px;
      color: #64748b;
    }

    /* COMPACT CONTACT BAR */
    .contact-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 18px;
      font-size: 9px;
      color: #475569;
      margin-bottom: 10px;
    }
    .contact-bar b { color: #0f172a; font-weight: 600; }

    /* ===== CUSTOMER CARD (COMPACT STRIP) ===== */
    .customer-strip {
      background: #f8fafc;
      border-radius: 8px;
      padding: 8px 14px;
      margin-bottom: 12px;
    }

    .customer-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 4px 24px;
    }

    .info-row {
      display: flex;
      font-size: 10.5px;
    }

    .info-label {
      color: #64748b;
      width: 90px;
      flex-shrink: 0;
      font-weight: 500;
    }

    .info-val {
      color: #0f172a;
      font-weight: 600;
    }

    /* ===== COMMERCIAL PRODUCTS LIST (COMPACT DENSITY) ===== */
    .products-container {
      margin-bottom: 12px;
    }

    /* Height max 72px, padding 8px vertical / 12px horizontal */
    .product-item-card {
      height: 66px;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: #ffffff;
      border-radius: 8px;
      border: 1px solid #f1f5f9;
      margin-bottom: 6px;
    }

    .item-index {
      font-size: 9.5px;
      font-weight: 700;
      color: #94a3b8;
      width: 14px;
      flex-shrink: 0;
      text-align: center;
    }

    /* Image size 50x50 */
    .product-image-box {
      width: 50px;
      height: 50px;
      flex-shrink: 0;
      border-radius: 6px;
      overflow: hidden;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }

    .product-image-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .image-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .product-details {
      flex: 1;
      min-width: 0;
    }

    .product-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .product-name {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 380px;
    }

    .product-badges {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    /* Badge height 18px, font 10px */
    .badge {
      height: 18px;
      line-height: 16px;
      font-size: 10px;
      font-weight: 700;
      padding: 0 6px;
      border-radius: 4px;
      white-space: nowrap;
    }

    .badge-gray {
      background: #f1f5f9;
      color: #475569;
    }

    .badge-brand {
      background: #eff6ff;
      color: #2563eb;
      border: 1px solid #bfdbfe;
    }

    .product-meta {
      font-size: 10.5px;
      color: #64748b;
      margin-top: 3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .product-code {
      font-weight: 600;
      color: #2563eb;
    }

    .product-pricing {
      width: 130px;
      flex-shrink: 0;
      text-align: right;
    }

    .unit-qty {
      font-size: 10.5px;
      color: #64748b;
    }

    .discount-tag {
      font-size: 9.5px;
      color: #2563eb;
      font-weight: 600;
    }

    .total-price {
      font-size: 14.5px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 1px;
    }

    /* ===== SUMMARY GRID (GRAND TOTAL + VIETQR) ===== */
    .summary-grid {
      display: flex;
      gap: 16px;
      align-items: stretch;
      margin-bottom: 12px;
    }

    .card-box {
      background: #f8fafc;
      border-radius: 12px;
      padding: 16px 20px;
    }

    /* VIETQR CARD */
    .vietqr-card {
      flex: 1.25;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .vietqr-image-box {
      width: 140px;
      height: 140px;
      flex-shrink: 0;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #cbd5e1;
      padding: 6px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
    }

    .vietqr-image-box img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .vietqr-info {
      flex: 1;
      min-width: 0;
      font-size: 10.5px;
      color: #475569;
      line-height: 1.6;
    }

    .vietqr-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #0f172a;
      margin-bottom: 4px;
    }

    .vietqr-memo {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed #cbd5e1;
      font-size: 10px;
      word-break: break-word;
    }

    .vietqr-memo b { color: #0f172a; font-weight: 700; }

    /* GRAND TOTAL CARD (PERFECTLY BALANCED) */
    .grand-total-card {
      flex: 1;
      border-top: 3px solid #2563eb;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 16px 20px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #64748b;
      margin-bottom: 6px;
    }

    .summary-row.discount { color: #2563eb; font-weight: 600; }
    .summary-row .val { color: #0f172a; font-weight: 600; }

    .grand-total-box {
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      margin-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .grand-total-label {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
    }

    .grand-total-amount {
      font-size: 21px;
      font-weight: 800;
      color: #2563eb;
      letter-spacing: -0.4px;
      line-height: 1;
    }

    /* ===== TERMS (FONT 10PX) ===== */
    .terms-card {
      margin-bottom: 10px;
    }

    .terms-list {
      list-style: none;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3px 16px;
    }

    .terms-list li {
      font-size: 10px;
      color: #475569;
      line-height: 1.4;
    }

    /* ===== FOOTER (30PX) ===== */
    .footer {
      height: 30px;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9.5px;
      color: #64748b;
    }

    .footer-left { font-weight: 500; color: #475569; }
    .footer-right { font-weight: 500; }
  </style>
</head>
<body>
  <div class="page">

    <!-- HEADER (70px) -->
    <div class="header">
      <div class="brand-left">
        ${settings.logoUrl ? `<img src="${settings.logoUrl}" alt="Logo" class="brand-logo" />` : ''}
        <div>
          <h1 class="brand-title">${settings.storeName || 'NP COMPUTER'}</h1>
          <p class="brand-subtitle">LINH KIỆN • PC GAMING • WORKSTATION</p>
        </div>
      </div>

      <div class="header-right">
        <div class="quote-code-badge">
          <div class="quote-code-title">Báo giá: <span style="color:#0f172a">${quote.quoteCode}</span></div>
          <div class="quote-date-val">Ngày lập: ${this.formatDate(quote.createdDate)}</div>
        </div>
      </div>
    </div>

    <!-- COMPACT CONTACT BAR -->
    <div class="contact-bar">
      ${settings.website ? `<span><b>Website:</b> ${settings.website}</span>` : ''}
      ${settings.hotline ? `<span><b>Hotline:</b> ${settings.hotline}</span>` : ''}
      ${settings.email ? `<span><b>Email:</b> ${settings.email}</span>` : ''}
      ${settings.facebook ? `<span><b>FB:</b> ${settings.facebook}</span>` : ''}
      ${settings.address ? `<span><b>Địa chỉ:</b> ${settings.address}</span>` : ''}
    </div>

    <!-- CUSTOMER STRIP -->
    <div class="customer-strip">
      <div class="customer-grid">
        <div>
          <div class="info-row"><span class="info-label">Khách hàng:</span><span class="info-val">${quote.customer.name}</span></div>
          ${quote.customer.phone ? `<div class="info-row" style="margin-top:2px;"><span class="info-label">Điện thoại:</span><span class="info-val">${quote.customer.phone}</span></div>` : ''}
        </div>
        <div>
          ${quote.customer.address ? `<div class="info-row"><span class="info-label">Địa chỉ:</span><span class="info-val">${quote.customer.address}</span></div>` : ''}
          <div class="info-row" style="margin-top:2px;"><span class="info-label">Người lập BG:</span><span class="info-val">${quote.createdBy || 'NP Computer'}</span></div>
        </div>
      </div>
    </div>

    <!-- COMMERCIAL PRODUCTS CONTAINER (COMPACT HIGH DENSITY) -->
    <div class="products-container">
      ${itemsHtml}
    </div>

    <!-- SUMMARY & VIETQR GRID (MAX 18% HEIGHT) -->
    <div class="summary-grid">
      <!-- VIETQR CARD -->
      <div class="card-box vietqr-card">
        ${payment.qrUrl ? `<div class="vietqr-image-box"><img src="${payment.qrUrl}" alt="VietQR" /></div>` : ''}
        <div class="vietqr-info">
          <div class="vietqr-title">Thanh toán nhanh (VietQR)</div>
          <div><b>Ngân hàng:</b> ${payment.bankName}</div>
          <div><b>Chủ TK:</b> ${payment.accountName || 'NP COMPUTER'}</div>
          <div><b>STK:</b> ${payment.accountNo}</div>
          ${payment.transferMemo ? `<div class="vietqr-memo"><b>Nội dung CK:</b> ${payment.transferMemo}</div>` : ''}
        </div>
      </div>

      <!-- GRAND TOTAL CARD -->
      <div class="card-box grand-total-card">
        <div>
          <div class="summary-row"><span>Tạm tính:</span><span class="val">${this.formatCurrency(quote.subtotal)}</span></div>
          ${combinedDiscountTotal > 0
            ? `<div class="summary-row discount"><span>Chiết khấu:</span><span class="val">-${this.formatCurrency(combinedDiscountTotal)}</span></div>`
            : ''}
          ${quote.shippingFee > 0
            ? `<div class="summary-row"><span>Vận chuyển:</span><span class="val">${this.formatCurrency(quote.shippingFee)}</span></div>`
            : ''}
          ${quote.vatEnabled
            ? `<div class="summary-row"><span>VAT (${quote.vatPercent}%):</span><span class="val">${this.formatCurrency(quote.vatAmount)}</span></div>`
            : ''}
        </div>

        <div class="grand-total-box">
          <span class="grand-total-label">TỔNG THANH TOÁN:</span>
          <span class="grand-total-amount">${this.formatCurrency(quote.grandTotal)}</span>
        </div>
      </div>
    </div>

    <!-- TERMS (FONT 10PX) -->
    <div class="terms-card">
      <ul class="terms-list">
        <li>✓ Giá có hiệu lực trong 07 ngày kể từ ngày lập báo giá.</li>
        <li>✓ Bảo hành theo tem và serial number của cửa hàng.</li>
        <li>✓ Không bảo hành do rơi vỡ, cháy nổ hoặc vào nước.</li>
        <li>✓ Quý khách vui lòng kiểm tra sản phẩm trước khi thanh toán.</li>
      </ul>
    </div>

    <!-- FOOTER (30PX) -->
    <div class="footer">
      <div class="footer-left">Cảm ơn Quý khách đã lựa chọn NP Computer.</div>
      <div class="footer-right">
        ${settings.website || 'npcomputer.vn'}  •  ${settings.facebook || 'facebook.com'}  •  Hotline: ${settings.hotline || '0901.234.567'}
      </div>
    </div>

  </div>
</body>
</html>`;
    }
    generateInvoiceVietQR(invoice, settings) {
        const customerName = invoice.customer?.name || '';
        const phonePart = invoice.customer?.phone ? ` - ${invoice.customer.phone}` : '';
        const invoiceCodePart = invoice.invoiceCode ? ` - ${invoice.invoiceCode}` : '';
        const transferMemo = `${customerName}${phonePart}${invoiceCodePart}`;
        const parsed = this.parseBankInfo(settings?.bankInfo || '');
        if (!parsed) {
            return {
                qrUrl: settings?.qrPaymentUrl || '',
                bankName: 'Ngân hàng',
                accountNo: '',
                accountName: '',
                transferMemo,
            };
        }
        const amount = invoice.remainingAmount > 0 ? invoice.remainingAmount : invoice.grandTotal;
        return {
            qrUrl: `https://img.vietqr.io/image/${parsed.bankSlug}-${parsed.accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferMemo)}&accountName=${encodeURIComponent(parsed.accountName)}`,
            bankName: parsed.bankName,
            accountNo: parsed.accountNo,
            accountName: parsed.accountName,
            transferMemo,
        };
    }
    buildInvoiceHtml(invoice, settings) {
        const payment = this.generateInvoiceVietQR(invoice, settings);
        // Calculate sum of discounts
        const itemsDiscountTotal = invoice.items.reduce((sum, item) => {
            const itemDisc = item.discountType === 'percent'
                ? (item.unitPrice * item.quantity * item.discount) / 100
                : (item.discount || 0);
            return sum + itemDisc;
        }, 0);
        const quoteDiscountTotal = invoice.discountType === 'percent'
            ? ((invoice.subtotal - itemsDiscountTotal) * invoice.discount) / 100
            : (invoice.discount || 0);
        const combinedDiscountTotal = itemsDiscountTotal + quoteDiscountTotal;
        const itemsHtml = invoice.items
            .sort((a, b) => a.order - b.order)
            .map((item, index) => {
            const specsText = this.buildCompactSpecs(item.productSnapshot.specs);
            const itemDiscountValue = item.discountType === 'percent'
                ? (item.unitPrice * item.quantity * item.discount) / 100
                : item.discount;
            const conditionBadge = (invoice.showConditionInPdf && item.productSnapshot.condition)
                ? `<span class="badge badge-gray">${item.productSnapshot.condition}</span>`
                : '';
            const warrantyBadge = item.warranty
                ? `<span class="badge badge-brand">BH ${item.warranty}</span>`
                : '';
            const serialBadge = item.serialNumber
                ? `<span class="badge badge-gray" style="font-family: monospace;">S/N: ${item.serialNumber}</span>`
                : '';
            return `
        <div class="product-item-card">
          <div class="item-index">${index + 1}</div>

          <div class="product-image-box">
            ${item.productSnapshot.imageUrl
                ? `<img src="${item.productSnapshot.imageUrl}" alt="${item.productSnapshot.name}" />`
                : `<div class="image-placeholder">
                  <svg viewBox="0 0 40 40" fill="none">
                    <rect x="12" y="12" width="16" height="16" rx="2" stroke="#94a3b8" stroke-width="1.5"/>
                    <path d="M16 8V12M24 8V12M16 28V32M24 28V32M8 16H12M8 24H12M28 16H32M28 24H32" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
               </div>`}
          </div>

          <div class="product-details">
            <div class="product-header">
              <span class="product-title">${item.productSnapshot.name}</span>
              ${conditionBadge}
              ${warrantyBadge}
              ${serialBadge}
            </div>

            ${specsText ? `<div class="product-specs">${specsText}</div>` : ''}

            <div class="product-meta">
              <span class="product-code font-mono">${item.productSnapshot.productCode}</span>
            </div>
          </div>

          <div class="product-pricing">
            <div class="price-row">
              <span class="qty">${item.quantity} x</span>
              <span class="unit-price">${this.formatCurrency(item.unitPrice)}</span>
            </div>
            ${itemDiscountValue > 0 ? `<div class="discount-tag">Giảm: -${this.formatCurrency(itemDiscountValue)}</div>` : ''}
            <div class="item-total">${this.formatCurrency(item.total)}</div>
          </div>
        </div>
      `;
        })
            .join('');
        const paymentsHtml = invoice.payments && invoice.payments.length > 0
            ? `<div style="margin-top: 15px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="font-size: 11px; font-weight: 700; color: #1e293b; margin-bottom: 8px; text-transform: uppercase;">Lịch sử thanh toán (${invoice.payments.length} đợt)</div>
          ${invoice.payments.map((p, i) => `
            <div style="display: flex; justify-content: space-between; font-size: 10px; padding: 3px 0; border-bottom: 1px dashed #e2e8f0;">
              <div>
                <strong>Lần ${i + 1} (${p.paymentMethod}):</strong> ${this.formatDate(p.paymentDate)} ${p.notes ? ` - <em>${p.notes}</em>` : ''}
              </div>
              <div style="font-weight: 700; color: #16a34a;">+${this.formatCurrency(p.amount)}</div>
            </div>
          `).join('')}
         </div>`
            : '';
        const isPaidInFull = invoice.remainingAmount <= 0;
        return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>HÓA ĐƠN BÁN HÀNG - ${invoice.invoiceCode}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #ffffff; color: #0f172a; font-size: 11px; line-height: 1.4; -webkit-print-color-adjust: exact; }
    .page-container { width: 210mm; min-height: 297mm; padding: 28px 32px; margin: 0 auto; display: flex; flex-direction: column; justify-content: space-between; }
    .header-card { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .store-identity { display: flex; align-items: center; gap: 14px; }
    .store-logo { width: 44px; h-44px; object-fit: contain; border-radius: 8px; }
    .logo-placeholder { width: 44px; height: 44px; background: #0f172a; border-radius: 8px; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800; }
    .store-name { font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; margin-bottom: 2px; }
    .store-sub { font-size: 10px; color: #64748b; font-weight: 500; }
    .invoice-title-block { text-align: right; }
    .invoice-badge-title { font-size: 20px; font-weight: 800; color: #2563eb; letter-spacing: 0.5px; }
    .invoice-code-tag { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; font-weight: 700; color: #0f172a; background: #f1f5f9; padding: 3px 8px; border-radius: 4px; margin-top: 4px; display: inline-block; }
    .customer-card { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; }
    .info-column { width: 48%; }
    .info-title { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .info-row { font-size: 11px; color: #334155; margin-bottom: 3px; display: flex; }
    .info-label { width: 85px; color: #64748b; font-weight: 500; flex-shrink: 0; }
    .info-value { font-weight: 600; color: #0f172a; }
    .product-list-container { margin-bottom: 20px; flex-grow: 1; }
    .product-item-card { display: flex; align-items: center; padding: 8px 12px; margin-bottom: 6px; background: #ffffff; border: 1px solid #f1f5f9; border-radius: 8px; }
    .item-index { width: 22px; font-size: 10px; font-weight: 700; color: #94a3b8; font-family: monospace; }
    .product-image-box { width: 50px; height: 50px; border-radius: 6px; overflow: hidden; background: #f8fafc; border: 1px solid #e2e8f0; margin-right: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .product-image-box img { width: 100%; height: 100%; object-fit: cover; }
    .image-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f1f5f9; }
    .product-details { flex: 1; min-width: 0; padding-right: 12px; }
    .product-header { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 2px; }
    .product-title { font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.25; }
    .badge { font-size: 8px; font-weight: 700; padding: 1px 5px; border-radius: 3px; white-space: nowrap; }
    .badge-gray { color: #475569; background: #f1f5f9; border: 1px solid #cbd5e1; }
    .badge-brand { color: #0d9488; background: #ccfbf1; border: 1px solid #99f6e4; }
    .product-specs { font-size: 10px; color: #64748b; margin-top: 1px; }
    .product-meta { font-size: 9px; color: #94a3b8; margin-top: 2px; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .product-pricing { text-align: right; width: 130px; flex-shrink: 0; }
    .price-row { font-size: 10px; color: #64748b; }
    .qty { font-weight: 700; color: #0f172a; }
    .unit-price { font-weight: 600; }
    .discount-tag { font-size: 9px; font-weight: 600; color: #ef4444; }
    .item-total { font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 2px; }
    .bottom-section { margin-top: auto; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    .financials-card { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 16px; }
    .payment-qr-column { width: 340px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; display: flex; align-items: center; gap: 12px; }
    .qr-image { width: 85px; height: 85px; border-radius: 6px; object-fit: contain; background: #ffffff; border: 1px solid #cbd5e1; padding: 3px; flex-shrink: 0; }
    .qr-text { font-size: 9px; color: #475569; }
    .qr-bank-title { font-size: 10px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
    .qr-acc-num { font-size: 11px; font-weight: 800; color: #2563eb; font-family: monospace; }
    .totals-column { width: 280px; }
    .totals-row { display: flex; justify-content: space-between; font-size: 11px; padding: 3px 0; color: #475569; }
    .totals-row.grand { border-top: 2px solid #0f172a; margin-top: 6px; padding-top: 8px; }
    .grand-total-label { font-size: 11px; font-weight: 800; color: #0f172a; }
    .grand-total-amount { font-size: 16px; font-weight: 800; color: #2563eb; }
    .paid-row { color: #16a34a; font-weight: 700; }
    .debt-row { color: #d97706; font-weight: 800; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 4px; }
    .terms-card { background: #f8fafc; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; border: 1px solid #f1f5f9; }
    .terms-list { list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; font-size: 9px; color: #64748b; }
    .footer { display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="page-container">

    <!-- HEADER CARD -->
    <div class="header-card">
      <div class="store-identity">
        ${settings.logoUrl
            ? `<img src="${settings.logoUrl}" alt="${settings.storeName}" class="store-logo" />`
            : `<div class="logo-placeholder">NP</div>`}
        <div>
          <div class="store-name">${settings.storeName || 'NP COMPUTER'}</div>
          <div class="store-sub">${settings.address || 'Chuyên Linh Kiện & Máy Tính Cao Cấp'}</div>
          <div class="store-sub">Hotline: ${settings.hotline || '0901.234.567'}</div>
        </div>
      </div>

      <div class="invoice-title-block">
        <div class="invoice-badge-title">HÓA ĐƠN BÁN HÀNG</div>
        <div class="invoice-code-tag">${invoice.invoiceCode}</div>
        ${invoice.quoteCode ? `<div style="font-size: 9px; color: #64748b; margin-top: 2px;">Báo giá gốc: <strong class="font-mono">${invoice.quoteCode}</strong></div>` : ''}
      </div>
    </div>

    <!-- CUSTOMER & INVOICE META CARD -->
    <div class="customer-card">
      <div class="info-column">
        <div class="info-title">THÔNG TIN KHÁCH HÀNG</div>
        <div class="info-row"><span class="info-label">Khách hàng:</span> <span class="info-value">${invoice.customer.name}</span></div>
        <div class="info-row"><span class="info-label">Điện thoại:</span> <span class="info-value">${invoice.customer.phone || '---'}</span></div>
        <div class="info-row"><span class="info-label">Địa chỉ:</span> <span class="info-value">${invoice.customer.address || '---'}</span></div>
      </div>

      <div class="info-column">
        <div class="info-title">THÔNG TIN ĐƠN HÀNG</div>
        <div class="info-row"><span class="info-label">Ngày tạo:</span> <span class="info-value">${this.formatDate(invoice.createdDate)}</span></div>
        <div class="info-row"><span class="info-label">Người lập:</span> <span class="info-value">${invoice.createdBy}</span></div>
        <div class="info-row">
          <span class="info-label">Trạng thái:</span>
          <span class="info-value" style="color: ${isPaidInFull ? '#16a34a' : '#d97706'}; font-weight: 800;">
            ${isPaidInFull ? 'ĐÃ THANH TOÁN' : 'CÒN NỢ'}
          </span>
        </div>
      </div>
    </div>

    <!-- PRODUCT LIST CONTAINER -->
    <div class="product-list-container">
      ${itemsHtml}
      ${paymentsHtml}
    </div>

    <!-- BOTTOM FINANCIALS SECTION -->
    <div class="bottom-section">
      <div class="financials-card">

        <!-- PAYMENT QR -->
        <div class="payment-qr-column">
          ${payment.qrUrl
            ? `<img src="${payment.qrUrl}" alt="VietQR" class="qr-image" />`
            : `<div class="qr-image" style="display:flex;align-items:center;justify-content:center;font-size:8px;color:#94a3b8;">QR</div>`}
          <div class="qr-text">
            <div class="qr-bank-title">${payment.bankName}</div>
            <div class="qr-acc-num">${payment.accountNo}</div>
            <div>Chủ TK: <strong>${payment.accountName || 'NP COMPUTER'}</strong></div>
            <div style="margin-top: 3px; font-size: 8px; color: #64748b;">Nội dung: <span class="font-mono" style="font-weight:700;">${payment.transferMemo}</span></div>
          </div>
        </div>

        <!-- TOTALS BREAKDOWN -->
        <div class="totals-column">
          <div class="totals-row">
            <span>Tạm tính (Subtotal):</span>
            <span>${this.formatCurrency(invoice.subtotal)}</span>
          </div>

          ${combinedDiscountTotal > 0 ? `
          <div class="totals-row" style="color: #ef4444;">
            <span>Chiết khấu:</span>
            <span>-${this.formatCurrency(combinedDiscountTotal)}</span>
          </div>
          ` : ''}

          ${invoice.shippingFee > 0 ? `
          <div class="totals-row">
            <span>Phí vận chuyển:</span>
            <span>+${this.formatCurrency(invoice.shippingFee)}</span>
          </div>
          ` : ''}

          ${invoice.vatEnabled ? `
          <div class="totals-row">
            <span>Thuế VAT (${invoice.vatPercent}%):</span>
            <span>+${this.formatCurrency(invoice.vatAmount)}</span>
          </div>
          ` : ''}

          <div class="totals-row grand">
            <span class="grand-total-label">TỔNG CỘNG:</span>
            <span class="grand-total-amount">${this.formatCurrency(invoice.grandTotal)}</span>
          </div>

          <div class="totals-row paid-row" style="margin-top: 4px;">
            <span>Đã thanh toán:</span>
            <span>-${this.formatCurrency(invoice.totalPaid)}</span>
          </div>

          <div class="totals-row debt-row">
            <span>CÒN NỢ:</span>
            <span>${this.formatCurrency(invoice.remainingAmount)}</span>
          </div>
        </div>
      </div>

      <!-- TERMS -->
      <div class="terms-card">
        <ul class="terms-list">
          <li>✓ Hóa đơn bán hàng nội bộ của cửa hàng máy tính.</li>
          <li>✓ Bảo hành theo tem và serial number của cửa hàng.</li>
          <li>✓ Không bảo hành do rơi vỡ, cháy nổ hoặc vào nước.</li>
          <li>✓ Quý khách vui lòng kiểm tra sản phẩm trước khi thanh toán.</li>
        </ul>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div class="footer-left">Cảm ơn Quý khách đã mua hàng tại NP Computer.</div>
        <div class="footer-right">
          ${settings.website || 'npcomputer.vn'}  •  Hotline: ${settings.hotline || '0901.234.567'}
        </div>
      </div>

    </div>

  </div>
</body>
</html>`;
    }
}
exports.PdfService = PdfService;
//# sourceMappingURL=pdf.service.js.map
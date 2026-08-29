import { Router } from 'express';
import { asyncHandler } from '../middleware';
import { Request, Response } from 'express';
import { QuoteService } from '../services/quote.service';
import { InvoiceService } from '../services/invoice.service';
import { PdfService } from '../services/pdf.service';

const router = Router();
const quoteService = new QuoteService();
const invoiceService = new InvoiceService();
const pdfService = new PdfService();

// GET /api/pdf/quotes/:id
router.get(
  '/quotes/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const quote = await quoteService.getById(id);
    const isInline = req.query.inline === '1' || req.query.inline === 'true' || req.query.view === '1';

    const pdfBuffer = await pdfService.generateQuotePdf(quote);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${isInline ? 'inline' : 'attachment'}; filename="${quote.quoteCode}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  })
);

// GET /api/pdf/quotes/:id/html (Direct browser print)
router.get(
  '/quotes/:id/html',
  asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const quote = await quoteService.getById(id);
    const html = await pdfService.getQuoteHtml(quote);
    const autoPrintScript = `
<script>
  async function waitForImagesAndPrint() {
    const imgs = Array.from(document.images);
    await Promise.all(imgs.map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    }));
    setTimeout(() => {
      window.print();
    }, 400);
  }
  if (document.readyState === 'complete') {
    waitForImagesAndPrint();
  } else {
    window.addEventListener('load', waitForImagesAndPrint);
  }
</script>
</body>`;
    const autoPrintHtml = html.replace('</body>', autoPrintScript);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(autoPrintHtml);
  })
);

// GET /api/pdf/invoices/:id
router.get(
  '/invoices/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const invoice = await invoiceService.getById(id);
    const isInline = req.query.inline === '1' || req.query.inline === 'true' || req.query.view === '1';

    const pdfBuffer = await pdfService.generateInvoicePdf(invoice);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${isInline ? 'inline' : 'attachment'}; filename="${invoice.invoiceCode}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  })
);

// GET /api/pdf/invoices/:id/html (Direct browser print)
router.get(
  '/invoices/:id/html',
  asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const invoice = await invoiceService.getById(id);
    const html = await pdfService.getInvoiceHtml(invoice);
    const autoPrintScript = `
<script>
  async function waitForImagesAndPrint() {
    const imgs = Array.from(document.images);
    await Promise.all(imgs.map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    }));
    setTimeout(() => {
      window.print();
    }, 400);
  }
  if (document.readyState === 'complete') {
    waitForImagesAndPrint();
  } else {
    window.addEventListener('load', waitForImagesAndPrint);
  }
</script>
</body>`;
    const autoPrintHtml = html.replace('</body>', autoPrintScript);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(autoPrintHtml);
  })
);

export default router;

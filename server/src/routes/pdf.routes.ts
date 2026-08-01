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
    const pdfBuffer = await pdfService.generateQuotePdf(quote);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${quote.quoteCode}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  })
);

// GET /api/pdf/invoices/:id
router.get(
  '/invoices/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const invoice = await invoiceService.getById(id);
    const pdfBuffer = await pdfService.generateInvoicePdf(invoice);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoiceCode}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  })
);

export default router;

import { IQuoteDocument, IInvoiceDocument } from '../models';
export declare class PdfService {
    generateQuotePdf(quote: IQuoteDocument): Promise<Buffer>;
    generateInvoicePdf(invoice: IInvoiceDocument): Promise<Buffer>;
    private formatCurrency;
    private formatDate;
    /**
     * Compact specs line: CPU, RAM, SSD, GPU only
     */
    private buildCompactSpecs;
    /**
     * Extract bank account details from bankInfo text settings
     */
    private parseBankInfo;
    private generateVietQR;
    private buildHtml;
    private generateInvoiceVietQR;
    private buildInvoiceHtml;
}
//# sourceMappingURL=pdf.service.d.ts.map
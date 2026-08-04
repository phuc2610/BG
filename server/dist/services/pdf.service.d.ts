import { IQuoteDocument, IInvoiceDocument } from '../models';
export declare class PdfService {
    generateQuotePdf(quote: IQuoteDocument): Promise<Buffer>;
    generateInvoicePdf(invoice: IInvoiceDocument): Promise<Buffer>;
    getQuoteHtml(quote: IQuoteDocument): Promise<string>;
    getInvoiceHtml(invoice: IInvoiceDocument): Promise<string>;
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
    private generateQuoteVietQR;
    private generateInvoiceVietQR;
    /**
     * Common CSS styles for both Quote and Invoice A4 documents
     * Usable width: 190mm (210mm - 2*10mm padding)
     */
    private getCommonCss;
    /**
     * Helper to build dynamic Policy Strip (4 equal columns from Settings)
     */
    private renderPolicyStrip;
    /**
     * Helper to build shared Header HTML (60% / 40%)
     */
    private renderSharedHeader;
    /**
     * Helper to build shared Footer HTML (3 Regions: 22% / 48% / 30%)
     */
    private renderSharedFooter;
    /**
     * BUILD BÁO GIÁ HTML
     */
    private buildHtml;
    /**
     * BUILD HÓA ĐƠN BÁN HÀNG HTML
     */
    private buildInvoiceHtml;
}
//# sourceMappingURL=pdf.service.d.ts.map
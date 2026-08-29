import mongoose from 'mongoose';
import { Invoice } from '../src/models/invoice.model';
import { InvoiceService } from '../src/services/invoice.service';
import { PdfService } from '../src/services/pdf.service';

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://Phuc26104:2785YaFdsluel5sI@cluster0.qdkccgc.mongodb.net/np';
  await mongoose.connect(uri);

  const invoiceService = new InvoiceService();
  const pdfService = new PdfService();

  const invoice = await Invoice.findOne({ invoiceCode: 'HD202608080002' }).exec();
  if (!invoice) {
    console.log('Invoice not found');
    process.exit(1);
  }

  const html = await pdfService.getInvoiceHtml(invoice);
  console.log('=== GENERATED HTML SNIPPET ===');
  console.log(html.substring(0, 1500));
  
  // Extract all img src URLs from HTML
  const matches = html.match(/src=["']([^"']+)["']/g);
  console.log('\n=== ALL IMG SRCS FOUND IN HTML ===');
  if (matches) {
    matches.forEach(m => console.log(m));
  } else {
    console.log('No img srcs found!');
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

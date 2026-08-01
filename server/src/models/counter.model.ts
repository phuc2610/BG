import mongoose, { Schema, Document } from 'mongoose';

export interface ICounterDocument extends Document {
  name: string;
  seq: number;
}

const counterSchema = new Schema<ICounterDocument>({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.model<ICounterDocument>('Counter', counterSchema);

export const getNextSequence = async (name: string, ownerId?: string): Promise<number> => {
  const counterName = ownerId ? `${name}_${ownerId}` : name;
  const counter = await Counter.findOneAndUpdate(
    { name: counterName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

export const generateProductId = async (ownerId?: string): Promise<string> => {
  const seq = await getNextSequence('productId', ownerId);
  return `SP${String(seq).padStart(6, '0')}`;
};

export const generateProductCode = async (category: string, ownerId?: string): Promise<string> => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const counterName = `productCode_${category}_${yy}${mm}`;
  const seq = await getNextSequence(counterName, ownerId);
  const categoryCode = category.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  return `NPC-${categoryCode}-${yy}${mm}${String(seq).padStart(4, '0')}`;
};

export const generateQuoteCode = async (ownerId?: string): Promise<string> => {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;
  const counterName = `quoteCode_${dateStr}`;
  const seq = await getNextSequence(counterName, ownerId);
  return `BG${dateStr}${String(seq).padStart(4, '0')}`;
};

export const generateStockCode = async (ownerId?: string): Promise<string> => {
  const seq = await getNextSequence('stockCode', ownerId);
  return `NK${String(seq).padStart(6, '0')}`;
};

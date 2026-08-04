import mongoose, { Schema, Document } from 'mongoose';

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
}

export interface IUserDocument extends Document {
  username: string;
  usernameNormalized: string;
  fullName: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  isActive: boolean;
  permissions: string[];
  maxQuoteDiscountPercent: number;
  registeredAt: Date;
  activatedAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 4,
      maxlength: 30,
    },
    usernameNormalized: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    fullName: {
      type: String,
      default: 'Admin',
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.PENDING,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    permissions: {
      type: [String],
      default: [],
    },
    maxQuoteDiscountPercent: {
      type: Number,
      default: 0,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    activatedAt: {
      type: Date,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUserDocument>('User', UserSchema);

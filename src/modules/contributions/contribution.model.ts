import { Schema, model, Types, type HydratedDocument, type Model } from 'mongoose';

export type ContributionStatus = 'pending' | 'confirmed' | 'late' | 'missed';

export type Contribution = {
  group: Types.ObjectId;
  cycle: Types.ObjectId;
  member: Types.ObjectId;
  amount: number;
  status: ContributionStatus;
  paidAt?: Date;
  latePenalty: number;
  reference?: string;
  confirmedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const contributionSchema = new Schema<Contribution>({
  group: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  cycle: {
    type: Schema.Types.ObjectId,
    ref: 'Cycle',
    required: true,
    index: true
  },
  member: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'late', 'missed'],
    default: 'pending',
    required: true,
    index: true
  },
  paidAt: Date,
  latePenalty: {
    type: Number,
    default: 0,
    min: 0,
    required: true
  },
  reference: {
    type: String,
    trim: true,
    sparse: true,
    unique: true
  },
  confirmedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  versionKey: false
});

contributionSchema.index({ cycle: 1, member: 1 }, { unique: true });
contributionSchema.index({ group: 1, cycle: 1 });

export type ContributionDocument = HydratedDocument<Contribution>;
export type ContributionModel = Model<Contribution>;

export const ContributionModel = model<Contribution>('Contribution', contributionSchema);

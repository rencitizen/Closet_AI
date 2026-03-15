import { z } from "zod";

const itemStatusValues = [
  "active",
  "in_laundry",
  "in_cleaning",
  "stored",
  "lent",
  "archived",
  "disposed",
] as const;

const seasonValues = ["spring", "summer", "autumn", "winter", "all_season"] as const;
const occasionValues = ["casual", "office", "formal", "sports", "travel"] as const;
const careTypeValues = ["machine_wash", "hand_wash", "dry_clean", "repair", "none"] as const;
const careLogStatusValues = ["queued", "in_progress", "done"] as const;
const disposalTypeValues = ["sold", "donated", "discarded", "gifted"] as const;

const uuid = z.string().uuid();
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const nonEmptyString = z.string().trim().min(1);

export const itemStatusSchema = z.enum(itemStatusValues);
export const seasonTagSchema = z.enum(seasonValues);
export const occasionTagSchema = z.enum(occasionValues);
export const careTypeSchema = z.enum(careTypeValues);
export const careLogStatusSchema = z.enum(careLogStatusValues);
export const disposalTypeSchema = z.enum(disposalTypeValues);

export const itemQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  status: itemStatusSchema.optional(),
  season: seasonTagSchema.optional(),
  color: z.string().trim().min(1).optional(),
  brand: z.string().trim().min(1).optional(),
  location_id: uuid.optional(),
  tag: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
  include_archived: z.coerce.boolean().default(false),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["created_at", "last_worn_at", "wear_count"]).default("created_at"),
});

export const createItemSchema = z.object({
  name: nonEmptyString,
  category: nonEmptyString,
  subcategory: z.string().trim().min(1).optional(),
  brand: z.string().trim().min(1).optional(),
  color: z.string().trim().min(1).optional(),
  secondary_colors: z.array(nonEmptyString).max(10).default([]),
  size_label: z.string().trim().min(1).optional(),
  fit: z.string().trim().min(1).optional(),
  material: z.string().trim().min(1).optional(),
  season_tags: z.array(seasonTagSchema).max(5).default([]),
  occasion_tags: z.array(occasionTagSchema).max(5).default([]),
  purchase_date: dateString.optional(),
  purchase_price: z.number().nonnegative().optional(),
  purchase_store: z.string().trim().min(1).optional(),
  status: itemStatusSchema.default("active"),
  condition_score: z.number().int().min(1).max(5).default(3),
  care_type: careTypeSchema.default("machine_wash"),
  laundry_interval_wears: z.number().int().min(1).max(99).optional(),
  location_id: uuid.optional(),
  primary_image_url: z.string().url().optional(),
  notes: z.string().trim().max(5000).optional(),
});

export const updateItemSchema = createItemSchema.partial().extend({
  primary_image_url: z.string().url().optional(),
  archived_at: z.string().datetime().optional(),
  disposed_at: z.string().datetime().optional(),
});

export const createOutfitSchema = z.object({
  name: nonEmptyString,
  item_ids: z.array(uuid).min(1).max(20),
  season_tags: z.array(seasonTagSchema).max(5).default([]),
  occasion_tags: z.array(occasionTagSchema).max(5).default([]),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().trim().max(5000).optional(),
  is_favorite: z.boolean().default(false),
});

export const createWearLogSchema = z.object({
  worn_on: dateString,
  outfit_id: uuid.optional(),
  item_ids: z.array(uuid).min(1).max(20),
  notes: z.string().trim().max(5000).optional(),
});

export const createCareLogSchema = z.object({
  item_id: uuid,
  care_type: z.enum(["wash", "dry_clean", "repair", "brushing", "airing"]),
  status: careLogStatusSchema.default("done"),
  cared_on: dateString,
  cost: z.number().nonnegative().optional(),
  vendor_name: z.string().trim().min(1).optional(),
  notes: z.string().trim().max(5000).optional(),
});

export const disposeItemSchema = z.object({
  disposed_on: dateString,
  disposal_type: disposalTypeSchema,
  recovered_amount: z.number().nonnegative().optional(),
  reason: z.string().trim().min(1).optional(),
  notes: z.string().trim().max(5000).optional(),
});

export type ItemQuery = z.infer<typeof itemQuerySchema>;
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type CreateOutfitInput = z.infer<typeof createOutfitSchema>;
export type CreateWearLogInput = z.infer<typeof createWearLogSchema>;
export type CreateCareLogInput = z.infer<typeof createCareLogSchema>;
export type DisposeItemInput = z.infer<typeof disposeItemSchema>;

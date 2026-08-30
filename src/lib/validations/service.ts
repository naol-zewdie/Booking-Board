import { z } from "zod";

export const CURATED_SERVICE_COLORS = [
  { hex: "#6366f1", name: "Indigo" },
  { hex: "#06b6d4", name: "Cyan" },
  { hex: "#10b981", name: "Emerald" },
  { hex: "#f59e0b", name: "Amber" },
  { hex: "#ec4899", name: "Pink" },
  { hex: "#8b5cf6", name: "Purple" },
  { hex: "#3b82f6", name: "Blue" },
  { hex: "#f43f5e", name: "Rose" },
];

export const createServiceSchema = z.object({
  name: z
    .string()
    .min(1, "Service name is required")
    .max(80, "Service name cannot exceed 80 characters"),
  description: z.string().max(500, "Description max 500 characters").optional().nullable(),
  durationMin: z
    .number({ invalid_type_error: "Duration must be a number" })
    .min(5, "Duration must be at least 5 minutes")
    .max(480, "Duration cannot exceed 8 hours (480 minutes)"),
  priceCents: z
    .number({ invalid_type_error: "Price must be a number" })
    .min(0, "Price cannot be negative"),
  bufferMin: z
    .number({ invalid_type_error: "Buffer must be a number" })
    .min(0, "Buffer cannot be negative")
    .max(120, "Buffer cannot exceed 2 hours (120 minutes)")
    .default(0),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color format")
    .default("#6366f1"),
  active: z.boolean().default(true),
});

export const updateServiceSchema = createServiceSchema.partial();

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

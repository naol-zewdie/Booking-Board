import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().min(2, "Service name must be at least 2 characters"),
  description: z.string().optional(),
  durationMin: z.number().min(5, "Duration must be at least 5 minutes").max(720, "Duration max 12 hours"),
  priceCents: z.number().min(0, "Price cannot be negative"),
  bufferMin: z.number().min(0, "Buffer cannot be negative").default(0),
  color: z.string().default("#6366f1"),
});

export const workingHourSchema = z.object({
  weekday: z.number().min(0).max(6),
  startMin: z.number().min(0).max(1440),
  endMin: z.number().min(0).max(1440),
  enabled: z.boolean().default(true),
});

export const staffMemberSchema = z.object({
  name: z.string().min(2, "Staff name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  role: z.string().optional(),
  workingHours: z.array(workingHourSchema).optional(),
});

export const onboardingSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(50, "Slug max 50 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  timezone: z.string().min(1, "Timezone is required"),
  currency: z.string().default("USD"),
  services: z.array(serviceSchema).min(1, "At least one service is required"),
  staff: z.array(staffMemberSchema).min(1, "At least one staff member is required"),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type StaffInput = z.infer<typeof staffMemberSchema>;
export type WorkingHourInput = z.infer<typeof workingHourSchema>;

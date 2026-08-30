import { z } from "zod";

export const workingHourEntrySchema = z.object({
  weekday: z.number().min(0).max(6),
  startMin: z.number().min(0).max(1440),
  endMin: z.number().min(0).max(1440),
  enabled: z.boolean().default(true),
});

export const createStaffSchema = z.object({
  name: z
    .string()
    .min(1, "Staff name is required")
    .max(80, "Name cannot exceed 80 characters"),
  email: z
    .string()
    .email("Invalid email format")
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: z.string().max(30, "Phone number too long").optional().nullable(),
  role: z.string().max(80, "Role too long").optional().nullable(),
  avatarUrl: z.string().url().optional().nullable().or(z.literal("")),
  active: z.boolean().default(true),
});

export const updateStaffSchema = createStaffSchema.partial();

export const updateWorkingHoursSchema = z.object({
  hours: z.array(workingHourEntrySchema),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type UpdateWorkingHoursInput = z.infer<typeof updateWorkingHoursSchema>;

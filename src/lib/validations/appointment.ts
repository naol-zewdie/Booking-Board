import { z } from "zod";

export const availabilityQuerySchema = z.object({
  serviceId: z.string().min(1, "serviceId is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format"),
  staffId: z.string().optional().nullable(),
});

export const createAppointmentSchema = z.object({
  serviceId: z.string().min(1, "serviceId is required"),
  staffId: z.string().optional().nullable(),
  startsAt: z.string().datetime({ message: "startsAt must be a valid ISO 8601 UTC string" }),
  notes: z.string().max(500, "Notes too long").optional().nullable(),
  customer: z.object({
    name: z.string().min(1, "Customer name is required").max(100),
    email: z.string().email("Invalid email address").optional().nullable().or(z.literal("")),
    phone: z.string().max(30).optional().nullable().or(z.literal("")),
  }),
});

export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

import { z } from "zod";

export const rideStatusSchema = z.object({
  status: z.enum(["driving", "needsRide", "none"]),
  seatsFree: z.number().int().min(0).max(20).optional(),
});

export type RideStatusValues = z.infer<typeof rideStatusSchema>;

import { z } from "zod";

export const quantitySchema = z.number().int().min(0).max(99);

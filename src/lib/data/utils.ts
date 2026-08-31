import { logger } from "../logger";

export function handleFirestoreError(context: string, error: unknown): never {
  const msg = error instanceof Error ? error.message : String(error);
  logger.error(`Firestore error in ${context}`, { error: msg });
  throw error;
}
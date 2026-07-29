import cds from "@sap/cds";

export const ERROR_RECORDS_ENTITY = "cap.poc.eh3.synthetic.ErrorRecords";

export type ProcessingStage = "CREATE" | "VALID" | "RESP" | "STATUS" | "SEED";

export interface PreparedErrorRecord {
  errorId: string;
  orderId?: string | null;
  processingStage: ProcessingStage;
  messageId: string;
  messageNumber: string;
  messageText: string;
  severity: string;
  createdAt: string | Date;
  createdBy: string;
  resolved: boolean;
  datasetVersion: string;
}

export interface ErrorRecordPersistence {
  run(query: unknown): Promise<unknown>;
}

export interface PersistedErrorRecord {
  errorId: string;
  order_orderId: string | null;
  processingStage: ProcessingStage;
  messageId: string;
  messageNumber: string;
  messageText: string;
  severity: string;
  createdAt: string;
  createdBy: string;
  resolved: boolean;
  datasetVersion: string;
}

export async function persistPreparedErrorRecord(
  persistence: ErrorRecordPersistence,
  record: PreparedErrorRecord
): Promise<PersistedErrorRecord> {
  const entry = toPersistenceEntry(record);
  const { INSERT } = cds.ql;

  await persistence.run(INSERT.into(ERROR_RECORDS_ENTITY).entries(entry));

  return entry;
}

function toPersistenceEntry(record: PreparedErrorRecord): PersistedErrorRecord {
  return {
    errorId: record.errorId,
    order_orderId: record.orderId ?? null,
    processingStage: record.processingStage,
    messageId: record.messageId,
    messageNumber: record.messageNumber,
    messageText: record.messageText,
    severity: record.severity,
    createdAt: normalizeTimestamp(record.createdAt),
    createdBy: record.createdBy,
    resolved: record.resolved,
    datasetVersion: record.datasetVersion
  };
}

function normalizeTimestamp(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

import cds from "@sap/cds";

import { ERROR_RECORDS_ENTITY, persistPreparedErrorRecord } from "../error-records/error-records.ts";

const SERVICE_ORDERS_ENTITY = "cap.poc.eh3.synthetic.ServiceOrders";
const STATUS_HISTORY_ENTITY = "cap.poc.eh3.synthetic.StatusHistory";

const MESSAGE_ID = "ZEH3_SVC_MSG";
const STATUS_MESSAGE_NUMBER = "100";
const STATUS_STAGE = "STATUS";
const CREATE_STAGE = "CREATE";
const ERROR_SEVERITY = "E";
const DEFAULT_CHANGED_BY = "STR139";
const DEFAULT_DATASET_VERSION = "V1.0";

export type LifecycleStatus = "CRT" | "RDY" | "CMP" | "CAN";

export interface LifecycleStatusOptions {
  now?: Date;
  changedBy?: string;
}

export interface LifecycleTransitionResult {
  orderId: string;
  changed: boolean;
  currentStatus: string | null;
  errorId: string | null;
  messageId: string | null;
  messageNumber: string | null;
  messageText: string | null;
}

export interface InitialHistoryResult {
  orderId: string;
  recorded: boolean;
  currentStatus: string | null;
  errorId: string | null;
  messageId: string | null;
  messageNumber: string | null;
  messageText: string | null;
}

interface PersistenceService {
  run(query: unknown): Promise<any>;
}

interface ServiceOrderRow {
  orderId: string;
  asset_assetId: string;
  requestingCompany_companyId: string;
  executingCompany_companyId: string | null;
  serviceType_serviceTypeCode: string;
  priority: string;
  requestedExecutionDate: string;
  currentLifecycleStatus: string;
  createdAt: string;
  changedAt: string;
  datasetVersion: string;
}

interface StatusHistoryRow {
  order_orderId: string;
  sequenceNo: number;
  oldStatus: string;
  newStatus: string;
  stage: string;
  changedAt: string;
  changedBy: string;
  reasonText: string;
  datasetVersion: string;
}

export class LifecycleStatusManager {
  readonly #db: PersistenceService;
  readonly #now: Date;
  readonly #changedBy: string;

  constructor(db: PersistenceService, options: LifecycleStatusOptions = {}) {
    this.#db = db;
    this.#now = options.now ?? new Date();
    this.#changedBy = options.changedBy ?? DEFAULT_CHANGED_BY;
  }

  async executeTransition(
    orderId: string,
    targetStatus: string,
    reasonText: string
  ): Promise<LifecycleTransitionResult> {
    const order = await this.#readOrder(orderId);

    if (!order) {
      return this.#createStatusError(
        orderId,
        null,
        `Order ${orderId} not found for status transition`
      );
    }

    if (!isTransitionAllowed(order.currentLifecycleStatus, targetStatus)) {
      return this.#createStatusError(
        orderId,
        order.currentLifecycleStatus,
        `Invalid lifecycle transition from ${order.currentLifecycleStatus} to ${targetStatus} for order ${orderId}`
      );
    }

    const changedAt = timestamp(this.#now);

    await this.#db.run(async (tx: PersistenceService) => {
      const { UPDATE } = cds.ql;
      const updated = await tx.run(
        UPDATE(SERVICE_ORDERS_ENTITY)
          .set({
            currentLifecycleStatus: targetStatus,
            changedAt
          })
          .where({ orderId })
      );

      if (Number(updated) !== 1) {
        throw new Error(`Order ${orderId} was not updated.`);
      }

      await this.#insertStatusHistory(tx, {
        order_orderId: orderId,
        sequenceNo: await this.#nextStatusHistorySequence(tx, orderId),
        oldStatus: order.currentLifecycleStatus,
        newStatus: targetStatus,
        stage: STATUS_STAGE,
        changedAt,
        changedBy: this.#changedBy,
        reasonText,
        datasetVersion: order.datasetVersion
      });
    });

    return {
      orderId,
      changed: true,
      currentStatus: targetStatus,
      errorId: null,
      messageId: null,
      messageNumber: null,
      messageText: null
    };
  }

  async recordInitialCreatedHistory(orderId: string, reasonText: string): Promise<InitialHistoryResult> {
    const order = await this.#readOrder(orderId);

    if (!order) {
      return this.#createInitialStatusError(
        orderId,
        null,
        `Order ${orderId} not found for initial CRT history`
      );
    }

    if (order.currentLifecycleStatus !== "CRT") {
      return this.#createInitialStatusError(
        orderId,
        order.currentLifecycleStatus,
        `Initial CRT history rejected for order ${orderId} with status ${order.currentLifecycleStatus}`
      );
    }

    const existingInitialHistory = await this.#readInitialCreatedHistory(orderId);

    if (existingInitialHistory.length > 0) {
      return this.#createInitialStatusError(
        orderId,
        order.currentLifecycleStatus,
        `Initial CRT history already exists for order ${orderId}`
      );
    }

    await this.#db.run(async (tx: PersistenceService) => {
      await this.#insertStatusHistory(tx, {
        order_orderId: orderId,
        sequenceNo: await this.#nextStatusHistorySequence(tx, orderId),
        oldStatus: "",
        newStatus: "CRT",
        stage: CREATE_STAGE,
        changedAt: timestamp(this.#now),
        changedBy: this.#changedBy,
        reasonText,
        datasetVersion: order.datasetVersion
      });
    });

    return {
      orderId,
      recorded: true,
      currentStatus: "CRT",
      errorId: null,
      messageId: null,
      messageNumber: null,
      messageText: null
    };
  }

  async #createStatusError(
    orderId: string,
    currentStatus: string | null,
    messageText: string
  ): Promise<LifecycleTransitionResult> {
    const error = await this.#persistStatusError(orderId, messageText);

    return {
      orderId,
      changed: false,
      currentStatus,
      errorId: error.errorId,
      messageId: MESSAGE_ID,
      messageNumber: STATUS_MESSAGE_NUMBER,
      messageText
    };
  }

  async #createInitialStatusError(
    orderId: string,
    currentStatus: string | null,
    messageText: string
  ): Promise<InitialHistoryResult> {
    const error = await this.#persistStatusError(orderId, messageText);

    return {
      orderId,
      recorded: false,
      currentStatus,
      errorId: error.errorId,
      messageId: MESSAGE_ID,
      messageNumber: STATUS_MESSAGE_NUMBER,
      messageText
    };
  }

  async #persistStatusError(orderId: string, messageText: string) {
    return persistPreparedErrorRecord(this.#db, {
      errorId: await this.#nextErrorId(),
      orderId,
      processingStage: STATUS_STAGE,
      messageId: MESSAGE_ID,
      messageNumber: STATUS_MESSAGE_NUMBER,
      messageText,
      severity: ERROR_SEVERITY,
      createdAt: this.#now,
      createdBy: this.#changedBy,
      resolved: false,
      datasetVersion: DEFAULT_DATASET_VERSION
    });
  }

  async #readOrder(orderId: string): Promise<ServiceOrderRow | undefined> {
    const { SELECT } = cds.ql;
    const rows = await this.#db.run(SELECT.from(SERVICE_ORDERS_ENTITY).where({ orderId }).limit(1));
    return rows[0] as ServiceOrderRow | undefined;
  }

  async #readInitialCreatedHistory(orderId: string): Promise<StatusHistoryRow[]> {
    const { SELECT } = cds.ql;
    return this.#db.run(
      SELECT.from(STATUS_HISTORY_ENTITY).where({
        order_orderId: orderId,
        oldStatus: "",
        newStatus: "CRT",
        stage: CREATE_STAGE
      })
    );
  }

  async #nextStatusHistorySequence(tx: PersistenceService, orderId: string): Promise<number> {
    const { SELECT } = cds.ql;
    const row = await tx.run(
      SELECT.one.from(STATUS_HISTORY_ENTITY).columns("max(sequenceNo) as maxSequenceNo").where({ order_orderId: orderId })
    );
    return Number(row?.maxSequenceNo ?? 0) + 1;
  }

  async #nextErrorId(): Promise<string> {
    const { SELECT } = cds.ql;
    const row = await this.#db.run(SELECT.one.from(ERROR_RECORDS_ENTITY).columns("max(errorId) as maxErrorId"));
    const next = Number(row?.maxErrorId ?? 0) + 1;
    return next.toString().padStart(10, "0");
  }

  async #insertStatusHistory(tx: PersistenceService, row: StatusHistoryRow): Promise<void> {
    const { INSERT } = cds.ql;
    await tx.run(INSERT.into(STATUS_HISTORY_ENTITY).entries(row));
  }
}

function isTransitionAllowed(currentStatus: string, targetStatus: string): boolean {
  if (!isKnownStatus(currentStatus) || !isKnownStatus(targetStatus)) return false;
  if (currentStatus === "CRT") return targetStatus === "RDY" || targetStatus === "CAN";
  if (currentStatus === "RDY") return targetStatus === "CMP" || targetStatus === "CAN";
  return false;
}

function isKnownStatus(status: string): status is LifecycleStatus {
  return status === "CRT" || status === "RDY" || status === "CMP" || status === "CAN";
}

function timestamp(value: Date): string {
  return value.toISOString();
}

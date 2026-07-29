import cds from "@sap/cds";

import { ERROR_RECORDS_ENTITY, persistPreparedErrorRecord } from "../error-records/error-records.ts";

const SERVICE_ORDERS_ENTITY = "cap.poc.eh3.synthetic.ServiceOrders";
const SYNTHETIC_ASSETS_ENTITY = "cap.poc.eh3.synthetic.SyntheticAssets";
const RESPONSIBILITY_RULES_ENTITY = "cap.poc.eh3.synthetic.ResponsibilityRules";

const MESSAGE_ID = "ZEH3_SVC_MSG";
const RESPONSIBILITY_STAGE = "RESP";
const ERROR_SEVERITY = "E";
const DEFAULT_CREATED_BY = "STR138";

export interface ResponsibilityDeterminationOptions {
  now?: Date;
  createdBy?: string;
}

export interface ResponsibilityDeterminationResult {
  orderId: string;
  determined: boolean;
  executingCompanyId: string | null;
  errorId: string | null;
}

interface PersistenceService {
  run(query: unknown): Promise<any>;
}

interface ServiceOrderRow {
  orderId: string;
  asset_assetId: string | null;
  requestingCompany_companyId: string | null;
  executingCompany_companyId: string | null;
  serviceType_serviceTypeCode: string | null;
  priority: string | null;
  datasetVersion: string;
}

interface DeterminableServiceOrderRow extends ServiceOrderRow {
  asset_assetId: string;
  requestingCompany_companyId: string;
  serviceType_serviceTypeCode: string;
  priority: string;
}

interface AssetRow {
  assetId: string;
  region: string | null;
}

interface ResponsibilityRuleRow {
  ruleId: string;
  executingCompany_companyId: string | null;
}

export class ResponsibilityDeterminer {
  readonly #db: PersistenceService;
  readonly #now: Date;
  readonly #createdBy: string;

  constructor(db: PersistenceService, options: ResponsibilityDeterminationOptions = {}) {
    this.#db = db;
    this.#now = options.now ?? new Date();
    this.#createdBy = options.createdBy ?? DEFAULT_CREATED_BY;
  }

  async determineForValidatedOrder(orderId: string | null | undefined): Promise<ResponsibilityDeterminationResult> {
    if (!orderId) {
      throw new Error("Order ID is required for responsibility determination.");
    }

    const order = await this.#readOne<ServiceOrderRow>(SERVICE_ORDERS_ENTITY, { orderId });

    if (!order) {
      throw new Error(`Order ${orderId} was not found.`);
    }

    const determinableOrder = ensureOrderInput(order);

    const asset = await this.#readOne<AssetRow>(SYNTHETIC_ASSETS_ENTITY, { assetId: determinableOrder.asset_assetId });

    if (!asset?.region) {
      throw new Error(`Asset ${determinableOrder.asset_assetId} does not provide a responsibility region.`);
    }

    const rules = await this.#readActiveResponsibilityRules(determinableOrder, asset.region);

    if (rules.length === 0) {
      const errorId = await this.#createResponsibilityError(
        determinableOrder,
        "040",
        "No executing company rule found"
      );

      return {
        orderId,
        determined: false,
        executingCompanyId: null,
        errorId
      };
    }

    if (rules.length > 1) {
      const errorId = await this.#createResponsibilityError(
        determinableOrder,
        "041",
        "Multiple executing company rules found"
      );

      return {
        orderId,
        determined: false,
        executingCompanyId: null,
        errorId
      };
    }

    const [rule] = rules;

    if (!rule.executingCompany_companyId) {
      throw new Error(`Responsibility rule ${rule.ruleId} has no executing company.`);
    }

    return {
      orderId,
      determined: true,
      executingCompanyId: rule.executingCompany_companyId,
      errorId: null
    };
  }

  async #readActiveResponsibilityRules(
    order: DeterminableServiceOrderRow,
    assetRegion: string
  ): Promise<ResponsibilityRuleRow[]> {
    const { SELECT } = cds.ql;
    return this.#db.run(
      SELECT.from(RESPONSIBILITY_RULES_ENTITY)
        .columns("ruleId", "executingCompany_companyId")
        .where({
          requestingCompany_companyId: order.requestingCompany_companyId,
          assetRegion,
          serviceType_serviceTypeCode: order.serviceType_serviceTypeCode,
          priority: order.priority,
          active: true
        })
        .orderBy("ruleId")
    );
  }

  async #createResponsibilityError(
    order: ServiceOrderRow,
    messageNumber: string,
    messageText: string
  ): Promise<string> {
    const errorId = await this.#nextErrorId();

    await persistPreparedErrorRecord(this.#db, {
      errorId,
      orderId: order.orderId,
      processingStage: RESPONSIBILITY_STAGE,
      messageId: MESSAGE_ID,
      messageNumber,
      messageText,
      severity: ERROR_SEVERITY,
      createdAt: this.#now,
      createdBy: this.#createdBy,
      resolved: false,
      datasetVersion: order.datasetVersion
    });

    return errorId;
  }

  async #nextErrorId(): Promise<string> {
    const { SELECT } = cds.ql;
    const row = await this.#db.run(SELECT.one.from(ERROR_RECORDS_ENTITY).columns("max(errorId) as maxErrorId"));
    const next = Number(row?.maxErrorId ?? 0) + 1;
    return next.toString().padStart(10, "0");
  }

  async #readOne<T>(entity: string, where: Record<string, string>): Promise<T | undefined> {
    const { SELECT } = cds.ql;
    const rows = await this.#db.run(SELECT.from(entity).where(where).limit(1));
    return rows[0] as T | undefined;
  }
}

function ensureOrderInput(order: ServiceOrderRow): DeterminableServiceOrderRow {
  if (
    !order.requestingCompany_companyId ||
    !order.asset_assetId ||
    !order.serviceType_serviceTypeCode ||
    !order.priority
  ) {
    throw new Error(`Order ${order.orderId} is missing responsibility determination input.`);
  }

  return order as DeterminableServiceOrderRow;
}

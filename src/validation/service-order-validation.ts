import cds from "@sap/cds";

import { ERROR_RECORDS_ENTITY, persistPreparedErrorRecord } from "../error-records/error-records.ts";

const SERVICE_ORDERS_ENTITY = "cap.poc.eh3.synthetic.ServiceOrders";
const SYNTHETIC_ASSETS_ENTITY = "cap.poc.eh3.synthetic.SyntheticAssets";
const SYNTHETIC_COMPANIES_ENTITY = "cap.poc.eh3.synthetic.SyntheticCompanies";
const SERVICE_TYPES_ENTITY = "cap.poc.eh3.synthetic.ServiceTypes";

const MESSAGE_ID = "ZEH3_SVC_MSG";
const VALIDATION_STAGE = "VALID";
const ERROR_SEVERITY = "E";
const DEFAULT_CREATED_BY = "STR137";

export interface ServiceOrderValidationOptions {
  now?: Date;
  createdBy?: string;
}

export interface ValidationIssue {
  errorId: string;
  messageId: string;
  messageNumber: string;
  messageText: string;
  severity: string;
}

export interface ServiceOrderValidationResult {
  orderId: string | null;
  valid: boolean;
  issues: ValidationIssue[];
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
  requestedExecutionDate: string | null;
  currentLifecycleStatus: string;
  datasetVersion: string;
}

interface AssetRow {
  assetId: string;
  active: boolean;
  blocked: boolean;
  inspectionAllowed: boolean;
  repairAllowed: boolean;
  emergencyServiceAllowed: boolean;
}

interface CompanyRow {
  companyId: string;
  canRequest: boolean;
}

interface ServiceTypeRow {
  serviceTypeCode: string;
  active: boolean;
}

export class ServiceOrderValidator {
  readonly #db: PersistenceService;
  readonly #now: Date;
  readonly #createdBy: string;

  constructor(db: PersistenceService, options: ServiceOrderValidationOptions = {}) {
    this.#db = db;
    this.#now = options.now ?? new Date();
    this.#createdBy = options.createdBy ?? DEFAULT_CREATED_BY;
  }

  async validateOrder(orderId: string | null | undefined): Promise<ServiceOrderValidationResult> {
    const issues: ValidationIssue[] = [];

    if (!orderId) {
      await this.#addError(issues, null, "027", "Order ID is missing", "V1.0");
      return { orderId: orderId ?? null, valid: false, issues };
    }

    const order = await this.#readOne<ServiceOrderRow>(SERVICE_ORDERS_ENTITY, { orderId });

    if (!order) {
      await this.#addError(issues, orderId, "026", `Order ${orderId} was not found`, "V1.0");
      return { orderId, valid: false, issues };
    }

    if (!order.asset_assetId) {
      await this.#addError(issues, orderId, "028", `Asset ID is missing for order ${orderId}`, order.datasetVersion);
    }

    if (!order.requestingCompany_companyId) {
      await this.#addError(issues, orderId, "020", "Missing requesting company", order.datasetVersion);
    }

    if (!order.serviceType_serviceTypeCode) {
      await this.#addError(issues, orderId, "029", `Service type is missing for order ${orderId}`, order.datasetVersion);
    }

    if (!order.priority) {
      await this.#addError(issues, orderId, "030", `Priority is missing for order ${orderId}`, order.datasetVersion);
    }

    if (!order.requestedExecutionDate) {
      await this.#addError(issues, orderId, "031", `Requested date is missing for order ${orderId}`, order.datasetVersion);
    }

    const asset = order.asset_assetId
      ? await this.#readOne<AssetRow>(SYNTHETIC_ASSETS_ENTITY, { assetId: order.asset_assetId })
      : undefined;

    let assetFound = false;
    let assetIsActive = false;
    let assetIsBlocked = false;

    if (order.asset_assetId) {
      if (!asset) {
        await this.#addError(issues, orderId, "021", "Unknown asset", order.datasetVersion);
      } else {
        assetFound = true;
        assetIsActive = asset.active;
        assetIsBlocked = asset.blocked;

        if (!assetIsActive) {
          await this.#addError(issues, orderId, "032", `Asset ${order.asset_assetId} is inactive`, order.datasetVersion);
        }

        if (assetIsBlocked) {
          await this.#addError(issues, orderId, "022", "Blocked asset", order.datasetVersion);
        }
      }
    }

    if (order.requestingCompany_companyId) {
      const company = await this.#readOne<CompanyRow>(SYNTHETIC_COMPANIES_ENTITY, {
        companyId: order.requestingCompany_companyId
      });

      if (!company) {
        await this.#addError(
          issues,
          orderId,
          "033",
          `Requesting company ${order.requestingCompany_companyId} is unknown`,
          order.datasetVersion
        );
      } else if (!company.canRequest) {
        await this.#addError(
          issues,
          orderId,
          "034",
          `Requesting company ${order.requestingCompany_companyId} is not allowed to request service`,
          order.datasetVersion
        );
      }
    }

    const serviceType = order.serviceType_serviceTypeCode
      ? await this.#readOne<ServiceTypeRow>(SERVICE_TYPES_ENTITY, { serviceTypeCode: order.serviceType_serviceTypeCode })
      : undefined;

    let serviceTypeFound = false;
    let serviceTypeIsActive = false;

    if (order.serviceType_serviceTypeCode) {
      if (!serviceType) {
        await this.#addError(
          issues,
          orderId,
          "035",
          `Service type ${order.serviceType_serviceTypeCode} is unknown`,
          order.datasetVersion
        );
      } else {
        serviceTypeFound = true;
        serviceTypeIsActive = serviceType.active;

        if (!serviceTypeIsActive) {
          await this.#addError(
            issues,
            orderId,
            "036",
            `Service type ${order.serviceType_serviceTypeCode} is inactive`,
            order.datasetVersion
          );
        }
      }
    }

    if (
      asset &&
      assetFound &&
      assetIsActive &&
      !assetIsBlocked &&
      serviceTypeFound &&
      serviceTypeIsActive &&
      !isServiceAllowedForAsset(asset, order.serviceType_serviceTypeCode)
    ) {
      await this.#addError(issues, orderId, "023", "Service type not allowed for asset", order.datasetVersion);
    }

    if (order.priority && !isPriorityValid(order.priority)) {
      await this.#addError(issues, orderId, "024", "Invalid priority", order.datasetVersion);
    }

    if (order.requestedExecutionDate && order.requestedExecutionDate < toDateOnly(this.#now)) {
      await this.#addError(issues, orderId, "025", "Requested date violates rule", order.datasetVersion);
    }

    return { orderId, valid: issues.length === 0, issues };
  }

  async #addError(
    issues: ValidationIssue[],
    orderId: string | null,
    messageNumber: string,
    messageText: string,
    datasetVersion: string
  ): Promise<void> {
    const errorId = await this.#nextErrorId();

    await persistPreparedErrorRecord(this.#db, {
      errorId,
      orderId,
      processingStage: VALIDATION_STAGE,
      messageId: MESSAGE_ID,
      messageNumber,
      messageText,
      severity: ERROR_SEVERITY,
      createdAt: this.#now,
      createdBy: this.#createdBy,
      resolved: false,
      datasetVersion
    });

    issues.push({
      errorId,
      messageId: MESSAGE_ID,
      messageNumber,
      messageText,
      severity: ERROR_SEVERITY
    });
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

function isPriorityValid(priority: string): boolean {
  return priority === "LOW" || priority === "NORM" || priority === "EMER";
}

function isServiceAllowedForAsset(asset: AssetRow, serviceTypeCode: string | null): boolean {
  if (serviceTypeCode === "INSP") return asset.inspectionAllowed;
  if (serviceTypeCode === "REPR") return asset.repairAllowed;
  if (serviceTypeCode === "EMRG") return asset.emergencyServiceAllowed;
  return true;
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

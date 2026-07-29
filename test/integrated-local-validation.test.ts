import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import cds from "@sap/cds";

import { LifecycleStatusManager } from "../src/lifecycle/lifecycle-status.ts";
import { ResponsibilityDeterminer } from "../src/responsibility/responsibility-determination.ts";
import { ServiceOrderValidator } from "../src/validation/service-order-validation.ts";

const SERVICE_ORDERS_ENTITY = "ServiceOrderService.ServiceOrders";
const SERVICE_STATUS_HISTORY_ENTITY = "ServiceOrderService.StatusHistory";
const SERVICE_ERROR_RECORDS_ENTITY = "ServiceOrderService.ErrorRecords";
const PERSISTENCE_SERVICE_ORDERS_ENTITY = "cap.poc.eh3.synthetic.ServiceOrders";

test("STR-140 integrated positive vertical slice is deterministic across reruns", async () => {
  const first = await runPositiveIntegratedScenario("RUN1");
  const second = await runPositiveIntegratedScenario("RUN2");

  assert.deepEqual(second.summary, first.summary);
});

test("STR-140 integrated negative evidence uses VALID, RESP and STATUS ErrorRecords", async () => {
  const fixture = await createIntegratedFixture("negative");

  try {
    const { SELECT } = cds.ql;
    const validator = new ServiceOrderValidator(fixture.db, deterministicOptions());
    const determiner = new ResponsibilityDeterminer(fixture.db, deterministicOptions());
    const lifecycle = new LifecycleStatusManager(fixture.db, lifecycleOptions());

    await insertServiceOrder(fixture.db, serviceOrder("I140VALNEG", {
      asset_assetId: "A200-XCMP",
      requestingCompany_companyId: "C400",
      serviceType_serviceTypeCode: "INSP",
      priority: "NORM",
      requestedExecutionDate: "2026-01-15",
      currentLifecycleStatus: "CRT"
    }));
    await insertServiceOrder(fixture.db, serviceOrder("I140RESPNO", {
      asset_assetId: "A100-LOCAL",
      requestingCompany_companyId: "C100",
      serviceType_serviceTypeCode: "EMRG",
      priority: "NORM",
      requestedExecutionDate: "2026-08-15",
      currentLifecycleStatus: "CRT"
    }));
    await insertServiceOrder(fixture.db, serviceOrder("I140STATUS", {
      currentLifecycleStatus: "CRT"
    }));

    const validation = await validator.validateOrder("I140VALNEG");
    const responsibility = await determiner.determineForValidatedOrder("I140RESPNO");
    const invalidTransition = await lifecycle.executeTransition("I140STATUS", "CMP", "CRT to CMP rejected");
    const initialHistory = await lifecycle.recordInitialCreatedHistory("I140STATUS", "Initial CRT history");
    const duplicateInitial = await lifecycle.recordInitialCreatedHistory("I140STATUS", "Duplicate initial CRT history");

    assert.equal(validation.valid, false);
    assert.deepEqual(validation.issues.map((issue) => issue.messageNumber), ["034", "023", "025"]);
    assert.deepEqual(responsibility, {
      orderId: "I140RESPNO",
      determined: false,
      executingCompanyId: null,
      errorId: "0000000004"
    });
    assert.equal(invalidTransition.changed, false);
    assert.equal(invalidTransition.errorId, "0000000005");
    assert.equal(initialHistory.recorded, true);
    assert.equal(duplicateInitial.recorded, false);
    assert.equal(duplicateInitial.errorId, "0000000006");

    const errors = await fixture.service.run(SELECT.from(SERVICE_ERROR_RECORDS_ENTITY).orderBy("errorId"));
    assert.deepEqual(
      errors.map((row: any) => [row.errorId, row.order_orderId, row.processingStage, row.messageNumber]),
      [
        ["0000000001", "I140VALNEG", "VALID", "034"],
        ["0000000002", "I140VALNEG", "VALID", "023"],
        ["0000000003", "I140VALNEG", "VALID", "025"],
        ["0000000004", "I140RESPNO", "RESP", "040"],
        ["0000000005", "I140STATUS", "STATUS", "100"],
        ["0000000006", "I140STATUS", "STATUS", "100"]
      ]
    );

    const statusOrder = await readServiceOrder(fixture.service, "I140STATUS");
    assert.equal(statusOrder.currentLifecycleStatus, "CRT");

    const history = await fixture.service.run(
      SELECT.from(SERVICE_STATUS_HISTORY_ENTITY).where({ order_orderId: "I140STATUS" }).orderBy("sequenceNo")
    );
    assert.deepEqual(
      history.map((row: any) => [row.sequenceNo, row.oldStatus, row.newStatus, row.stage]),
      [[1, "", "CRT", "CREATE"]]
    );
  } finally {
    await fixture.cleanup();
  }
});

test("STR-140 deterministic local reset is stable across two runs", { skip: process.env.STR140_VALIDATE_LOCAL !== "1" }, () => {
  const first = resetLocalAndCollectCounts();
  const second = resetLocalAndCollectCounts();

  assert.deepEqual(second, first);
  assert.deepEqual(first, {
    "cap.poc.eh3.synthetic.SyntheticCompanies": 4,
    "cap.poc.eh3.synthetic.SyntheticAssets": 7,
    "cap.poc.eh3.synthetic.ServiceTypes": 4,
    "cap.poc.eh3.synthetic.ResponsibilityRules": 7,
    "cap.poc.eh3.synthetic.ServiceOrders": 0,
    "cap.poc.eh3.synthetic.StatusHistory": 0,
    "cap.poc.eh3.synthetic.ErrorRecords": 0
  });
});

async function runPositiveIntegratedScenario(label: string) {
  const fixture = await createIntegratedFixture(label);

  try {
    const { SELECT } = cds.ql;
    const validator = new ServiceOrderValidator(fixture.db, deterministicOptions());
    const determiner = new ResponsibilityDeterminer(fixture.db, deterministicOptions());
    const lifecycle = new LifecycleStatusManager(fixture.db, lifecycleOptions());

    await insertServiceOrder(fixture.db, serviceOrder("I140FLOW01", {
      asset_assetId: "A200-XCMP",
      requestingCompany_companyId: "C100",
      serviceType_serviceTypeCode: "REPR",
      priority: "NORM",
      requestedExecutionDate: "2026-08-15",
      currentLifecycleStatus: "CRT"
    }));
    await insertServiceOrder(fixture.db, serviceOrder("I140CANCEL", {
      currentLifecycleStatus: "CRT"
    }));

    const validation = await validator.validateOrder("I140FLOW01");
    const responsibility = await determiner.determineForValidatedOrder("I140FLOW01");
    const beforeResponsibilityOrder = await readServiceOrder(fixture.service, "I140FLOW01");
    const initial = await lifecycle.recordInitialCreatedHistory("I140FLOW01", "Initial CRT history");
    const ready = await lifecycle.executeTransition("I140FLOW01", "RDY", "CRT to RDY");
    const completed = await lifecycle.executeTransition("I140FLOW01", "CMP", "RDY to CMP");
    const createdCancelled = await lifecycle.executeTransition("I140CANCEL", "CAN", "CRT to CAN");

    assert.equal(validation.valid, true);
    assert.deepEqual(validation.issues, []);
    assert.equal(responsibility.determined, true);
    assert.equal(responsibility.executingCompanyId, "C200");
    assert.equal(responsibility.errorId, null);
    assert.equal(beforeResponsibilityOrder.executingCompany_companyId, null);
    assert.equal(initial.recorded, true);
    assert.equal(ready.changed, true);
    assert.equal(completed.changed, true);
    assert.equal(createdCancelled.changed, true);

    const flowOrder = await readServiceOrder(fixture.service, "I140FLOW01");
    const cancelOrder = await readServiceOrder(fixture.service, "I140CANCEL");
    const flowHistory = await fixture.service.run(
      SELECT.from(SERVICE_STATUS_HISTORY_ENTITY).where({ order_orderId: "I140FLOW01" }).orderBy("sequenceNo")
    );
    const cancelHistory = await fixture.service.run(
      SELECT.from(SERVICE_STATUS_HISTORY_ENTITY).where({ order_orderId: "I140CANCEL" }).orderBy("sequenceNo")
    );
    const errors = await fixture.service.run(SELECT.from(SERVICE_ERROR_RECORDS_ENTITY).orderBy("errorId"));

    assert.equal(flowOrder.executingCompany_companyId, null);
    assert.equal(flowOrder.currentLifecycleStatus, "CMP");
    assert.equal(cancelOrder.currentLifecycleStatus, "CAN");
    assert.deepEqual(errors, []);

    const summary = {
      validationValid: validation.valid,
      responsibilityDetermined: responsibility.determined,
      returnedExecutingCompany: responsibility.executingCompanyId,
      persistedExecutingCompany: flowOrder.executingCompany_companyId,
      flowStatus: flowOrder.currentLifecycleStatus,
      cancelStatus: cancelOrder.currentLifecycleStatus,
      flowHistory: flowHistory.map((row: any) => [row.sequenceNo, row.oldStatus, row.newStatus, row.stage]),
      cancelHistory: cancelHistory.map((row: any) => [row.sequenceNo, row.oldStatus, row.newStatus, row.stage]),
      errorCount: errors.length
    };

    assert.deepEqual(summary, {
      validationValid: true,
      responsibilityDetermined: true,
      returnedExecutingCompany: "C200",
      persistedExecutingCompany: null,
      flowStatus: "CMP",
      cancelStatus: "CAN",
      flowHistory: [
        [1, "", "CRT", "CREATE"],
        [2, "CRT", "RDY", "STATUS"],
        [3, "RDY", "CMP", "STATUS"]
      ],
      cancelHistory: [[1, "CRT", "CAN", "STATUS"]],
      errorCount: 0
    });

    return { summary };
  } finally {
    await fixture.cleanup();
  }
}

async function createIntegratedFixture(label: string) {
  const dbFile = join(tmpdir(), `cap-poc-ai-str-140-${label}-${process.pid}-${Date.now()}-${Math.random()}.sqlite`);
  resetCdsRuntimeState();
  const model = await cds.load(["db/schema.cds", "srv/service-order-service.cds"]);
  const db = await cds.connect.to({
    kind: "sqlite",
    credentials: {
      url: dbFile
    },
    model
  });

  await cds.deploy(model).to(db, { silent: true });
  const service = await cds.serve("ServiceOrderService").from(model);

  return {
    db,
    service,
    async cleanup() {
      await db.disconnect?.();
      await cds.disconnect();
      resetCdsRuntimeState();
      try {
        rmSync(dbFile, { force: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EPERM") {
          throw error;
        }
      }
    }
  };
}

function deterministicOptions() {
  return {
    now: new Date("2026-07-29T12:00:00.000Z"),
    createdBy: "STR140"
  };
}

function lifecycleOptions() {
  return {
    now: new Date("2026-07-29T12:00:00.000Z"),
    changedBy: "STR140"
  };
}

function serviceOrder(orderId: string, overrides: Record<string, unknown> = {}) {
  return {
    orderId,
    asset_assetId: "A100-LOCAL",
    requestingCompany_companyId: "C100",
    executingCompany_companyId: null,
    serviceType_serviceTypeCode: "INSP",
    priority: "NORM",
    requestedExecutionDate: "2026-08-15",
    currentLifecycleStatus: "CRT",
    createdAt: "2026-07-29T10:00:00.000Z",
    changedAt: "2026-07-29T10:00:00.000Z",
    datasetVersion: "V1.0",
    ...overrides
  };
}

async function insertServiceOrder(db: any, order: Record<string, unknown>) {
  const { INSERT } = cds.ql;
  await db.run(INSERT.into(PERSISTENCE_SERVICE_ORDERS_ENTITY).entries(order));
}

async function readServiceOrder(service: any, orderId: string) {
  const { SELECT } = cds.ql;
  const rows = await service.run(SELECT.from(SERVICE_ORDERS_ENTITY).where({ orderId }).limit(1));
  assert.equal(rows.length, 1);
  return rows[0];
}

function resetLocalAndCollectCounts() {
  const resetScript = resolve("scripts", "reset-local.mjs");
  const output = execFileSync(process.execPath, [resetScript], {
    encoding: "utf8"
  });
  const counts: Record<string, number> = {};

  for (const line of output.split(/\r?\n/)) {
    const match = /^(cap\.poc\.eh3\.synthetic\.[A-Za-z]+): (\d+)$/.exec(line.trim());
    if (match) counts[match[1]] = Number(match[2]);
  }

  return counts;
}

function resetCdsRuntimeState() {
  delete cds.db;
  delete cds.model;
  delete cds.services.db;
  delete cds.services.ServiceOrderService;
}

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import cds from "@sap/cds";

import { ServiceOrderValidator } from "../src/validation/service-order-validation.ts";

const SERVICE_ORDERS_ENTITY = "ServiceOrderService.ServiceOrders";
const SERVICE_STATUS_HISTORY_ENTITY = "ServiceOrderService.StatusHistory";
const SERVICE_ERROR_RECORDS_ENTITY = "ServiceOrderService.ErrorRecords";
const PERSISTENCE_SERVICE_ORDERS_ENTITY = "cap.poc.eh3.synthetic.ServiceOrders";

test("positive validation creates no ErrorRecords and changes no state", async () => {
  const fixture = await createValidationFixture();

  try {
    const { SELECT } = cds.ql;
    const validator = new ServiceOrderValidator(fixture.db, validationOptions());

    await insertServiceOrder(fixture.db, {
      orderId: "ORD137POS001",
      asset_assetId: "A100-LOCAL",
      requestingCompany_companyId: "C100",
      executingCompany_companyId: null,
      serviceType_serviceTypeCode: "INSP",
      priority: "NORM",
      requestedExecutionDate: "2026-08-15",
      currentLifecycleStatus: "CRT",
      createdAt: "2026-07-29T10:00:00.000Z",
      changedAt: "2026-07-29T10:00:00.000Z",
      datasetVersion: "V1.0"
    });

    const orderBefore = await readServiceOrder(fixture.service, "ORD137POS001");
    const statusHistoryBefore = await fixture.service.run(SELECT.from(SERVICE_STATUS_HISTORY_ENTITY));

    const result = await validator.validateOrder("ORD137POS001");

    assert.equal(result.valid, true);
    assert.deepEqual(result.issues, []);
    assert.deepEqual(await fixture.service.run(SELECT.from(SERVICE_ERROR_RECORDS_ENTITY)), []);
    assert.deepEqual(await readServiceOrder(fixture.service, "ORD137POS001"), orderBefore);
    assert.deepEqual(await fixture.service.run(SELECT.from(SERVICE_STATUS_HISTORY_ENTITY)), statusHistoryBefore);
  } finally {
    await fixture.cleanup();
  }
});

test("negative validation persists deterministic ErrorRecord evidence without changing order state", async () => {
  const fixture = await createValidationFixture();

  try {
    const { SELECT } = cds.ql;
    const validator = new ServiceOrderValidator(fixture.db, validationOptions());

    await insertServiceOrder(fixture.db, {
      orderId: "ORD137NEG001",
      asset_assetId: "A200-XCMP",
      requestingCompany_companyId: "C400",
      executingCompany_companyId: null,
      serviceType_serviceTypeCode: "INSP",
      priority: "NORM",
      requestedExecutionDate: "2026-01-15",
      currentLifecycleStatus: "CRT",
      createdAt: "2026-07-29T10:00:00.000Z",
      changedAt: "2026-07-29T10:00:00.000Z",
      datasetVersion: "V1.0"
    });

    const orderBefore = await readServiceOrder(fixture.service, "ORD137NEG001");
    const statusHistoryBefore = await fixture.service.run(SELECT.from(SERVICE_STATUS_HISTORY_ENTITY));

    const result = await validator.validateOrder("ORD137NEG001");

    assert.equal(result.valid, false);
    assert.deepEqual(
      result.issues.map((issue) => issue.messageNumber),
      ["034", "023", "025"]
    );
    assert.deepEqual(
      result.issues.map((issue) => issue.errorId),
      ["0000000001", "0000000002", "0000000003"]
    );

    const evidenceRows = await fixture.service.run(
      SELECT.from(SERVICE_ERROR_RECORDS_ENTITY).orderBy("errorId")
    );

    assert.equal(evidenceRows.length, 3);
    assert.deepEqual(
      evidenceRows.map((row: any) => row.messageNumber),
      ["034", "023", "025"]
    );
    assert.deepEqual(
      evidenceRows.map((row: any) => row.processingStage),
      ["VALID", "VALID", "VALID"]
    );
    assert.deepEqual(
      evidenceRows.map((row: any) => row.messageId),
      ["ZEH3_SVC_MSG", "ZEH3_SVC_MSG", "ZEH3_SVC_MSG"]
    );
    assert.deepEqual(
      evidenceRows.map((row: any) => row.order_orderId),
      ["ORD137NEG001", "ORD137NEG001", "ORD137NEG001"]
    );

    const orderAfter = await readServiceOrder(fixture.service, "ORD137NEG001");
    assert.deepEqual(orderAfter, orderBefore);
    assert.equal(orderAfter.currentLifecycleStatus, "CRT");
    assert.equal(orderAfter.executingCompany_companyId, null);
    assert.deepEqual(await fixture.service.run(SELECT.from(SERVICE_STATUS_HISTORY_ENTITY)), statusHistoryBefore);
  } finally {
    await fixture.cleanup();
  }
});

test("local reset restores deterministic baseline after validation evidence", () => {
  const resetScript = resolve("scripts", "reset-local.mjs");
  const output = execFileSync(process.execPath, [resetScript], {
    encoding: "utf8"
  });

  assert.match(output, /cap\.poc\.eh3\.synthetic\.ServiceOrders: 0/);
  assert.match(output, /cap\.poc\.eh3\.synthetic\.StatusHistory: 0/);
  assert.match(output, /cap\.poc\.eh3\.synthetic\.ErrorRecords: 0/);
  assert.match(output, /Local SQLite reset completed with deterministic row counts\./);
});

async function createValidationFixture() {
  const dbFile = join(tmpdir(), `cap-poc-ai-str-137-${process.pid}-${Date.now()}-${Math.random()}.sqlite`);
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

function resetCdsRuntimeState() {
  delete cds.db;
  delete cds.model;
  delete cds.services.db;
  delete cds.services.ServiceOrderService;
}

function validationOptions() {
  return {
    now: new Date("2026-07-29T12:00:00.000Z"),
    createdBy: "STR137"
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

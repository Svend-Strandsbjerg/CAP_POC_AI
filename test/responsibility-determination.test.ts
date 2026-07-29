import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import cds from "@sap/cds";

import { ResponsibilityDeterminer } from "../src/responsibility/responsibility-determination.ts";
import { ServiceOrderValidator } from "../src/validation/service-order-validation.ts";

const SERVICE_ORDERS_ENTITY = "ServiceOrderService.ServiceOrders";
const SERVICE_STATUS_HISTORY_ENTITY = "ServiceOrderService.StatusHistory";
const SERVICE_ERROR_RECORDS_ENTITY = "ServiceOrderService.ErrorRecords";
const PERSISTENCE_SERVICE_ORDERS_ENTITY = "cap.poc.eh3.synthetic.ServiceOrders";

test("responsibility determination returns single executing company without mutating the order", async () => {
  const fixture = await createResponsibilityFixture();

  try {
    const { SELECT } = cds.ql;
    const validator = new ServiceOrderValidator(fixture.db, deterministicOptions());
    const determiner = new ResponsibilityDeterminer(fixture.db, deterministicOptions());

    await insertServiceOrder(fixture.db, {
      orderId: "ORD138POS001",
      asset_assetId: "A200-XCMP",
      requestingCompany_companyId: "C100",
      executingCompany_companyId: null,
      serviceType_serviceTypeCode: "REPR",
      priority: "NORM",
      requestedExecutionDate: "2026-08-15",
      currentLifecycleStatus: "CRT",
      createdAt: "2026-07-29T10:00:00.000Z",
      changedAt: "2026-07-29T10:00:00.000Z",
      datasetVersion: "V1.0"
    });

    const validationBefore = await validator.validateOrder("ORD138POS001");
    assert.equal(validationBefore.valid, true);

    const orderBefore = await readServiceOrder(fixture.service, "ORD138POS001");
    const statusHistoryBefore = await fixture.service.run(SELECT.from(SERVICE_STATUS_HISTORY_ENTITY));

    const result = await determiner.determineForValidatedOrder("ORD138POS001");

    assert.deepEqual(result, {
      orderId: "ORD138POS001",
      determined: true,
      executingCompanyId: "C200",
      errorId: null
    });
    assert.deepEqual(await fixture.service.run(SELECT.from(SERVICE_ERROR_RECORDS_ENTITY)), []);
    assert.deepEqual(await readServiceOrder(fixture.service, "ORD138POS001"), orderBefore);
    assert.equal(orderBefore.currentLifecycleStatus, "CRT");
    assert.equal(orderBefore.executingCompany_companyId, null);
    assert.deepEqual(await fixture.service.run(SELECT.from(SERVICE_STATUS_HISTORY_ENTITY)), statusHistoryBefore);

    const validationAfter = await validator.validateOrder("ORD138POS001");
    assert.equal(validationAfter.valid, true);
    assert.deepEqual(validationAfter.issues, []);
  } finally {
    await fixture.cleanup();
  }
});

test("responsibility determination persists no-match RESP evidence without changing lifecycle state", async () => {
  const fixture = await createResponsibilityFixture();

  try {
    const { SELECT } = cds.ql;
    const determiner = new ResponsibilityDeterminer(fixture.db, deterministicOptions());

    await insertServiceOrder(fixture.db, {
      orderId: "ORD138NOM001",
      asset_assetId: "A100-LOCAL",
      requestingCompany_companyId: "C100",
      executingCompany_companyId: null,
      serviceType_serviceTypeCode: "EMRG",
      priority: "NORM",
      requestedExecutionDate: "2026-08-15",
      currentLifecycleStatus: "CRT",
      createdAt: "2026-07-29T10:00:00.000Z",
      changedAt: "2026-07-29T10:00:00.000Z",
      datasetVersion: "V1.0"
    });

    const orderBefore = await readServiceOrder(fixture.service, "ORD138NOM001");
    const statusHistoryBefore = await fixture.service.run(SELECT.from(SERVICE_STATUS_HISTORY_ENTITY));

    const result = await determiner.determineForValidatedOrder("ORD138NOM001");

    assert.deepEqual(result, {
      orderId: "ORD138NOM001",
      determined: false,
      executingCompanyId: null,
      errorId: "0000000001"
    });

    const evidenceRows = await fixture.service.run(SELECT.from(SERVICE_ERROR_RECORDS_ENTITY).orderBy("errorId"));
    assert.equal(evidenceRows.length, 1);
    assert.equal(evidenceRows[0].errorId, "0000000001");
    assert.equal(evidenceRows[0].order_orderId, "ORD138NOM001");
    assert.equal(evidenceRows[0].processingStage, "RESP");
    assert.equal(evidenceRows[0].messageId, "ZEH3_SVC_MSG");
    assert.equal(evidenceRows[0].messageNumber, "040");
    assert.equal(evidenceRows[0].messageText, "No executing company rule found");
    assert.equal(evidenceRows[0].severity, "E");

    assert.deepEqual(await readServiceOrder(fixture.service, "ORD138NOM001"), orderBefore);
    assert.equal(orderBefore.currentLifecycleStatus, "CRT");
    assert.equal(orderBefore.executingCompany_companyId, null);
    assert.deepEqual(await fixture.service.run(SELECT.from(SERVICE_STATUS_HISTORY_ENTITY)), statusHistoryBefore);
  } finally {
    await fixture.cleanup();
  }
});

test("responsibility determination persists multiple-match RESP evidence deterministically", async () => {
  const fixture = await createResponsibilityFixture();

  try {
    const { SELECT } = cds.ql;
    const determiner = new ResponsibilityDeterminer(fixture.db, deterministicOptions());

    await insertServiceOrder(fixture.db, {
      orderId: "ORD138MUL001",
      asset_assetId: "A400-LIMIT",
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

    const result = await determiner.determineForValidatedOrder("ORD138MUL001");

    assert.deepEqual(result, {
      orderId: "ORD138MUL001",
      determined: false,
      executingCompanyId: null,
      errorId: "0000000001"
    });

    const evidenceRows = await fixture.service.run(SELECT.from(SERVICE_ERROR_RECORDS_ENTITY).orderBy("errorId"));
    assert.deepEqual(
      evidenceRows.map((row: any) => [row.errorId, row.processingStage, row.messageNumber, row.messageText]),
      [["0000000001", "RESP", "041", "Multiple executing company rules found"]]
    );

    const orderAfter = await readServiceOrder(fixture.service, "ORD138MUL001");
    assert.equal(orderAfter.currentLifecycleStatus, "CRT");
    assert.equal(orderAfter.executingCompany_companyId, null);
    assert.deepEqual(await fixture.service.run(SELECT.from(SERVICE_STATUS_HISTORY_ENTITY)), []);
  } finally {
    await fixture.cleanup();
  }
});

test("responsibility determination rejects missing precondition without responsibility ErrorRecord", async () => {
  const fixture = await createResponsibilityFixture();

  try {
    const { SELECT } = cds.ql;
    const determiner = new ResponsibilityDeterminer(fixture.db, deterministicOptions());

    await assert.rejects(
      () => determiner.determineForValidatedOrder("ORD138MISS01"),
      /Order ORD138MISS01 was not found/
    );
    assert.deepEqual(await fixture.service.run(SELECT.from(SERVICE_ERROR_RECORDS_ENTITY)), []);
    assert.deepEqual(await fixture.service.run(SELECT.from(SERVICE_STATUS_HISTORY_ENTITY)), []);
  } finally {
    await fixture.cleanup();
  }
});

test("local reset restores deterministic baseline after responsibility evidence", () => {
  const resetScript = resolve("scripts", "reset-local.mjs");
  const output = execFileSync(process.execPath, [resetScript], {
    encoding: "utf8"
  });

  assert.match(output, /cap\.poc\.eh3\.synthetic\.ServiceOrders: 0/);
  assert.match(output, /cap\.poc\.eh3\.synthetic\.StatusHistory: 0/);
  assert.match(output, /cap\.poc\.eh3\.synthetic\.ErrorRecords: 0/);
  assert.match(output, /Local SQLite reset completed with deterministic row counts\./);
});

async function createResponsibilityFixture() {
  const dbFile = join(tmpdir(), `cap-poc-ai-str-138-${process.pid}-${Date.now()}-${Math.random()}.sqlite`);
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
    createdBy: "STR138"
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

function resetCdsRuntimeState() {
  delete cds.db;
  delete cds.model;
  delete cds.services.db;
  delete cds.services.ServiceOrderService;
}

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import cds from "@sap/cds";

import { LifecycleStatusManager } from "../src/lifecycle/lifecycle-status.ts";

const SERVICE_ORDERS_ENTITY = "ServiceOrderService.ServiceOrders";
const SERVICE_STATUS_HISTORY_ENTITY = "ServiceOrderService.StatusHistory";
const SERVICE_ERROR_RECORDS_ENTITY = "ServiceOrderService.ErrorRecords";
const PERSISTENCE_SERVICE_ORDERS_ENTITY = "cap.poc.eh3.synthetic.ServiceOrders";

test("records initial CRT history once and rejects duplicate initial history with STATUS evidence", async () => {
  const fixture = await createLifecycleFixture();

  try {
    const manager = new LifecycleStatusManager(fixture.db, lifecycleOptions());
    await insertServiceOrder(fixture.db, serviceOrder("ORD139INIT01", "CRT"));

    const initial = await manager.recordInitialCreatedHistory("ORD139INIT01", "Initial CRT history");

    assert.equal(initial.recorded, true);
    assert.equal(initial.currentStatus, "CRT");

    const history = await readStatusHistory(fixture.service, "ORD139INIT01");
    assert.equal(history.length, 1);
    assert.equal(history[0].sequenceNo, 1);
    assert.equal(history[0].oldStatus, "");
    assert.equal(history[0].newStatus, "CRT");
    assert.equal(history[0].stage, "CREATE");
    assert.equal(history[0].reasonText, "Initial CRT history");

    const duplicate = await manager.recordInitialCreatedHistory("ORD139INIT01", "Duplicate initial CRT history");

    assert.equal(duplicate.recorded, false);
    assert.equal(duplicate.errorId, "0000000001");
    assert.equal((await readStatusHistory(fixture.service, "ORD139INIT01")).length, 1);

    const errors = await readErrorRecords(fixture.service, "ORD139INIT01");
    assert.equal(errors.length, 1);
    assert.equal(errors[0].processingStage, "STATUS");
    assert.equal(errors[0].messageId, "ZEH3_SVC_MSG");
    assert.equal(errors[0].messageNumber, "100");
    assert.equal(errors[0].messageText, "Initial CRT history already exists for order ORD139INIT01");
    assert.equal((await readServiceOrder(fixture.service, "ORD139INIT01")).currentLifecycleStatus, "CRT");
  } finally {
    await fixture.cleanup();
  }
});

test("executes EH3 allowed lifecycle transitions with StatusHistory and no ErrorRecords", async () => {
  const fixture = await createLifecycleFixture();

  try {
    const manager = new LifecycleStatusManager(fixture.db, lifecycleOptions());

    await insertServiceOrder(fixture.db, serviceOrder("ORD139FLOW01", "CRT"));
    const before = await readServiceOrder(fixture.service, "ORD139FLOW01");

    const ready = await manager.executeTransition("ORD139FLOW01", "RDY", "CRT to RDY");
    const completed = await manager.executeTransition("ORD139FLOW01", "CMP", "RDY to CMP");

    assert.equal(ready.changed, true);
    assert.equal(completed.changed, true);
    assert.equal((await readServiceOrder(fixture.service, "ORD139FLOW01")).currentLifecycleStatus, "CMP");

    const history = await readStatusHistory(fixture.service, "ORD139FLOW01");
    assert.deepEqual(
      history.map((row: any) => [row.sequenceNo, row.oldStatus, row.newStatus, row.stage, row.reasonText]),
      [
        [1, "CRT", "RDY", "STATUS", "CRT to RDY"],
        [2, "RDY", "CMP", "STATUS", "RDY to CMP"]
      ]
    );
    assert.deepEqual(await readErrorRecords(fixture.service, "ORD139FLOW01"), []);

    const after = await readServiceOrder(fixture.service, "ORD139FLOW01");
    assertNonLifecycleDataUnchanged(before, after);

    await insertServiceOrder(fixture.db, serviceOrder("ORD139CANCEL", "RDY"));
    const cancel = await manager.executeTransition("ORD139CANCEL", "CAN", "RDY to CAN");

    assert.equal(cancel.changed, true);
    assert.equal((await readServiceOrder(fixture.service, "ORD139CANCEL")).currentLifecycleStatus, "CAN");
    assert.deepEqual(
      (await readStatusHistory(fixture.service, "ORD139CANCEL")).map((row: any) => [row.sequenceNo, row.oldStatus, row.newStatus]),
      [[1, "RDY", "CAN"]]
    );

    await insertServiceOrder(fixture.db, serviceOrder("ORD139CRTCAN", "CRT"));
    const createdCancel = await manager.executeTransition("ORD139CRTCAN", "CAN", "CRT to CAN");

    assert.equal(createdCancel.changed, true);
    assert.equal((await readServiceOrder(fixture.service, "ORD139CRTCAN")).currentLifecycleStatus, "CAN");
    assert.deepEqual(
      (await readStatusHistory(fixture.service, "ORD139CRTCAN")).map((row: any) => [row.sequenceNo, row.oldStatus, row.newStatus]),
      [[1, "CRT", "CAN"]]
    );
  } finally {
    await fixture.cleanup();
  }
});

test("rejects invalid, duplicate, terminal, missing-order and unknown-status transitions with STATUS evidence", async () => {
  const fixture = await createLifecycleFixture();

  try {
    const manager = new LifecycleStatusManager(fixture.db, lifecycleOptions());

    await insertServiceOrder(fixture.db, serviceOrder("ORD139BAD001", "CRT"));
    await insertServiceOrder(fixture.db, serviceOrder("ORD139CMP001", "CMP"));
    await insertServiceOrder(fixture.db, serviceOrder("ORD139CAN001", "CAN"));

    const invalidDirect = await manager.executeTransition("ORD139BAD001", "CMP", "CRT to CMP rejected");
    const duplicate = await manager.executeTransition("ORD139BAD001", "CRT", "CRT to CRT rejected");
    const unknown = await manager.executeTransition("ORD139BAD001", "BAD", "Unknown status rejected");
    const completedReady = await manager.executeTransition("ORD139CMP001", "RDY", "CMP to RDY rejected");
    const completedCancel = await manager.executeTransition("ORD139CMP001", "CAN", "CMP to CAN rejected");
    const cancelledReady = await manager.executeTransition("ORD139CAN001", "RDY", "CAN to RDY rejected");
    const cancelledCompleted = await manager.executeTransition("ORD139CAN001", "CMP", "CAN to CMP rejected");
    const missingOrder = await manager.executeTransition("ORD139MISS01", "RDY", "Missing order rejected");

    assert.deepEqual(
      [
        invalidDirect.changed,
        duplicate.changed,
        unknown.changed,
        completedReady.changed,
        completedCancel.changed,
        cancelledReady.changed,
        cancelledCompleted.changed,
        missingOrder.changed
      ],
      [false, false, false, false, false, false, false, false]
    );
    assert.deepEqual(
      [
        invalidDirect.errorId,
        duplicate.errorId,
        unknown.errorId,
        completedReady.errorId,
        completedCancel.errorId,
        cancelledReady.errorId,
        cancelledCompleted.errorId,
        missingOrder.errorId
      ],
      [
        "0000000001",
        "0000000002",
        "0000000003",
        "0000000004",
        "0000000005",
        "0000000006",
        "0000000007",
        "0000000008"
      ]
    );

    assert.equal((await readServiceOrder(fixture.service, "ORD139BAD001")).currentLifecycleStatus, "CRT");
    assert.equal((await readServiceOrder(fixture.service, "ORD139CMP001")).currentLifecycleStatus, "CMP");
    assert.equal((await readServiceOrder(fixture.service, "ORD139CAN001")).currentLifecycleStatus, "CAN");
    assert.deepEqual(await readStatusHistory(fixture.service), []);

    const errors = await readErrorRecords(fixture.service);
    assert.equal(errors.length, 8);
    assert.deepEqual(
      errors.map((row: any) => [row.errorId, row.processingStage, row.messageNumber]),
      [
        ["0000000001", "STATUS", "100"],
        ["0000000002", "STATUS", "100"],
        ["0000000003", "STATUS", "100"],
        ["0000000004", "STATUS", "100"],
        ["0000000005", "STATUS", "100"],
        ["0000000006", "STATUS", "100"],
        ["0000000007", "STATUS", "100"],
        ["0000000008", "STATUS", "100"]
      ]
    );
    assert.match(errors[2].messageText, /Invalid lifecycle transition from CRT to BAD/);
    assert.equal(errors[7].messageText, "Order ORD139MISS01 not found for status transition");
  } finally {
    await fixture.cleanup();
  }
});

test("rolls back status and history when ServiceOrder status update fails", async () => {
  const fixture = await createLifecycleFixture();

  try {
    const manager = new LifecycleStatusManager(fixture.db, lifecycleOptions());
    await insertServiceOrder(fixture.db, serviceOrder("ORD139RBUP01", "CRT"));

    await fixture.db.run(`
      CREATE TRIGGER fail_str139_status_update
      BEFORE UPDATE OF currentLifecycleStatus ON cap_poc_eh3_synthetic_ServiceOrders
      BEGIN
        SELECT RAISE(ABORT, 'forced status update failure');
      END
    `);

    await assert.rejects(
      () => manager.executeTransition("ORD139RBUP01", "RDY", "Rollback update failure"),
      /forced status update failure/
    );

    assert.equal((await readServiceOrder(fixture.service, "ORD139RBUP01")).currentLifecycleStatus, "CRT");
    assert.deepEqual(await readStatusHistory(fixture.service, "ORD139RBUP01"), []);
    assert.deepEqual(await readErrorRecords(fixture.service, "ORD139RBUP01"), []);
  } finally {
    await fixture.cleanup();
  }
});

test("rolls back status update when StatusHistory insert fails", async () => {
  const fixture = await createLifecycleFixture();

  try {
    const manager = new LifecycleStatusManager(fixture.db, lifecycleOptions());
    await insertServiceOrder(fixture.db, serviceOrder("ORD139RBHI01", "CRT"));

    await fixture.db.run(`
      CREATE TRIGGER fail_str139_history_insert
      BEFORE INSERT ON cap_poc_eh3_synthetic_StatusHistory
      BEGIN
        SELECT RAISE(ABORT, 'forced status history insert failure');
      END
    `);

    await assert.rejects(
      () => manager.executeTransition("ORD139RBHI01", "RDY", "Rollback history failure"),
      /forced status history insert failure/
    );

    assert.equal((await readServiceOrder(fixture.service, "ORD139RBHI01")).currentLifecycleStatus, "CRT");
    assert.deepEqual(await readStatusHistory(fixture.service, "ORD139RBHI01"), []);
    assert.deepEqual(await readErrorRecords(fixture.service, "ORD139RBHI01"), []);
  } finally {
    await fixture.cleanup();
  }
});

test("local reset restores deterministic baseline after lifecycle evidence", () => {
  const resetScript = resolve("scripts", "reset-local.mjs");
  const output = execFileSync(process.execPath, [resetScript], {
    encoding: "utf8"
  });

  assert.match(output, /cap\.poc\.eh3\.synthetic\.ServiceOrders: 0/);
  assert.match(output, /cap\.poc\.eh3\.synthetic\.StatusHistory: 0/);
  assert.match(output, /cap\.poc\.eh3\.synthetic\.ErrorRecords: 0/);
  assert.match(output, /Local SQLite reset completed with deterministic row counts\./);
});

async function createLifecycleFixture() {
  const dbFile = join(tmpdir(), `cap-poc-ai-str-139-${process.pid}-${Date.now()}-${Math.random()}.sqlite`);
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

function lifecycleOptions() {
  return {
    now: new Date("2026-07-29T12:00:00.000Z"),
    changedBy: "STR139"
  };
}

function serviceOrder(orderId: string, currentLifecycleStatus: string) {
  return {
    orderId,
    asset_assetId: "A100-LOCAL",
    requestingCompany_companyId: "C100",
    executingCompany_companyId: null,
    serviceType_serviceTypeCode: "INSP",
    priority: "NORM",
    requestedExecutionDate: "2026-08-15",
    currentLifecycleStatus,
    createdAt: "2026-07-29T10:00:00.000Z",
    changedAt: "2026-07-29T10:00:00.000Z",
    datasetVersion: "V1.0"
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

async function readStatusHistory(service: any, orderId?: string) {
  const { SELECT } = cds.ql;
  const query = SELECT.from(SERVICE_STATUS_HISTORY_ENTITY).orderBy("order_orderId", "sequenceNo");
  if (orderId) query.where({ order_orderId: orderId });
  return service.run(query);
}

async function readErrorRecords(service: any, orderId?: string) {
  const { SELECT } = cds.ql;
  const query = SELECT.from(SERVICE_ERROR_RECORDS_ENTITY).orderBy("errorId");
  if (orderId) query.where({ order_orderId: orderId });
  return service.run(query);
}

function assertNonLifecycleDataUnchanged(before: any, after: any) {
  assert.equal(after.orderId, before.orderId);
  assert.equal(after.asset_assetId, before.asset_assetId);
  assert.equal(after.requestingCompany_companyId, before.requestingCompany_companyId);
  assert.equal(after.executingCompany_companyId, before.executingCompany_companyId);
  assert.equal(after.serviceType_serviceTypeCode, before.serviceType_serviceTypeCode);
  assert.equal(after.priority, before.priority);
  assert.equal(after.requestedExecutionDate, before.requestedExecutionDate);
  assert.equal(after.createdAt, before.createdAt);
  assert.equal(after.datasetVersion, before.datasetVersion);
}

function resetCdsRuntimeState() {
  delete cds.db;
  delete cds.model;
  delete cds.services.db;
  delete cds.services.ServiceOrderService;
}

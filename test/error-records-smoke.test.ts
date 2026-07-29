import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import cds from "@sap/cds";

import { ERROR_RECORDS_ENTITY, persistPreparedErrorRecord } from "../src/error-records/error-records.ts";

const SERVICE_ERROR_RECORDS_ENTITY = "ServiceOrderService.ErrorRecords";
const SERVICE_ORDERS_ENTITY = "ServiceOrderService.ServiceOrders";
const SERVICE_STATUS_HISTORY_ENTITY = "ServiceOrderService.StatusHistory";

test("persists prepared ErrorRecord without changing service order status or status history", async () => {
  const dbFile = join(tmpdir(), `cap-poc-ai-str-136-${process.pid}-${Date.now()}.sqlite`);
  const model = await cds.load(["db/schema.cds", "srv/service-order-service.cds"]);
  const { SELECT } = cds.ql;
  const db = await cds.connect.to({
    kind: "sqlite",
    credentials: {
      url: dbFile
    },
    model
  });

  await cds.deploy(model).to(db, { silent: true });
  await cds.serve("ServiceOrderService").from(model);
  const service = await cds.connect.to("ServiceOrderService");

  try {
    const orderRowsBefore = await service.run(
      SELECT.from(SERVICE_ORDERS_ENTITY).columns("orderId", "currentLifecycleStatus")
    );
    const statusHistoryBefore = await service.run(SELECT.from(SERVICE_STATUS_HISTORY_ENTITY));

    assert.deepEqual(orderRowsBefore, []);
    assert.deepEqual(statusHistoryBefore, []);

    const persisted = await persistPreparedErrorRecord(db, {
      errorId: "9000000001",
      orderId: null,
      processingStage: "CREATE",
      messageId: "ZEH3",
      messageNumber: "901",
      messageText: "STR-136 smoke test persistent error evidence",
      severity: "E",
      createdAt: "2026-07-29T10:00:00.000Z",
      createdBy: "STR136",
      resolved: false,
      datasetVersion: "CAP-POC-DATA-V1.0"
    });

    assert.equal(persisted.order_orderId, null);

    const directRows = await db.run(SELECT.from(ERROR_RECORDS_ENTITY).where({ errorId: persisted.errorId }));
    assert.equal(directRows.length, 1);

    const serviceRows = await service.run(
      SELECT.from(SERVICE_ERROR_RECORDS_ENTITY).where({ errorId: persisted.errorId })
    );

    assert.equal(serviceRows.length, 1);
    assert.equal(serviceRows[0].errorId, "9000000001");
    assert.equal(serviceRows[0].order_orderId, null);
    assert.equal(serviceRows[0].processingStage, "CREATE");
    assert.equal(serviceRows[0].messageId, "ZEH3");
    assert.equal(serviceRows[0].messageNumber, "901");
    assert.equal(serviceRows[0].messageText, "STR-136 smoke test persistent error evidence");
    assert.equal(serviceRows[0].severity, "E");
    assert.equal(serviceRows[0].createdAt, "2026-07-29T10:00:00.000Z");
    assert.equal(serviceRows[0].createdBy, "STR136");
    assert.equal(serviceRows[0].resolved, false);
    assert.equal(serviceRows[0].datasetVersion, "CAP-POC-DATA-V1.0");

    const orderRowsAfter = await service.run(
      SELECT.from(SERVICE_ORDERS_ENTITY).columns("orderId", "currentLifecycleStatus")
    );
    const statusHistoryAfter = await service.run(SELECT.from(SERVICE_STATUS_HISTORY_ENTITY));

    assert.deepEqual(orderRowsAfter, orderRowsBefore);
    assert.deepEqual(statusHistoryAfter, statusHistoryBefore);
  } finally {
    await cds.disconnect();
    rmSync(dbFile, { force: true });
  }
});

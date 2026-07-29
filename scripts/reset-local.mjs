import cds from "@sap/cds";
import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const databaseFile = resolve("db.sqlite");

const expectedCounts = {
  "cap.poc.eh3.synthetic.SyntheticCompanies": 4,
  "cap.poc.eh3.synthetic.SyntheticAssets": 7,
  "cap.poc.eh3.synthetic.ServiceTypes": 4,
  "cap.poc.eh3.synthetic.ResponsibilityRules": 7,
  "cap.poc.eh3.synthetic.ServiceOrders": 0,
  "cap.poc.eh3.synthetic.StatusHistory": 0,
  "cap.poc.eh3.synthetic.ErrorRecords": 0
};

if (existsSync(databaseFile)) {
  rmSync(databaseFile);
}

const cdsCli = resolve("node_modules", "@sap", "cds-dk", "bin", "cds.js");

execFileSync(process.execPath, [cdsCli, "deploy", "--to", "sqlite:db.sqlite"], {
  stdio: "inherit"
});

const db = await cds.connect.to("db");

try {
  for (const [entity, expected] of Object.entries(expectedCounts)) {
    const { count } = await SELECT.one`count(1) as count`.from(entity);
    const actual = Number(count);
    console.log(`${entity}: ${actual}`);
    if (actual !== expected) {
      throw new Error(`${entity} expected ${expected} rows but found ${actual}`);
    }
  }

  console.log("Local SQLite reset completed with deterministic row counts.");
} finally {
  await db.disconnect?.();
}

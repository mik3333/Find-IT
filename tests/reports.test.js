import assert from "node:assert/strict";
import { test } from "node:test";
import {
  deleteReport,
  findReportById,
  findReportImage,
  insertReport,
  listReports,
  openDatabase,
  seedSampleReports,
  updateReport,
} from "../src/database.js";

test("reports and optional images are saved, updated, listed, and deleted", (context) => {
  const database = openDatabase(":memory:");
  context.after(() => database.close());
  const report = {
    id: "report-1",
    type: "lost",
    title: "Blue water bottle",
    location: "Central library",
    date: "2026-10-12",
  };
  const image = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

  insertReport(database, report, image, "image/png");
  assert.deepEqual(listReports(database).map((savedReport) => ({ ...savedReport })), [{ ...report, hasImage: 1 }]);
  assert.deepEqual(findReportImage(database, report.id), { data: image, mimeType: "image/png" });

  updateReport(database, report.id, { ...report, title: "Bottle" });
  assert.equal(findReportById(database, report.id).title, "Bottle");
  assert.deepEqual(findReportImage(database, report.id), { data: image, mimeType: "image/png" });

  assert.equal(deleteReport(database, report.id), 1);
  assert.equal(findReportById(database, report.id), undefined);
  assert.equal(findReportImage(database, report.id), undefined);
});

test("sample reports are seeded once and stay deleted after restart", (context) => {
  const database = openDatabase(":memory:");
  context.after(() => database.close());

  seedSampleReports(database);
  assert.equal(listReports(database).length, 3);
  for (const report of listReports(database)) deleteReport(database, report.id);
  seedSampleReports(database);
  assert.equal(listReports(database).length, 0);
});

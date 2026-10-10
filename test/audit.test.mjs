import assert from "node:assert/strict";
import test from "node:test";
import { buildAttributionReport, parseGitLog } from "../src/audit.mjs";

const field = "\u001f";
const record = "\u001e";

test("parses git records without confusing commit subjects", () => {
  const raw = [
    [
      "abc123",
      "Test Author",
      "test@example.com",
      "2026-10-10T08:00:00Z",
      "feat: preserve spaces in subjects",
    ].join(field),
    record,
  ].join("");

  assert.deepEqual(parseGitLog(raw), [
    {
      hash: "abc123",
      authorName: "Test Author",
      authorEmail: "test@example.com",
      authoredAt: "2026-10-10T08:00:00Z",
      subject: "feat: preserve spaces in subjects",
    },
  ]);
});

test("summarizes authors and matches email case-insensitively", () => {
  const commits = [
    {
      hash: "new",
      authorName: "Tester",
      authorEmail: "Tester@Example.com",
      authoredAt: "2026-10-10T08:00:00Z",
      subject: "newest",
    },
    {
      hash: "old",
      authorName: "Tester",
      authorEmail: "tester@example.com",
      authoredAt: "2026-10-09T08:00:00Z",
      subject: "oldest",
    },
  ];

  const report = buildAttributionReport({
    branch: "main",
    commits,
    expectedEmail: "TESTER@example.com",
  });

  assert.equal(report.commitsReachableFromHead, 2);
  assert.equal(report.uniqueAuthorEmails, 1);
  assert.equal(report.expectedAuthor.matchingCommits, 2);
  assert.equal(report.newestCommit.hash, "new");
});

test("rejects incomplete git records", () => {
  assert.throws(
    () => parseGitLog(`abc${field}name${record}`),
    /incomplete commit record/,
  );
});

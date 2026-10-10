#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const FIELD_SEPARATOR = "\u001f";
const RECORD_SEPARATOR = "\u001e";

export function parseGitLog(raw) {
  return raw
    .split(RECORD_SEPARATOR)
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, authorName, authorEmail, authoredAt, subject] =
        record.split(FIELD_SEPARATOR);
      if (!hash || !authorEmail || !authoredAt) {
        throw new Error("Git log contains an incomplete commit record");
      }
      return { hash, authorName, authorEmail, authoredAt, subject };
    });
}

export function buildAttributionReport({ branch, commits, expectedEmail }) {
  const normalizedExpected = expectedEmail?.trim().toLowerCase();
  const authors = new Map();

  for (const commit of commits) {
    const email = commit.authorEmail.toLowerCase();
    const author = authors.get(email) ?? {
      name: commit.authorName,
      email: commit.authorEmail,
      commits: 0,
    };
    author.commits += 1;
    authors.set(email, author);
  }

  return {
    branch,
    commitsReachableFromHead: commits.length,
    uniqueAuthorEmails: authors.size,
    expectedAuthor: normalizedExpected
      ? {
          email: expectedEmail,
          matchingCommits: commits.filter(
            (commit) =>
              commit.authorEmail.toLowerCase() === normalizedExpected,
          ).length,
        }
      : null,
    authors: [...authors.values()].sort(
      (left, right) => right.commits - left.commits,
    ),
    newestCommit: commits[0] ?? null,
  };
}

export function auditRepository({ repository = ".", limit = 100, expectedEmail }) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 10_000) {
    throw new Error("limit must be an integer between 1 and 10000");
  }

  const branch = execFileSync(
    "git",
    ["-C", repository, "branch", "--show-current"],
    { encoding: "utf8" },
  ).trim();
  const format = ["%H", "%an", "%ae", "%aI", "%s"].join("%x1f") + "%x1e";
  const raw = execFileSync(
    "git",
    [
      "-C",
      repository,
      "log",
      `--max-count=${limit}`,
      `--format=${format}`,
      "--no-merges",
      "HEAD",
    ],
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
  );

  return buildAttributionReport({
    branch,
    commits: parseGitLog(raw),
    expectedEmail,
  });
}

function parseArguments(argv) {
  const options = { repository: ".", limit: 100, expectedEmail: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === "--repo" && value) {
      options.repository = value;
      index += 1;
    } else if (argument === "--limit" && value) {
      options.limit = Number(value);
      index += 1;
    } else if (argument === "--expected-email" && value) {
      options.expectedEmail = value;
      index += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${argument}`);
    }
  }
  return options;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const report = auditRepository(parseArguments(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Attribution audit failed"}\n`,
    );
    process.exitCode = 1;
  }
}

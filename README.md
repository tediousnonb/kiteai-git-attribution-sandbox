# KiteAI Git Attribution Sandbox

This repository is a **test-only sandbox** for checking whether Git commit
metadata is readable and attributable before integrating a repository with a
developer activity pipeline.

It is not a bounty submission, must not be submitted to Electric Capital's
taxonomy, and must not be included in participant rewards or ecosystem metrics.

## What it checks

- commits reachable from the current `HEAD`;
- current branch name;
- author names and email identities;
- the number of commits matching an expected author email;
- newest commit metadata.

The audit intentionally does not claim to reproduce Electric Capital's private
crawler, identity deduplication, bot detection, or code fingerprinting.

## Usage

Node.js 20 or newer is required. There are no third-party dependencies.

```bash
npm test
npm run audit
node src/audit.mjs --repo . --limit 50 \
  --expected-email "212371251+tediousnonb@users.noreply.github.com"
```

The command prints a JSON report and does not upload repository data.

## Safety boundary

This sandbox verifies GitHub and Git metadata plumbing only. Do not open an
Open Dev Data taxonomy PR for it and do not use its commits to claim developer
activity rewards.

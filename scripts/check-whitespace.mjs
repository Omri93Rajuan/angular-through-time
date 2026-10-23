import {spawnSync} from 'node:child_process';

// These paths are byte-frozen evidence or reproducibly generated source. Their
// dedicated audit/generation checks are authoritative; formatting them would
// change evidence or make an exact generated recipe no longer exact.
const exclusions = [
  ':(exclude,glob)benchmark/results-v2/**',
  ':(exclude,glob)research/native/v*/scaffold/**',
  ':(exclude,glob)native/v*/src/app/**',
  ':(exclude,glob)v*/src/research/**'
];
const paths = ['--', '.', ...exclusions];

function run(args) {
  const result = spawnSync('git', args, {stdio: 'inherit'});
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function resolvesCommit(revision) {
  return spawnSync('git', ['rev-parse', '--verify', `${revision}^{commit}`], {
    stdio: 'ignore'
  }).status === 0;
}

// Catch uncommitted whitespace errors when this script is also used locally.
run(['diff', '--check', ...paths]);

const pullRequestBase = process.env.PR_BASE_SHA?.trim();
if (pullRequestBase) {
  if (!resolvesCommit(pullRequestBase)) {
    console.error(`PR_BASE_SHA does not resolve to a commit: ${pullRequestBase}`);
    process.exit(2);
  }
  run(['diff', '--check', `${pullRequestBase}...HEAD`, ...paths]);
} else if (resolvesCommit('HEAD^1')) {
  // workflow_dispatch has no PR base. Validate the complete change from the
  // first parent, including the full integration delta of a merge commit.
  run(['diff', '--check', 'HEAD^1', 'HEAD', ...paths]);
} else {
  // Root-commit fallback for a newly initialized repository.
  run(['show', '--check', '--format=', 'HEAD', ...paths]);
}

console.log('Whitespace validation passed for hand-maintained files.');

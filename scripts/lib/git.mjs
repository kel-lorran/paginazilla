import { execFileSync } from "node:child_process";

export function git(args, cwd) {
  return execFileSync("git", args, { cwd, stdio: "inherit" });
}

export function hasStagedChanges(cwd, pathspec) {
  try {
    execFileSync("git", ["diff", "--cached", "--quiet", "--", pathspec], { cwd });
    return false; // exit 0 = sem diferenças
  } catch {
    return true; // exit 1 = há diferenças staged
  }
}

/** git add -A (pega criações/edições/remoções) na pathspec, e commita+push se houver algo staged. */
export function commitAndPush(cwd, pathspec, message) {
  git(["add", "-A", "--", pathspec], cwd);
  if (!hasStagedChanges(cwd, pathspec)) {
    console.log("\nNada novo pra commitar.");
    return false;
  }
  console.log("\nCommitando e enviando pro GitHub...");
  git(["commit", "-m", message], cwd);
  git(["push"], cwd);
  console.log("\nPush feito — o deploy no GitHub Pages roda automático via Actions.");
  return true;
}

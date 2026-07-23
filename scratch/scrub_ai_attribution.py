import os
import subprocess

REPOS = [
    "/home/fayber/nexus_flow",
    "/home/fayber/clipsum_app",
    "/home/fayber/modrinth-code",
    "/home/fayber/projects/password-manager",
]

def run(cmd, cwd):
    return subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True)

print("==========================================================")
print("     Scrubbing AI Attribution & Contributors Across Repos  ")
print("==========================================================")

for repo in REPOS:
    if not os.path.exists(os.path.join(repo, ".git")):
        continue
    print(f"\n[Processing Repo] {repo}")
    
    # 1. Remove CLAUDE.md if present
    claude_md = os.path.join(repo, "CLAUDE.md")
    if os.path.exists(claude_md):
        os.remove(claude_md)
        run("git rm -f CLAUDE.md", cwd=repo)
        run("git commit -m 'chore: remove CLAUDE.md'", cwd=repo)
        print("  └─ Removed CLAUDE.md and committed")
        
    # 2. Check for commits authored by claude or containing Co-authored-by
    authors = run("git log --all --format='%an <%ae>' | sort -u", cwd=repo).stdout
    print(f"  └─ Unique Authors:\n{authors.strip()}")
    
    # 3. Push cleaned branch to origin/github if remotes exist
    remotes = run("git remote", cwd=repo).stdout.splitlines()
    for remote in remotes:
        branch = run("git branch --show-current", cwd=repo).stdout.strip() or "master"
        res = run(f"git push {remote} {branch}", cwd=repo)
        if res.returncode == 0:
            print(f"  └─ Pushed clean {branch} to {remote}")

print("\n==========================================================")
print("                  SCRUBBING COMPLETED                     ")
print("==========================================================")

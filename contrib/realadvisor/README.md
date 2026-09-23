# RealAdvisor fork of Probo

This repository is RealAdvisor's fork of [getprobo/probo](https://github.com/getprobo/probo).
It exists to carry a small number of changes that the self-hosted instance
(see [realadvisor/probo-deploy](https://github.com/realadvisor/probo-deploy))
needs before, or instead of, upstream.

## Branches

| Branch | Purpose |
|--------|---------|
| `main` | Untouched mirror of upstream `main` at the time of the fork. Not used. |
| `realadvisor` | **The fork.** The newest upstream release tag (`probod/vX.Y.Z`, see `cmd/probod/VERSION`) plus our commits on top. Base every PR on it. |

Our commits stay a short, linear series on top of the upstream tag so the
branch can be rebased onto each new release. Keep each change to one commit
with a clear message (upstream's `contrib/claude/commit.md` rules apply) and
prefer sending it upstream once it has proven itself in production.

## Changes carried

| Commit | What it changes |
|--------|-----------------|
| Add search, filters and pagination to the rights requests list | Console → Privacy → Rights requests: search, state/type/date filters, state tabs with counts, sortable columns, pagination. `RightsRequestFilter` and `stateCounts` on `Organization.rightsRequests`. Also fixes upstream sorting by state/type, which queried non-existent columns. |

## Workflows

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `realadvisor-ci` | PRs to `realadvisor`, pushes to it | Relay, TypeScript checks, gqlgen, `go build`, `go vet`, gofmt, eslint on changed frontend files. Upstream's own CI targets only `main` and its private runners, so it never runs here. |
| `realadvisor-image` | Pushes to `realadvisor`, manual | Builds the frontends and `probod` like upstream's release workflow and pushes `ghcr.io/realadvisor/probo:v<version>-ra.<sha>` (and `:latest` for branch builds). Manual runs on another branch push only the sha tag, for testing. |
| `realadvisor-upstream` | Weekly, manual | Rebases `realadvisor` onto the newest `probod/v*` tag, force-pushes it and dispatches CI and an image build. Opens an issue when the rebase conflicts. |

Upstream's release workflows trigger on `probod/v*` tags and need upstream's
registry secrets; never push such a tag except the ones mirrored from
upstream by `realadvisor-upstream`.

## Day to day

**Change something.** Branch off `realadvisor`, open a PR against it, let
`realadvisor-ci` pass, squash-merge so the series stays one commit per change.
The merge builds an image; its tag is in the run summary.

**Try an image before deploying.**

```bash
docker login ghcr.io
PROBO_IMAGE=ghcr.io/realadvisor/probo:v0.291.0-ra.abc1234 \
  docker compose -f contrib/realadvisor/compose.test.yaml up
```

Console at http://localhost:8080, emails at http://localhost:8025 (Mailpit).
Create an account, confirm it via Mailpit, create an organisation. `down -v`
wipes it.

**Deploy.** In probo-deploy, `./deploy/bump-image.sh <tag>` (or the weekly
`bump-image` workflow) re-pins `deploy/compose.yaml`; merging that deploys.

**Send a change upstream.** Branch off upstream `main`, cherry-pick the
commit, sign it off (`git commit --amend -s`), open the PR on getprobo/probo.
Once it lands, the next weekly rebase drops our copy automatically (or
`git rebase` will report it as already applied).

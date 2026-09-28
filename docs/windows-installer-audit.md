# Windows Installer Audit

## Release Blocking Invariants

Every Windows release must satisfy all of these conditions:

1. The installer is assisted (`oneClick: false`) and per-machine (`perMachine: true`). The per-machine requirement is intentional: it makes the installer elevated before it tries to close an application that may itself be running elevated.
2. The installer runs `customCheckAppRunning` before `uninstallOldVersion` and terminates the current `BenchFlow.exe` process tree.
3. The installer also terminates the legacy `DoInPXE.exe` process tree so the product rename does not leave an old executable locking the installation directory.
4. The Electron main process closes SSH clients, tunnel child processes, proxy sockets, and the proxy server during `before-quit` before allowing the second quit to continue.
5. The packaged x64 application contains no native `.node` files copied from the macOS build host.

## Required Verification

Run these checks from a clean checkout before publishing:

```sh
npm ci
npm run typecheck
node scripts/test-installer-shutdown.cjs
npm run electron:build:win
node scripts/verify-win-package.cjs
```

The final Windows smoke test must be run on Windows. It must cover:

- upgrading a running current-version BenchFlow;
- upgrading while BenchFlow is started with **Run as administrator**;
- upgrading an older DoInPXE installation;
- active SSH/tunnel/proxy resources before starting the installer;
- canceling and rerunning the installer after a failed attempt.

The macOS build host can verify the generated NSIS script and package contents, but it cannot prove Windows UAC, process-token, file-lock, or old-uninstaller behavior. A Windows smoke test is therefore a release gate, not an optional manual check.

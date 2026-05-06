import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useState } from "react";

type Step = "welcome" | "terms" | "options" | "install" | "done";

const TERMS = `HiroCrosshair — third-party overlay software. By continuing you agree you use this
software at your own risk. The authors are not responsible for any game policy violations,
anti-cheat actions, or damages arising from use. Only install from official releases.`;

export default function App() {
  const [step, setStep] = useState<Step>("welcome");
  const [accepted, setAccepted] = useState(false);
  const [allUsers, setAllUsers] = useState(false);
  const [installDir, setInstallDir] = useState("");
  const [desktopShortcut, setDesktopShortcut] = useState(true);
  const [setupPath, setSetupPath] = useState<string | null>(null);
  const [setupErr, setSetupErr] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [installLog, setInstallLog] = useState<string>("");
  const [exitCode, setExitCode] = useState<number | null>(null);

  const refreshDefaultDir = useCallback(async (scopeAllUsers: boolean) => {
    const d = await invoke<string>("get_default_install_dir", { allUsers: scopeAllUsers });
    setInstallDir(d);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const p = await invoke<string | null>("resolve_setup_path");
        setSetupPath(p);
        if (!p) setSetupErr("Setup not found. Click “Download latest” to fetch it automatically.");
      } catch (e) {
        setSetupErr(String(e));
      }
    })();
  }, []);

  useEffect(() => {
    void refreshDefaultDir(allUsers);
  }, [allUsers, refreshDefaultDir]);

  const pickFolder = async () => {
    const chosen = await open({
      directory: true,
      multiple: false,
      defaultPath: installDir || undefined,
    });
    if (typeof chosen === "string" && chosen.length) {
      setInstallDir(chosen);
    }
  };

  const runInstall = async () => {
    if (!setupPath) return;
    setStep("install");
    setInstallLog("Preparing installer…");
    setExitCode(null);
    try {
      setInstallLog("Running NSIS (silent)…");
      const code = await invoke<number>("run_installer", {
        setupPath,
        installDir,
        allUsers,
        desktopShortcut,
      });
      setExitCode(code);
      if (code === 0) {
        setInstallLog("Installation finished.");
        setStep("done");
      } else {
        setInstallLog(`Installer exited with code ${code}. Check permissions or disk space.`);
      }
    } catch (e) {
      setInstallLog(String(e));
      setExitCode(-1);
    }
  };

  const downloadLatest = async () => {
    setIsDownloading(true);
    setSetupErr(null);
    try {
      setInstallLog("Downloading latest installer…");
      const p = await invoke<string>("download_latest_setup");
      setSetupPath(p);
      setInstallLog("");
    } catch (e) {
      setSetupErr(String(e));
    } finally {
      setIsDownloading(false);
    }
  };

  const launchApp = async () => {
    try {
      await invoke("launch_installed_app", { installDir });
    } catch (e) {
      setInstallLog(String(e));
    }
  };

  const shellStyle: React.CSSProperties = {
    maxWidth: 520,
    margin: "0 auto",
    padding: "28px 32px 36px",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  };

  const card: React.CSSProperties = {
    background: "rgba(15, 22, 48, 0.72)",
    border: "1px solid rgba(120, 140, 255, 0.18)",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
  };

  const btnPrimary: React.CSSProperties = {
    padding: "10px 18px",
    borderRadius: 8,
    border: "none",
    background: "linear-gradient(135deg, #5b6cff, #3946cf)",
    color: "#fff",
    fontWeight: 600,
  };

  const btnPrimaryDisabled: React.CSSProperties = {
    ...btnPrimary,
    opacity: 0.55,
    cursor: "not-allowed",
    filter: "grayscale(0.15)",
  };

  const btnGhost: React.CSSProperties = {
    padding: "10px 18px",
    borderRadius: 8,
    border: "1px solid rgba(180, 190, 255, 0.35)",
    background: "transparent",
    color: "#dbe0ff",
  };

  return (
    <div style={shellStyle}>
      <header style={{ textAlign: "center" }}>
        <h1 style={{ margin: "8px 0 4px", fontSize: "1.45rem", letterSpacing: "0.02em" }}>
          HiroCrosshair Setup
        </h1>
        <p style={{ margin: 0, opacity: 0.78, fontSize: "0.92rem" }}>
          Guided install for Windows (NSIS)
        </p>
      </header>

      {setupErr && (
        <div style={{ ...card, borderColor: "rgba(255,120,120,0.45)", color: "#ffc9c9" }}>{setupErr}</div>
      )}

      {step === "welcome" && (
        <section style={card}>
          <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Welcome</h2>
          <p style={{ margin: 0, opacity: 0.9 }}>
            This wizard will install <strong>HiroCrosshair</strong> on your PC using the official NSIS
            package bundled next to this launcher. You can choose the install folder, scope, and
            desktop shortcut.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
            {!setupPath && (
              <button
                type="button"
                style={isDownloading ? btnPrimaryDisabled : btnGhost}
                disabled={isDownloading}
                onClick={() => void downloadLatest()}
                title="Downloads the latest *-setup.exe from GitHub Releases"
              >
                {isDownloading ? "Downloading…" : "Download latest"}
              </button>
            )}
            <button
              type="button"
              style={setupPath ? btnPrimary : btnPrimaryDisabled}
              disabled={!setupPath}
              onClick={() => setStep("terms")}
              aria-disabled={!setupPath}
              title={!setupPath ? "Download the installer first" : undefined}
            >
              Next
            </button>
          </div>
        </section>
      )}

      {step === "terms" && (
        <section style={card}>
          <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Terms</h2>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
              fontSize: "0.88rem",
              opacity: 0.88,
              margin: "0 0 12px",
            }}
          >
            {TERMS}
          </pre>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
            I understand and accept
          </label>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 12 }}>
            <button type="button" style={btnGhost} onClick={() => setStep("welcome")}>
              Back
            </button>
            <button type="button" style={btnPrimary} disabled={!accepted} onClick={() => setStep("options")}>
              Next
            </button>
          </div>
        </section>
      )}

      {step === "options" && (
        <section style={card}>
          <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Install options</h2>

          <fieldset style={{ border: "none", padding: 0, margin: "0 0 12px" }}>
            <legend style={{ fontWeight: 600, marginBottom: 8 }}>Install for</legend>
            <label style={{ display: "flex", gap: 8, marginBottom: 6, cursor: "pointer" }}>
              <input type="radio" checked={!allUsers} onChange={() => setAllUsers(false)} />
              Current user (recommended, no admin unless required by NSIS)
            </label>
            <label style={{ display: "flex", gap: 8, cursor: "pointer" }}>
              <input type="radio" checked={allUsers} onChange={() => setAllUsers(true)} />
              All users (Program Files) — will prompt UAC
            </label>
          </fieldset>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Destination folder</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                readOnly
                value={installDir}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(120, 140, 255, 0.25)",
                  background: "rgba(5, 8, 20, 0.65)",
                  color: "inherit",
                }}
              />
              <button type="button" style={btnGhost} onClick={() => void pickFolder()}>
                Browse…
              </button>
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={desktopShortcut} onChange={(e) => setDesktopShortcut(e.target.checked)} />
            Create desktop shortcut
          </label>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 16 }}>
            <button type="button" style={btnGhost} onClick={() => setStep("terms")}>
              Back
            </button>
            <button
              type="button"
              style={btnPrimary}
              disabled={!setupPath || !installDir.trim()}
              onClick={() => void runInstall()}
            >
              Install
            </button>
          </div>
        </section>
      )}

      {step === "install" && (
        <section style={card}>
          <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Installing</h2>
          <p style={{ margin: 0, opacity: 0.9 }}>{installLog}</p>
          <div
            style={{
              height: 6,
              borderRadius: 99,
              background: "rgba(255,255,255,0.08)",
              overflow: "hidden",
              marginTop: 12,
            }}
          >
            <div
              style={{
                height: "100%",
                width: "55%",
                background: "linear-gradient(90deg, #5b6cff, #8f9dff)",
                borderRadius: 99,
                animation: "hiroPulse 1.2s ease-in-out infinite alternate",
              }}
            />
          </div>
          <style>{`@keyframes hiroPulse { from { transform: translateX(-30%); } to { transform: translateX(40%); } }`}</style>
          {exitCode !== null && exitCode !== 0 && (
            <button type="button" style={{ ...btnGhost, marginTop: 12 }} onClick={() => setStep("options")}>
              Back to options
            </button>
          )}
        </section>
      )}

      {step === "done" && (
        <section style={card}>
          <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Finished</h2>
          <p style={{ margin: 0, opacity: 0.9 }}>
            HiroCrosshair was installed to <code style={{ opacity: 0.95 }}>{installDir}</code>.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
            <button type="button" style={btnPrimary} onClick={() => void launchApp()}>
              Launch HiroCrosshair
            </button>
            <button type="button" style={btnGhost} onClick={() => setStep("welcome")}>
              Close wizard
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

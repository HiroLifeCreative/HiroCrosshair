#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::{Path, PathBuf};

const MARKER: &str = "hiro-crosshair-no-desktop.marker";
const PRODUCT_EXE: &str = "HiroCrosshair.exe";
const GH_OWNER: &str = "HiroLifeCreative";
const GH_REPO: &str = "HiroCrosshair";

fn marker_path() -> PathBuf {
    std::env::temp_dir().join(MARKER)
}

fn apply_desktop_shortcut_option(desktop_shortcut: bool) -> Result<(), String> {
    let p = marker_path();
    if desktop_shortcut {
        let _ = fs::remove_file(&p);
    } else {
        fs::File::create(&p).map_err(|e| format!("Could not write marker file: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
fn get_default_install_dir(all_users: bool) -> Result<String, String> {
    if all_users {
        if let Ok(pf) = std::env::var("ProgramW6432").or_else(|_| std::env::var("ProgramFiles")) {
            return Ok(Path::new(&pf).join("HiroCrosshair").to_string_lossy().to_string());
        }
        return Ok(r"C:\Program Files\HiroCrosshair".to_string());
    }
    let base = std::env::var("LOCALAPPDATA").map_err(|_| "LOCALAPPDATA is not set".to_string())?;
    Ok(Path::new(&base).join("HiroCrosshair").to_string_lossy().to_string())
}

#[tauri::command]
fn resolve_setup_path() -> Result<Option<String>, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let dir = exe.parent().ok_or("Could not resolve launcher directory")?;
    let mut candidates: Vec<PathBuf> = fs::read_dir(dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| {
            let name = p.file_name().and_then(|n| n.to_str()).unwrap_or("").to_ascii_lowercase();
            name.ends_with("-setup.exe") && name.contains("hirocrosshair")
        })
        .collect();

    candidates.sort_by_key(|p| fs::metadata(p).and_then(|m| m.modified()).unwrap_or(std::time::UNIX_EPOCH));

    Ok(candidates.pop().map(|p| p.to_string_lossy().to_string()))
}

fn build_nsis_args(install_dir: &str, all_users: bool) -> Vec<String> {
    let mut args = vec!["/S".to_string()];
    if all_users {
        args.push("/allusers".to_string());
    } else {
        args.push("/currentuser".to_string());
    }
    let dir = install_dir.trim().trim_end_matches('\\').trim_end_matches('/');
    args.push(format!("/D={dir}"));
    args
}

#[cfg(windows)]
fn quote_ps_single(s: &str) -> String {
    format!("'{}'", s.replace('\'', "''"))
}

#[cfg(windows)]
fn download_latest_setup_to_temp() -> Result<PathBuf, String> {
    // Download latest *-setup.exe from GitHub Releases to %TEMP%.
    // We use PowerShell to avoid adding an HTTP crate to the launcher.
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let out_dir = std::env::temp_dir().join("hiro-crosshair-installer-cache");
    fs::create_dir_all(&out_dir).map_err(|e| e.to_string())?;
    let out_file = out_dir.join("HiroCrosshair-latest-setup.exe");
    let out_file_ps = quote_ps_single(&out_file.to_string_lossy());

    let api = format!(
        "https://api.github.com/repos/{}/{}/releases/latest",
        GH_OWNER, GH_REPO
    );
    let api_ps = quote_ps_single(&api);

    // Notes:
    // - GitHub API requires a User-Agent, PowerShell sets one; we also set explicitly.
    // - We pick the first asset that ends with '-setup.exe'.
    // - If download fails, we bubble up a readable error.
    let script = format!(
        "$ErrorActionPreference='Stop'; \
         $api = {api_ps}; \
         $headers = @{{ 'User-Agent' = 'HiroCrosshair-Installer' }}; \
         $rel = Invoke-RestMethod -Headers $headers -Uri $api; \
         $asset = $rel.assets | Where-Object {{ $_.name -like '*-setup.exe' }} | Select-Object -First 1; \
         if ($null -eq $asset) {{ throw 'No *-setup.exe asset found in latest release.' }}; \
         $url = $asset.browser_download_url; \
         Invoke-WebRequest -Headers $headers -Uri $url -OutFile {out_file_ps}; \
         Write-Output {out_file_ps};"
    );

    let output = std::process::Command::new("powershell.exe")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            &script,
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to download installer: {stderr}"));
    }

    if !out_file.is_file() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(format!(
            "Download did not produce a file. Output: {}",
            stdout.trim()
        ));
    }

    Ok(out_file)
}

#[cfg(not(windows))]
fn download_latest_setup_to_temp() -> Result<PathBuf, String> {
    Err("Installer launcher is only supported on Windows.".to_string())
}

#[tauri::command]
async fn download_latest_setup() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || download_latest_setup_to_temp())
        .await
        .map_err(|e| e.to_string())?
        .map(|p| p.to_string_lossy().to_string())
}

#[cfg(windows)]
fn run_installer_process(setup: &Path, args: &[String], elevated: bool) -> Result<i32, String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    if elevated {
        let file = quote_ps_single(&setup.to_string_lossy());
        let arg_array = args
            .iter()
            .map(|a| quote_ps_single(a))
            .collect::<Vec<_>>()
            .join(",");
        let script = format!(
            "$ErrorActionPreference='Stop'; \
             $p = Start-Process -FilePath {file} -ArgumentList @({arg_array}) -Verb RunAs -PassThru -Wait; \
             if ($null -ne $p -and $null -ne $p.ExitCode) {{ exit $p.ExitCode }} else {{ exit 1 }}"
        );
        let status = std::process::Command::new("powershell.exe")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                &script,
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .status()
            .map_err(|e| e.to_string())?;
        return Ok(status.code().unwrap_or(-1));
    }

    let status = std::process::Command::new(setup)
        .args(args)
        .creation_flags(CREATE_NO_WINDOW)
        .status()
        .map_err(|e| e.to_string())?;
    Ok(status.code().unwrap_or(-1))
}

#[cfg(not(windows))]
fn run_installer_process(_setup: &Path, _args: &[String], _elevated: bool) -> Result<i32, String> {
    Err("Installer launcher is only supported on Windows.".to_string())
}

#[tauri::command]
async fn run_installer(
    setup_path: String,
    install_dir: String,
    all_users: bool,
    desktop_shortcut: bool,
) -> Result<i32, String> {
    let setup = PathBuf::from(setup_path);
    if !setup.is_file() {
        return Err(format!("Setup not found: {}", setup.display()));
    }
    apply_desktop_shortcut_option(desktop_shortcut)?;
    let args = build_nsis_args(&install_dir, all_users);

    tauri::async_runtime::spawn_blocking(move || run_installer_process(&setup, &args, all_users))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
fn launch_installed_app(install_dir: String) -> Result<(), String> {
    let exe = Path::new(&install_dir).join(PRODUCT_EXE);
    if !exe.is_file() {
        return Err(format!(
            "Executable not found at {}. If the install succeeded, check the install folder.",
            exe.display()
        ));
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        std::process::Command::new(&exe)
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(windows))]
    {
        std::process::Command::new(&exe)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_default_install_dir,
            resolve_setup_path,
            download_latest_setup,
            run_installer,
            launch_installed_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running HiroCrosshair installer launcher");
}

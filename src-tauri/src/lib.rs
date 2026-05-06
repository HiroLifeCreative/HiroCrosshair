use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, State, Window,
};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_updater::UpdaterExt;

struct OverlayState {
    visible: Mutex<bool>,
    ignore_clicks: Mutex<bool>,
    /// Map from accelerator string -> overlay id (for per-game hotkeys)
    hotkeys: Mutex<HashMap<String, String>>,
}

#[derive(Debug, Serialize)]
struct UpdateInfo {
    version: String,
    date: Option<String>,
    body: Option<String>,
}

fn updater_endpoints(channel: &str) -> Vec<tauri::Url> {
    // Keep these in sync with `src-tauri/tauri.conf.json` defaults.
    // Channel logic lives in Rust so the UI toggle actually changes behavior.
    let urls: Vec<&str> = match channel {
        "beta" => vec![
            "https://github.com/HiroLifeCreative/HiroCrosshair/releases/download/beta/latest.json",
            "https://github.com/HiroLifeCreative/HiroCrosshair/releases/latest/download/latest.json",
        ],
        _ => vec!["https://github.com/HiroLifeCreative/HiroCrosshair/releases/latest/download/latest.json"],
    };
    urls
        .into_iter()
        .filter_map(|s| tauri::Url::parse(s).ok())
        .collect()
}

#[tauri::command]
async fn updater_check(channel: String, app: tauri::AppHandle) -> Result<Option<UpdateInfo>, String> {
    let endpoints = updater_endpoints(channel.as_str());
    let update = app
        .updater_builder()
        .endpoints(endpoints)
        .map_err(|e| e.to_string())?
        .build()
        .map_err(|e| e.to_string())?
        .check()
        .await
        .map_err(|e| e.to_string())?;

    Ok(update.map(|u| UpdateInfo {
        version: u.version.to_string(),
        date: u.date.map(|d| d.to_string()),
        body: u.body.map(|b| b.to_string()),
    }))
}

#[tauri::command]
async fn updater_download_and_install(channel: String, app: tauri::AppHandle) -> Result<(), String> {
    let endpoints = updater_endpoints(channel.as_str());
    if let Some(update) = app
        .updater_builder()
        .endpoints(endpoints)
        .map_err(|e| e.to_string())?
        .build()
        .map_err(|e| e.to_string())?
        .check()
        .await
        .map_err(|e| e.to_string())?
    {
        update
            .download_and_install(
                |_chunk_len, _content_len| {},
                || {},
            )
            .await
            .map_err(|e| e.to_string())?;
        app.restart();
    }
    Ok(())
}

#[tauri::command]
fn set_overlay_visible(
    visible: bool,
    _ignore_clicks: bool,
    window: Window,
    state: State<OverlayState>,
) -> Result<(), String> {
    let ignore_clicks = true; // FORCE TRUE to prevent user from getting stuck
    let app = window.app_handle();
    if let Some(overlay) = app.get_webview_window("overlay") {
        let _ = overlay.set_ignore_cursor_events(ignore_clicks);
        let _ = overlay.set_always_on_top(true);
        let _ = overlay.set_skip_taskbar(true);
        if visible {
            let _ = overlay.show();
            #[cfg(target_os = "windows")]
            apply_overlay_win_styles(&overlay, ignore_clicks);
        } else {
            let _ = overlay.hide();
        }
    }
    println!("[overlay] visible: {}, ignore_clicks: {}", visible, ignore_clicks);
    *state.visible.lock().map_err(|e| e.to_string())? = visible;
    *state.ignore_clicks.lock().map_err(|e| e.to_string())? = ignore_clicks;
    Ok(())
}

#[cfg(target_os = "windows")]
fn apply_overlay_win_styles(overlay: &tauri::WebviewWindow, ignore_clicks: bool) {
    use windows_sys::Win32::Foundation::HWND;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetWindowLongW, SetWindowLongW, SetWindowPos, GWL_EXSTYLE, HWND_TOPMOST, SWP_NOACTIVATE,
        SWP_NOMOVE, SWP_NOSIZE, WS_EX_LAYERED, WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW, WS_EX_TOPMOST,
        WS_EX_TRANSPARENT, SWP_NOOWNERZORDER,
    };
    if let Ok(hwnd_raw) = overlay.hwnd() {
        let hwnd = hwnd_raw.0 as HWND;
        unsafe {
            let cur = GetWindowLongW(hwnd, GWL_EXSTYLE) as u32;
            let mut new_style = (cur & !WS_EX_TOPMOST) // Remove it from bits to let SetWindowPos handle Z-order
                | WS_EX_LAYERED
                | WS_EX_TOOLWINDOW
                | WS_EX_NOACTIVATE;
            
            if ignore_clicks {
                new_style |= WS_EX_TRANSPARENT;
            } else {
                new_style &= !WS_EX_TRANSPARENT;
            }

            SetWindowLongW(hwnd, GWL_EXSTYLE, new_style as i32);
            // Force HWND_TOPMOST again after style change
            windows_sys::Win32::UI::WindowsAndMessaging::SetLayeredWindowAttributes(
                hwnd,
                0,
                254, // Force 254 instead of 255 to keep cursor visible on some GPUs
                windows_sys::Win32::UI::WindowsAndMessaging::LWA_ALPHA,
            );
            SetWindowPos(
                hwnd,
                HWND_TOPMOST,
                0,
                0,
                0,
                0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_NOOWNERZORDER | windows_sys::Win32::UI::WindowsAndMessaging::SWP_FRAMECHANGED,
            );
        }
    }
}

#[cfg(not(target_os = "windows"))]
#[allow(dead_code)]
fn apply_overlay_win_styles(_overlay: &tauri::WebviewWindow, _ignore: bool) {}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct MonitorInfo {
    name: String,
    width: u32,
    height: u32,
    x: i32,
    y: i32,
    is_primary: bool,
}

#[tauri::command]
fn get_available_monitors(app: tauri::AppHandle) -> Vec<MonitorInfo> {
    app.available_monitors()
        .unwrap_or_default()
        .into_iter()
        .map(|m| {
            let name = m.name().map(|s| s.to_string()).unwrap_or_else(|| "Unknown".to_string());
            let is_primary = app.primary_monitor().ok().flatten()
                .map(|p| p.name() == m.name())
                .unwrap_or(false);
            
            MonitorInfo {
                name,
                width: m.size().width,
                height: m.size().height,
                x: m.position().x,
                y: m.position().y,
                is_primary,
            }
        })
        .collect()
}

#[tauri::command]
fn set_overlay_monitor(monitor_name: String, app: tauri::AppHandle) -> Result<(), String> {
    if let Some(overlay) = app.get_webview_window("overlay") {
        let monitors = app.available_monitors().unwrap_or_default();
        if let Some(target) = monitors.into_iter().find(|m| m.name().map(|s| s == &monitor_name).unwrap_or(false)) {
            let _ = overlay.set_fullscreen(false);
            let _ = overlay.set_decorations(false);
            let _ = overlay.set_position(*target.position());
            let _ = overlay.set_size(*target.size());
        }
    }
    Ok(())
}

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn set_active_preset(id: String) {
    if let Ok(mut ap) = ACTIVE_PRESET.lock() {
        *ap = id;
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct DetectedGame {
    name: String,
    platform: String,
    install_dir: String,
    icon: Option<String>,
}

lazy_static::lazy_static! {
    static ref PRESETS: Mutex<Vec<PresetInfo>> = Mutex::new(vec![]);
    static ref ACTIVE_PRESET: Mutex<String> = Mutex::new(String::new());
    static ref GAMES: Mutex<Vec<GameInfo>> = Mutex::new(vec![]);
    static ref ACTIVE_GAME: Mutex<String> = Mutex::new(String::new());
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct PresetInfo {
    id: String,
    name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct GameInfo {
    id: String,
    name: String,
}

#[tauri::command]
fn sync_presets(presets: Vec<PresetInfo>) {
    if let Ok(mut p) = PRESETS.lock() {
        *p = presets;
    }
}

#[tauri::command]
fn sync_games(games: Vec<GameInfo>) {
    if let Ok(mut g) = GAMES.lock() {
        *g = games;
    }
}

#[tauri::command]
fn set_active_game(id: String) {
    if let Ok(mut ag) = ACTIVE_GAME.lock() {
        *ag = id;
    }
}


/// Scan installed games. Currently supports Steam libraryfolders.vdf parsing.
#[tauri::command]
fn scan_installed_games() -> Vec<DetectedGame> {
    let mut games: Vec<DetectedGame> = Vec::new();

    // --- STEAM ---
    // Steam install path on Windows is usually in registry, but %ProgramFiles(x86)%/Steam works for default installs.
    let steam_candidates = vec![
        std::env::var("ProgramFiles(x86)").ok().map(|p| format!("{}\\Steam", p)),
        std::env::var("ProgramFiles").ok().map(|p| format!("{}\\Steam", p)),
    ];
    let steam_root = steam_candidates
        .into_iter()
        .flatten()
        .find(|p| std::path::Path::new(p).exists());

    if let Some(steam) = steam_root {
        // Parse libraryfolders.vdf to find all library paths (very loose parse — just regex-style split)
        let libs_file = format!("{}\\steamapps\\libraryfolders.vdf", steam);
        let mut library_paths = vec![format!("{}\\steamapps", steam)];
        if let Ok(content) = std::fs::read_to_string(&libs_file) {
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("\"path\"") {
                    if let Some(start) = trimmed.rfind("\"") {
                        let before = &trimmed[..start];
                        if let Some(open) = before.rfind("\"") {
                            let p = &before[open + 1..start];
                            let cleaned = p.replace("\\\\", "\\");
                            library_paths.push(format!("{}\\steamapps", cleaned));
                        }
                    }
                }
            }
        }
        for lib in library_paths {
            if let Ok(entries) = std::fs::read_dir(&lib) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    let fname = match path.file_name().and_then(|s| s.to_str()) {
                        Some(n) => n.to_string(),
                        None => continue,
                    };
                    if fname.starts_with("appmanifest_") && fname.ends_with(".acf") {
                        if let Ok(content) = std::fs::read_to_string(&path) {
                            let mut name = String::new();
                            let mut installdir = String::new();
                            for l in content.lines() {
                                let t = l.trim();
                                if t.starts_with("\"name\"") {
                                    name = extract_vdf_value(t).unwrap_or_default();
                                } else if t.starts_with("\"installdir\"") {
                                    installdir = extract_vdf_value(t).unwrap_or_default();
                                }
                            }
                            if !name.is_empty() {
                                let install_path = format!("{}\\common\\{}", lib, installdir);
                                games.push(DetectedGame {
                                    name,
                                    platform: "Steam".to_string(),
                                    install_dir: install_path,
                                    icon: None,
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    // --- EPIC GAMES ---
    if let Some(programdata) = std::env::var_os("ProgramData") {
        let manifest_dir = std::path::PathBuf::from(programdata)
            .join("Epic\\EpicGamesLauncher\\Data\\Manifests");
        if manifest_dir.exists() {
            if let Ok(entries) = std::fs::read_dir(&manifest_dir) {
                for entry in entries.flatten() {
                    if entry.path().extension().and_then(|e| e.to_str()) == Some("item") {
                        if let Ok(content) = std::fs::read_to_string(entry.path()) {
                            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                                let name = json.get("DisplayName").and_then(|v| v.as_str()).unwrap_or("").to_string();
                                let install = json.get("InstallLocation").and_then(|v| v.as_str()).unwrap_or("").to_string();
                                if !name.is_empty() {
                                    games.push(DetectedGame {
                                        name,
                                        platform: "Epic".to_string(),
                                        install_dir: install,
                                        icon: None,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // --- EA / Origin (Apex, Battlefield, FIFA, etc.) ---
    // EA Desktop registers installs in registry; we do a best-effort scan of common dirs.
    let ea_dirs = [
        std::env::var("ProgramFiles").ok().map(|p| format!("{}\\EA Games", p)),
        std::env::var("ProgramFiles").ok().map(|p| format!("{}\\Electronic Arts", p)),
        std::env::var("ProgramFiles(x86)").ok().map(|p| format!("{}\\Origin Games", p)),
    ];
    for d in ea_dirs.iter().flatten() {
        scan_subfolders(d, "EA", &mut games);
    }

    // --- Ubisoft Connect ---
    let ubi_dirs = [
        std::env::var("ProgramFiles(x86)").ok().map(|p| format!("{}\\Ubisoft\\Ubisoft Game Launcher\\games", p)),
        std::env::var("ProgramFiles").ok().map(|p| format!("{}\\Ubisoft\\Ubisoft Game Launcher\\games", p)),
    ];
    for d in ubi_dirs.iter().flatten() {
        scan_subfolders(d, "Ubisoft", &mut games);
    }

    // --- Battle.net ---
    let bnet_candidates = [
        std::env::var("ProgramFiles(x86)").ok().map(|p| format!("{}\\Battle.net", p)),
        std::env::var("ProgramFiles").ok().map(|p| format!("{}\\Battle.net", p)),
    ];
    for d in bnet_candidates.iter().flatten() {
        if std::path::Path::new(d).exists() {
            // Battle.net has games scattered; scan ProgramFiles\\<Common Names>
            for known in ["Diablo IV", "Overwatch", "World of Warcraft", "Hearthstone", "StarCraft II", "Call of Duty"] {
                if let Some(pf) = std::env::var("ProgramFiles").ok() {
                    let p = format!("{}\\{}", pf, known);
                    if std::path::Path::new(&p).exists() {
                        games.push(DetectedGame {
                            name: known.to_string(),
                            platform: "Battle.net".to_string(),
                            install_dir: p,
                            icon: None,
                        });
                    }
                }
            }
        }
    }

    // --- Riot (Valorant, League) ---
    let riot_dirs = [
        "C:\\Riot Games".to_string(),
        std::env::var("ProgramFiles").ok().map(|p| format!("{}\\Riot Games", p)).unwrap_or_default(),
    ];
    for d in riot_dirs.iter().filter(|s| !s.is_empty()) {
        scan_subfolders(d, "Riot", &mut games);
    }

    // --- GOG Galaxy ---
    if let Some(localapp) = std::env::var_os("LOCALAPPDATA") {
        let gog_db = std::path::PathBuf::from(localapp).join("GOG.com\\Galaxy\\Configuration\\config.json");
        if gog_db.exists() {
            // Just mark presence; deeper parsing would need sqlite. Skip for now.
        }
    }
    let gog_dirs = [
        std::env::var("ProgramFiles(x86)").ok().map(|p| format!("{}\\GOG Galaxy\\Games", p)),
        std::env::var("ProgramFiles").ok().map(|p| format!("{}\\GOG Galaxy\\Games", p)),
        Some("C:\\GOG Games".to_string()),
    ];
    for d in gog_dirs.iter().flatten() {
        scan_subfolders(d, "GOG", &mut games);
    }

    // Deduplicate by lowercase name
    let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();
    games.retain(|g| seen.insert(g.name.to_lowercase()));

    games.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    games
}

/// Scan immediate subfolders of `root` and add each as a detected game.
fn scan_subfolders(root: &str, platform: &str, games: &mut Vec<DetectedGame>) {
    let path = std::path::Path::new(root);
    if !path.exists() {
        return;
    }
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if !p.is_dir() {
                continue;
            }
            let name = match p.file_name().and_then(|s| s.to_str()) {
                Some(n) => n.to_string(),
                None => continue,
            };
            // Filter out launcher / system folders by lowercase keywords
            let lower = name.to_lowercase();
            if lower.contains("launcher") || lower.contains("redistribut") || lower.contains("setup") {
                continue;
            }
            games.push(DetectedGame {
                name,
                platform: platform.to_string(),
                install_dir: p.to_string_lossy().into_owned(),
                icon: None,
            });
        }
    }
}

fn extract_vdf_value(line: &str) -> Option<String> {
    let parts: Vec<&str> = line.split('"').collect();
    if parts.len() >= 5 {
        Some(parts[3].to_string())
    } else {
        None
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct HotkeyBinding {
    /// Accelerator string e.g. "Alt+1", "Ctrl+Shift+F1"
    accelerator: String,
    /// Identifier of what this hotkey targets (overlay id, "toggle", etc.)
    id: String,
    /// Action kind: "toggle-overlay" | "select-overlay"
    action: String,
}

#[derive(Debug, Serialize, Clone)]
struct HotkeyEvent {
    accelerator: String,
    id: String,
    action: String,
}

/// Register all hotkeys at once. Replaces any previously registered hotkeys.
#[tauri::command]
fn register_hotkeys(
    bindings: Vec<HotkeyBinding>,
    app: tauri::AppHandle,
    state: State<OverlayState>,
) -> Result<(), String> {
    let gs = app.global_shortcut();
    let _ = gs.unregister_all();

    let mut map: HashMap<String, String> = HashMap::new();
    let mut action_map: HashMap<String, String> = HashMap::new();

    for b in bindings.iter() {
        if b.accelerator.trim().is_empty() {
            continue;
        }
        println!("[hotkey] attempting to register: '{}'", b.accelerator);
        let shortcut = match parse_accelerator(&b.accelerator) {
            Some(s) => s,
            None => {
                eprintln!("[hotkey] invalid accelerator string: '{}'", b.accelerator);
                continue;
            }
        };
        let acc_key = b.accelerator.clone();
        map.insert(acc_key.clone(), b.id.clone());
        action_map.insert(acc_key.clone(), b.action.clone());

        let app_clone = app.clone();
        let id_clone = b.id.clone();
        let acc_clone = b.accelerator.clone();
        let action_clone = b.action.clone();
        if let Err(e) = gs.on_shortcut(shortcut, move |_app, _sc, event| {
            if event.state() == ShortcutState::Pressed {
                let payload = HotkeyEvent {
                    accelerator: acc_clone.clone(),
                    id: id_clone.clone(),
                    action: action_clone.clone(),
                };
                let _ = app_clone.emit("hiro:hotkey", payload);
            }
        }) {
            eprintln!("[hotkey] failed to register {}: {}", b.accelerator, e);
        } else {
            println!("[hotkey] registered {} -> {} ({})", b.accelerator, b.id, b.action);
        }
    }

    if let Ok(mut s) = state.hotkeys.lock() {
        *s = map;
    }
    let _ = action_map; // reserved for future use
    Ok(())
}

/// Legacy: single toggle hotkey. Kept for backward compat but routes via register_hotkeys.
#[tauri::command]
fn register_overlay_hotkey(
    accelerator: String,
    app: tauri::AppHandle,
    state: State<OverlayState>,
) -> Result<(), String> {
    register_hotkeys(
        vec![HotkeyBinding {
            accelerator,
            id: "toggle".to_string(),
            action: "toggle-overlay".to_string(),
        }],
        app,
        state,
    )
}

fn parse_accelerator(acc: &str) -> Option<Shortcut> {
    let mut mods = Modifiers::empty();
    let mut key: Option<Code> = None;
    for part in acc.split('+').map(|s| s.trim()) {
        match part.to_lowercase().as_str() {
            "ctrl" | "control" => mods |= Modifiers::CONTROL,
            "shift" => mods |= Modifiers::SHIFT,
            "alt" => mods |= Modifiers::ALT,
            "super" | "meta" | "win" | "cmd" => mods |= Modifiers::SUPER,
            other => key = Some(code_from_str(other)?),
        }
    }
    key.map(|k| Shortcut::new(Some(mods), k))
}

fn code_from_str(s: &str) -> Option<Code> {
    let upper = s.to_uppercase();
    Some(match upper.as_str() {
        "F1" => Code::F1, "F2" => Code::F2, "F3" => Code::F3, "F4" => Code::F4,
        "F5" => Code::F5, "F6" => Code::F6, "F7" => Code::F7, "F8" => Code::F8,
        "F9" => Code::F9, "F10" => Code::F10, "F11" => Code::F11, "F12" => Code::F12,
        "A" => Code::KeyA, "B" => Code::KeyB, "C" => Code::KeyC, "D" => Code::KeyD,
        "E" => Code::KeyE, "F" => Code::KeyF, "G" => Code::KeyG, "H" => Code::KeyH,
        "I" => Code::KeyI, "J" => Code::KeyJ, "K" => Code::KeyK, "L" => Code::KeyL,
        "M" => Code::KeyM, "N" => Code::KeyN, "O" => Code::KeyO, "P" => Code::KeyP,
        "Q" => Code::KeyQ, "R" => Code::KeyR, "S" => Code::KeyS, "T" => Code::KeyT,
        "U" => Code::KeyU, "V" => Code::KeyV, "W" => Code::KeyW, "X" => Code::KeyX,
        "Y" => Code::KeyY, "Z" => Code::KeyZ,
        "0" => Code::Digit0, "1" => Code::Digit1, "2" => Code::Digit2, "3" => Code::Digit3,
        "4" => Code::Digit4, "5" => Code::Digit5, "6" => Code::Digit6, "7" => Code::Digit7,
        "8" => Code::Digit8, "9" => Code::Digit9,
        "SPACE" => Code::Space, "ENTER" => Code::Enter, "ESC" | "ESCAPE" => Code::Escape,
        "TAB" => Code::Tab, "INSERT" => Code::Insert, "DELETE" => Code::Delete,
        "HOME" => Code::Home, "END" => Code::End,
        "PAGEUP" => Code::PageUp, "PAGEDOWN" => Code::PageDown,
        "NUMPAD0" => Code::Numpad0, "NUMPAD1" => Code::Numpad1, "NUMPAD2" => Code::Numpad2,
        "NUMPAD3" => Code::Numpad3, "NUMPAD4" => Code::Numpad4, "NUMPAD5" => Code::Numpad5,
        "NUMPAD6" => Code::Numpad6, "NUMPAD7" => Code::Numpad7, "NUMPAD8" => Code::Numpad8,
        "NUMPAD9" => Code::Numpad9, "NUMPADADD" | "NUMPAD+" => Code::NumpadAdd,
        "NUMPADSUB" | "NUMPAD-" => Code::NumpadSubtract, "NUMPADMULT" | "NUMPAD*" | "NUMPADMULTIPLY" => Code::NumpadMultiply,
        "NUMPADDIV" | "NUMPAD/" | "NUMPADDIVIDE" => Code::NumpadDivide, "NUMPADDEC" | "NUMPAD." | "NUMPADDECIMAL" => Code::NumpadDecimal,
        "NUMPADENTER" => Code::NumpadEnter,
        _ => return None,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec![])))
        .manage(OverlayState {
            visible: Mutex::new(false),
            ignore_clicks: Mutex::new(true),
            hotkeys: Mutex::new(HashMap::new()),
        })
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;

            // --- SYSTEM TRAY ---
            let toggle_i = MenuItemBuilder::with_id("toggle", "Activar / Desactivar").build(app)?;
            let show_i = MenuItemBuilder::with_id("show", "Opciones").build(app)?;
            let quit_i = MenuItemBuilder::with_id("quit", "Salir").build(app)?;
            let menu = MenuBuilder::new(app)
                .items(&[&toggle_i, &show_i, &quit_i])
                .build()?;

            let _ = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| {
                    println!("[tray] menu event: {:?}", event.id);
                    match event.id.as_ref() {
                        "quit" => { 
                            println!("[tray] exiting...");
                            app.exit(0); 
                        }
                        "show" => {
                            println!("[tray] showing main window...");
                            if let Some(win) = app.get_webview_window("main") {
                                let _ = win.show();
                                let _ = win.set_focus();
                            }
                        }
                        "toggle" => {
                            println!("[tray] toggling overlay...");
                            let _ = app.emit("hiro:tray-toggle", ());
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        let app = tray.app_handle();
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Prevent main window from being destroyed on close so listeners stay active
            if let Some(main_win) = app.get_webview_window("main") {
                let main_win_clone = main_win.clone();
                main_win.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = main_win_clone.hide();
                    }
                });
            }

            // --- STREAM DECK / EXTERNAL API (TCP) ---
            let handle_for_api = app.handle().clone();
            std::thread::spawn(move || {
                let listener = std::net::TcpListener::bind("127.0.0.1:1422");
                if let Ok(listener) = listener {
                    for stream in listener.incoming() {
                        if let Ok(mut stream) = stream {
                            let _ = stream.set_read_timeout(Some(std::time::Duration::from_millis(200)));
                            let mut buf = vec![0; 1024];
                            if let Ok(n) = std::io::Read::read(&mut stream, &mut buf) {
                                if n == 0 { continue; }
                                let raw = String::from_utf8_lossy(&buf[..n]);
                                
                                // Handle CORS Preflight
                                if raw.starts_with("OPTIONS ") {
                                    use std::io::Write;
                                    let _ = stream.write_all(b"HTTP/1.1 204 No Content\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: *\r\nConnection: close\r\n\r\n");
                                    continue;
                                }

                                if raw.contains("GET /list") {
                                    use std::io::Write;
                                    let body = if let Ok(g) = GAMES.lock() {
                                        serde_json::to_string(&*g).unwrap_or_else(|_| "[]".to_string())
                                    } else {
                                        "[]".to_string()
                                    };
                                    let response = format!("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}", body.len(), body);
                                    let _ = stream.write_all(response.as_bytes());
                                    continue;
                                }

                                if raw.contains("GET /presets") {
                                    use std::io::Write;
                                    let body = if let Ok(p) = PRESETS.lock() {
                                        serde_json::to_string(&*p).unwrap_or_else(|_| "[]".to_string())
                                    } else {
                                        "[]".to_string()
                                    };
                                    let response = format!("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}", body.len(), body);
                                    let _ = stream.write_all(response.as_bytes());
                                    continue;
                                }

                                let cmd = if raw.contains("?c=") {
                                    raw.split("?c=")
                                       .nth(1)
                                       .and_then(|s| s.split(' ').next())
                                       .map(|s| s.to_string())
                                       .unwrap_or_default()
                                } else {
                                    raw.trim().to_lowercase()
                                };

                                let mut final_visible = handle_for_api.get_webview_window("overlay").map(|w| w.is_visible().unwrap_or(false)).unwrap_or(false);

                                if !cmd.is_empty() {
                                    match cmd.as_ref() {
                                        "toggle" => { 
                                            println!("[remote] command received: toggle");
                                            final_visible = !final_visible;
                                            let _ = handle_for_api.emit("hiro:tray-toggle", ()); 
                                        }
                                        c if c.starts_with("game:") => {
                                            println!("[remote] command received: {}", c);
                                            let id = c.replace("game:", "");
                                            // Toggle behavior: selecting the current game again deactivates it.
                                            let next_id = if let Ok(mut ag) = ACTIVE_GAME.lock() {
                                                if ag.as_str() == id.as_str() {
                                                    ag.clear();
                                                    String::new()
                                                } else {
                                                    *ag = id.clone();
                                                    id.clone()
                                                }
                                            } else {
                                                id.clone()
                                            };
                                            let _ = handle_for_api.emit("hiro:select-game", next_id);
                                        }
                                        c if c.starts_with("preset:") => {
                                            println!("[remote] command received: {}", c);
                                            let id = c.replace("preset:", "");
                                            let current_id = ACTIVE_PRESET.lock().map(|ap| ap.clone()).unwrap_or_default();
                                            
                                            if !final_visible {
                                                // Turning ON
                                                final_visible = true;
                                                let _ = handle_for_api.emit("hiro:tray-toggle", ());
                                                let _ = handle_for_api.emit("hiro:apply-preset", id.clone());
                                            } else if id == current_id {
                                                // Turning OFF (same button)
                                                final_visible = false;
                                                let _ = handle_for_api.emit("hiro:tray-toggle", ());
                                            } else {
                                                // Just changing preset (staying visible)
                                                final_visible = true;
                                                let _ = handle_for_api.emit("hiro:apply-preset", id.clone());
                                            }

                                            if let Ok(mut ap) = ACTIVE_PRESET.lock() {
                                                *ap = id;
                                            }
                                        }
                                        _ => {}
                                    }
                                }
                                
                                // Return JSON status for Stream Deck sync
                                use std::io::Write;
                                let active_preset_id = ACTIVE_PRESET.lock().map(|ap| ap.clone()).unwrap_or_default();
                                let active_game_id = ACTIVE_GAME.lock().map(|ag| ag.clone()).unwrap_or_default();
                                let body = format!("{{\"visible\":{}, \"activePresetId\":\"{}\", \"activeGameId\":\"{}\"}}", final_visible, active_preset_id, active_game_id);
                                let response = format!("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}", body.len(), body);
                                let _ = stream.write_all(response.as_bytes());
                            }
                        }
                    }
                }
            });

            // --- GLOBAL MOUSE BUTTON SHORTCUTS ---
            let handle_for_mouse = app.handle().clone();
            std::thread::spawn(move || {
                #[cfg(target_os = "windows")]
                {
                    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_MBUTTON, VK_XBUTTON1, VK_XBUTTON2};
                    let mut m3_last = false;
                    let mut m4_last = false;
                    let mut m5_last = false;
                    loop {
                        std::thread::sleep(std::time::Duration::from_millis(15)); // ~60fps poll
                        unsafe {
                            let m3 = (GetAsyncKeyState(VK_MBUTTON as i32) as u16 & 0x8000) != 0;
                            let m4 = (GetAsyncKeyState(VK_XBUTTON1 as i32) as u16 & 0x8000) != 0;
                            let m5 = (GetAsyncKeyState(VK_XBUTTON2 as i32) as u16 & 0x8000) != 0;
                            
                            if m3 && !m3_last { let _ = handle_for_mouse.emit("hiro:mouse-hotkey", "MOUSE3"); }
                            if m4 && !m4_last { let _ = handle_for_mouse.emit("hiro:mouse-hotkey", "MOUSE4"); }
                            if m5 && !m5_last { let _ = handle_for_mouse.emit("hiro:mouse-hotkey", "MOUSE5"); }
                            
                            m3_last = m3;
                            m4_last = m4;
                            m5_last = m5;
                        }
                    }
                }
            });

            if let Some(overlay) = app.get_webview_window("overlay") {
                if let Some(mon) = app.primary_monitor().ok().flatten() {
                    let _ = overlay.set_position(*mon.position());
                    let _ = overlay.set_size(*mon.size());
                }
                let _ = overlay.set_fullscreen(false);
                let _ = overlay.set_decorations(false);
                let _ = overlay.set_always_on_top(true);
                let _ = overlay.set_ignore_cursor_events(true);
                let _ = overlay.hide();
                #[cfg(target_os = "windows")]
                apply_overlay_win_styles(&overlay, true);

                // Periodic top-most enforcement (helps with borderless fullscreen games)
                let overlay_for_loop = overlay.clone();
                let handle = app.handle().clone();
                std::thread::spawn(move || loop {
                    std::thread::sleep(std::time::Duration::from_millis(1500));
                    if overlay_for_loop.is_visible().unwrap_or(false) {
                        let _ = overlay_for_loop.set_always_on_top(true);
                        let _state = handle.state::<OverlayState>();
                        let ignore = true; // FORCE TRUE FOR DIAGNOSIS
                        let _ = overlay_for_loop.set_ignore_cursor_events(ignore);
                        let _ = overlay_for_loop.set_cursor_visible(true);
                        let _ = overlay_for_loop.set_cursor_icon(tauri::CursorIcon::Default);
                        
                        #[cfg(target_os = "windows")]
                        {
                            use windows_sys::Win32::UI::WindowsAndMessaging::{
                                LoadCursorW, SetCursor, IDC_ARROW,
                            };
                            unsafe {
                                let arrow = LoadCursorW(std::ptr::null_mut(), IDC_ARROW as _);
                                SetCursor(arrow);
                            }
                            apply_overlay_win_styles(&overlay_for_loop, ignore);
                        }
                    }
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_overlay_visible,
            get_app_version,
            updater_check,
            updater_download_and_install,
            scan_installed_games,
            register_overlay_hotkey,
            register_hotkeys,
            get_available_monitors,
            set_overlay_monitor,
            sync_presets,
            set_active_preset,
            sync_games,
            set_active_game,
        ])
        .run(tauri::generate_context!())
        .expect("error while running HiroCrosshair");
}

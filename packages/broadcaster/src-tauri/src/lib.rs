use tauri::Manager;

// ── Dev path: spawn channel server via the system Node.js binary ────────────
#[tauri::command]
async fn launch_channel_server(
    node_bin: String,
    script: String,
    config: String,
    cwd: String,
) -> Result<u32, String> {
    let child = std::process::Command::new(&node_bin)
        .arg(&script)
        .arg(&config)
        .current_dir(&cwd)
        .spawn()
        .map_err(|e| format!("Failed to spawn node: {e}"))?;
    Ok(child.id())
}

// ── Prod path: launch the bundled sidecar binary ────────────────────────────
#[tauri::command]
async fn launch_channel_server_sidecar(
    app: tauri::AppHandle,
    config: String,
) -> Result<u32, String> {
    use tauri_plugin_shell::ShellExt;
    use tauri_plugin_shell::process::CommandEvent;

    let (mut rx, child) = app
        .shell()
        .sidecar("channel-server")
        .map_err(|e| format!("Sidecar not found: {e}"))?
        .args([&config])
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {e}"))?;

    let pid = child.pid();

    // Drain stdout/stderr so the OS pipe buffer never fills and blocks the server.
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) | CommandEvent::Stderr(line) => {
                    eprintln!("[channel-server] {}", String::from_utf8_lossy(&line));
                }
                _ => {}
            }
        }
    });

    Ok(pid)
}

// ── Kill by PID (cross-platform) ────────────────────────────────────────────
#[tauri::command]
async fn kill_channel_server(pid: u32) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("taskkill")
            .args(["/F", "/PID", &pid.to_string()])
            .status()
            .map_err(|e| format!("Failed to kill server: {e}"))?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("kill")
            .arg(pid.to_string())
            .status()
            .map_err(|e| format!("Failed to kill server: {e}"))?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            launch_channel_server,
            launch_channel_server_sidecar,
            kill_channel_server,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

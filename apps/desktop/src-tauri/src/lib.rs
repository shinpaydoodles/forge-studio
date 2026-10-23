use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::{Manager, State};

struct RuntimeToken(String);
struct RuntimeChild(Mutex<Option<Child>>);

#[tauri::command]
fn runtime_token(token: State<'_, RuntimeToken>) -> String {
    token.0.clone()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let token = std::env::var("FORGE_DEV_TOKEN").unwrap_or_else(|_| {
        rand::random::<[u8; 32]>()
            .iter()
            .map(|byte| format!("{byte:02x}"))
            .collect()
    });
    tauri::Builder::default()
        .manage(RuntimeToken(token.clone()))
        .manage(RuntimeChild(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![runtime_token])
        .setup(move |app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            } else {
                let resource_dir = app.path().resource_dir()?;
                let binary = resource_dir.join("binaries").join("forge-node.exe");
                let entry = resource_dir.join("runtime").join("dist").join("main.js");
                let mut command = Command::new(binary);
                command.arg(entry).env("FORGE_DEV_TOKEN", &token);
                #[cfg(windows)]
                {
                    use std::os::windows::process::CommandExt;
                    command.creation_flags(0x08000000);
                }
                let child = command.spawn()?;
                *app.state::<RuntimeChild>().0.lock().unwrap() = Some(child);
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(mut child) = window.state::<RuntimeChild>().0.lock().unwrap().take() {
                    let _ = child.kill();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while building Forge Studio");
}

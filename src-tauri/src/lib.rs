/// Name of the unpacked WebView2 fixed-version runtime folder shipped beside the exe.
#[cfg(windows)]
const WEBVIEW2_RUNTIME_DIR: &str = "webview2-runtime";

/// Steam ships a bare executable rather than installer output, so the runtime folder
/// is laid out by the depot script. Tauri only sets this variable during context init,
/// which is after its own "is WebView2 installed" probe runs — on a machine with no
/// system runtime that probe aborts with an error dialog, so set it up front.
#[cfg(windows)]
fn use_bundled_webview2() {
  if std::env::var_os("WEBVIEW2_BROWSER_EXECUTABLE_FOLDER").is_some() {
    return;
  }

  let Ok(exe) = std::env::current_exe() else {
    return;
  };
  let Some(exe_dir) = exe.parent() else {
    return;
  };

  let runtime = exe_dir.join(WEBVIEW2_RUNTIME_DIR);
  if runtime.join("msedgewebview2.exe").is_file() {
    std::env::set_var("WEBVIEW2_BROWSER_EXECUTABLE_FOLDER", runtime);
  }
}

#[cfg(not(windows))]
fn use_bundled_webview2() {}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  use_bundled_webview2();

  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

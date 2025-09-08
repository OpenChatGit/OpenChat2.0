// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Return a list of locally available Ollama models (stub: empty list by default).
#[tauri::command]
fn get_ollama_models() -> Vec<String> {
    // TODO: Integrate with Ollama CLI or REST to enumerate models.
    Vec::new()
}

// Warm a model to reduce first-token latency (stub: no-op).
#[tauri::command]
async fn warm_model(_model: Option<String>) {
    // Intentionally no-op in the stub implementation.
}

// Simple, fast title generator fallback used by the frontend if backend LLM is unavailable.
// It trims to <= 6 words, strips quotes and trailing punctuation, and returns a single line.
#[tauri::command]
async fn generate_ai_response(message: String, _model: Option<String>) -> String {
    let mut s = message
        .lines()
        .next()
        .unwrap_or("")
        .trim()
        .to_string();

    // Collapse excessive whitespace
    s = s.split_whitespace().collect::<Vec<_>>().join(" ");

    // Keep at most 6 words
    let words: Vec<&str> = s.split_whitespace().collect();
    let limited = if words.len() > 6 { words[..6].join(" ") } else { s.clone() };

    // Strip wrapping quotes and trailing punctuation
    let mut t = limited.trim_matches(|c: char| c == '"' || c == '\'' || c == '`').to_string();
    while matches!(t.chars().last(), Some(c) if ",.!?:;—-".contains(c)) {
        t.pop();
    }
    if t.is_empty() { "New Chat".to_string() } else { t }
}

// Placeholder for LangChain streaming entrypoint (frontend currently doesn't consume its return).
// We accept a flexible payload and return an empty string to acknowledge the call.
#[tauri::command]
async fn generate_stream_langchain(
    _message: String,
    _conversation_history: Option<serde_json::Value>,
    _model: Option<String>,
    _regeneration_context: Option<serde_json::Value>,
    _tools_enabled: Option<bool>,
    _reasoning_enabled: Option<bool>,
) -> String {
    String::new()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_ollama_models,
            warm_model,
            generate_ai_response,
            generate_stream_langchain,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

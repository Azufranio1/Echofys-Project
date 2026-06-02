"""
Echofy DJ — Prompts controlados
─────────────────────────────────
Dos prompts con salida JSON estricta.
El modelo ligero (gemma2:2b) infiere energía del género.
El modelo principal (llama3.2:3b) genera la narración del DJ.
"""

# ══════════════════════════════════════════════════════
#  Mapa de energía por género
#  El DJ lo usa para inferir BPM/intensidad sin campo explícito
# ══════════════════════════════════════════════════════

GENRE_ENERGY = {
    # Alta energía
    "metal":        9,
    "hard rock":    8,
    "punk":         8,
    "electronic":   7,
    "dance":        7,
    "reggaeton":    7,
    "hip-hop":      6,
    "hiphop":       6,
    "pop":          6,
    # Media energía
    "alternative":  5,
    "rock":         5,
    "indie rock":   5,
    "r&b/soul":     4,
    "r&b":          4,
    "indie":        4,
    "afrobeats":    6,
    # Baja energía
    "jazz":         3,
    "classical":    2,
    "acoustic":     2,
    "folk":         2,
    "ambient":      1,
}

def get_energy(genre: str) -> int:
    """Devuelve el nivel de energía (1-9) de un género."""
    if not genre:
        return 5
    return GENRE_ENERGY.get(genre.lower().strip(), 5)

def energy_label(level: int) -> str:
    """Convierte el nivel numérico a etiqueta descriptiva."""
    if level >= 8: return "muy alta energía"
    if level >= 6: return "energía alta"
    if level >= 4: return "energía media"
    if level >= 2: return "energía suave"
    return "ambiente relajado"


# ══════════════════════════════════════════════════════
#  PROMPT 1 — Inicio de sesión DJ
#  Modelo: llama3.2:3b
#  Input:  mood del usuario + lista de canciones candidatas
#  Output: JSON con primera canción + presentación del DJ
# ══════════════════════════════════════════════════════

DJ_START_SYSTEM = """Eres Echofy DJ, el DJ personal del usuario dentro de la app Echofy.
Tu personalidad: carismático, cercano, musical. Hablas en primera persona como DJ.
Usas máximo 1-2 frases por transición. Nunca más.

REGLA CRÍTICA: Responde ÚNICAMENTE con un objeto JSON válido.
Sin texto antes ni después. Sin markdown. Sin explicaciones fuera del JSON.

Formato de respuesta obligatorio:
{
  "song_id": "id exacto de la canción elegida",
  "intro": "frase de presentación del DJ para abrir la sesión (1-2 frases máximo)",
  "reason": "por qué elegiste esta canción para este mood (interno, no se muestra al usuario)"
}"""

def build_dj_start_prompt(mood: str, candidates: list) -> str:
    """
    Construye el prompt de inicio de sesión.

    mood:       lo que el usuario escribió ("estoy programando", "quiero algo energético")
    candidates: lista de canciones disponibles con sus metadatos
    """
    songs_list = "\n".join(
        f'- id:{s["_id"]} | "{s["title"]}" de {s["artist"]} '
        f'| Género: {s.get("genre","?")} '
        f'| Energía: {energy_label(get_energy(s.get("genre","")))} '
        f'| Plays: {s.get("playCount", 0)}'
        for s in candidates[:20]   # máximo 20 candidatas para no saturar el contexto
    )

    return f"""El usuario quiere escuchar música con este contexto: "{mood}"

Canciones disponibles en el catálogo:
{songs_list}

Elige la canción más adecuada para este momento y devuelve el JSON."""


# ══════════════════════════════════════════════════════
#  PROMPT 2 — Transición entre canciones
#  Modelo: llama3.2:3b
#  Input:  canción anterior + señal de comportamiento + candidatas
#  Output: JSON con siguiente canción + narración de transición
# ══════════════════════════════════════════════════════

DJ_NEXT_SYSTEM = """Eres Echofy DJ, el DJ personal del usuario dentro de la app Echofy.
Tu personalidad: carismático, cercano, musical. Hablas en primera persona como DJ.
Usas máximo 1-2 frases por transición. Nunca más.

Señales de comportamiento del usuario:
- "completed":  escuchó la canción completa → le gustó, mantén o sube energía
- "skipped_early":  saltó antes del 30% → no le enganchó, cambia de dirección
- "skipped_mid":  saltó entre 30-70% → le gustó a medias, ajusta suavemente

REGLA CRÍTICA: Responde ÚNICAMENTE con un objeto JSON válido.
Sin texto antes ni después. Sin markdown. Sin explicaciones fuera del JSON.

Formato de respuesta obligatorio:
{
  "song_id": "id exacto de la canción elegida",
  "transition": "narración del DJ para la transición (1-2 frases máximo, en primera persona)",
  "energy_delta": "up | same | down",
  "reason": "justificación interna de la elección (no se muestra al usuario)"
}"""

def build_dj_next_prompt(
    prev_song: dict,
    listen_signal: str,       # "completed" | "skipped_early" | "skipped_mid"
    session_mood: str,        # mood original de la sesión
    candidates: list,
    lyrics_snippet: str = "", # primeras líneas de la letra de la canción anterior (opcional)
) -> str:
    """
    Construye el prompt de transición.

    prev_song:      canción que acaba de terminar/saltarse
    listen_signal:  cómo interactuó el usuario con la canción
    session_mood:   contexto original de la sesión (no cambia)
    candidates:     canciones disponibles para la siguiente
    lyrics_snippet: fragmento de letra de la canción anterior (si hay)
    """
    prev_energy = get_energy(prev_song.get("genre", ""))

    signal_interpretation = {
        "completed":     "Le gustó — quiere más de esto o algo que suba un escalón",
        "skipped_early": "No enganchó desde el inicio — necesita un cambio claro",
        "skipped_mid":   "Empezó bien pero perdió interés — ajuste suave",
    }.get(listen_signal, "Sin señal clara — mantén la línea")

    lyrics_context = ""
    if lyrics_snippet:
        lyrics_context = f'\nFragmento de letra de la canción anterior:\n"{lyrics_snippet[:200]}"\n'

    songs_list = "\n".join(
        f'- id:{s["_id"]} | "{s["title"]}" de {s["artist"]} '
        f'| Género: {s.get("genre","?")} '
        f'| Energía: {energy_label(get_energy(s.get("genre","")))} ({get_energy(s.get("genre",""))})'
        f'| Plays: {s.get("playCount", 0)}'
        for s in candidates[:20]
    )

    return f"""Sesión activa — Contexto del usuario: "{session_mood}"

Canción anterior:
- Título: "{prev_song.get('title','?')}" de {prev_song.get('artist','?')}
- Género: {prev_song.get('genre','?')} | Energía: {energy_label(prev_energy)} ({prev_energy}/9)
{lyrics_context}
Señal de comportamiento: {listen_signal} → {signal_interpretation}

Canciones disponibles para la siguiente:
{songs_list}

Elige la mejor canción para continuar la sesión y devuelve el JSON."""


# ══════════════════════════════════════════════════════
#  PROMPT 3 — Clasificador de mood (modelo ligero)
#  Modelo: gemma2:2b
#  Input:  texto libre del usuario
#  Output: JSON con mood estructurado
# ══════════════════════════════════════════════════════

DJ_MOOD_SYSTEM = """Eres un clasificador de estados de ánimo musicales.
Responde ÚNICAMENTE con JSON válido. Sin texto adicional.

Formato obligatorio:
{
  "mood": "descripción corta del estado (ej: concentración, energía, relax, melancolía)",
  "energy_target": 1-9,
  "genres_hint": ["género1", "género2"],
  "context": "actividad del usuario si se menciona (ej: programando, ejercicio, estudiar)"
}"""

def build_mood_prompt(user_input: str) -> str:
    return f'El usuario dice: "{user_input}"\nClasifica su estado de ánimo musical.'
"""
Echofy DJ — Prompts controlados (v2)
──────────────────────────────────────
Ahora incluye audioFeatures (vibeTag, energyLevel, tempoBPM)
y semanticAnalysis (mainTheme, emotionalTone) en los prompts
para que el modelo pueda elegir semánticamente.
"""

# ── Mapa de energía por género (fallback sin audioFeatures) ──
GENRE_ENERGY = {
    "metal":       9, "hard rock":  8, "punk":       8,
    "electronic":  7, "dance":      7, "reggaeton":  7,
    "hip-hop":     6, "hiphop":     6, "pop":        6,
    "alternative": 5, "rock":       5, "indie rock": 5,
    "r&b/soul":    4, "r&b":        4, "indie":      4,
    "afrobeats":   6, "jazz":       3, "classical":  2,
    "acoustic":    2, "folk":       2, "ambient":    1,
}

def get_energy(genre: str) -> int:
    return GENRE_ENERGY.get((genre or "").lower().strip(), 5)

def energy_label(level: int) -> str:
    if level >= 8: return "muy alta energía"
    if level >= 6: return "energía alta"
    if level >= 4: return "energía media"
    if level >= 2: return "energía suave"
    return "ambiente relajado"


def _song_line(s: dict) -> str:
    """
    Genera una línea descriptiva de una canción para el prompt.
    Incluye audioFeatures y semanticAnalysis si existen.
    """
    af  = s.get("audioFeatures") or {}
    sem = s.get("semanticAnalysis") or {}

    # Energía: usar audioFeatures si existe, si no inferir del género
    energy_raw = af.get("energyLevel", "")
    energy_map = {"low": 2, "medium": 5, "high": 8}
    energy_num = energy_map.get(energy_raw, get_energy(s.get("genre", "")))
    vibe       = af.get("vibeTag", "")
    bpm        = af.get("tempoBPM", "")

    # Análisis semántico
    theme      = sem.get("mainTheme", "")
    emotions   = ", ".join(sem.get("emotionalTone", []))
    metaphors  = "; ".join(sem.get("keyMetaphors", []))

    line = (
        f'- id:{s["_id"]} | "{s["title"]}" de {s["artist"]}'
        f' | Género: {s.get("genre","?")} | {energy_label(energy_num)}'
    )
    if vibe:       line += f' | Vibe: {vibe}'
    if bpm:        line += f' | BPM: {bpm}'
    if theme:      line += f' | Tema: {theme}'
    if emotions:   line += f' | Emociones: {emotions}'
    if metaphors:  line += f' | Metáforas: {metaphors}'

    return line


# ══════════════════════════════════════════════════════
#  PROMPT 1 — Inicio de sesión DJ
# ══════════════════════════════════════════════════════

DJ_START_SYSTEM = """Eres Echofy DJ, el DJ personal del usuario.
Tu personalidad: carismático, cercano, musical. Hablas en primera persona.
Usas máximo 1-2 frases por narración. Nunca más.

INSTRUCCIÓN CRÍTICA: Debes elegir la canción que mejor encaje con el mood
del usuario usando TODOS los datos disponibles: género, vibe, tema de letra,
tono emocional y metáforas. NO elijas al azar.

Responde ÚNICAMENTE con JSON válido, sin texto adicional:
{
  "song_id": "id exacto de la canción elegida",
  "intro": "presentación del DJ para abrir la sesión (1-2 frases)",
  "reason": "por qué esta canción encaja con el mood (interno)"
}"""

def build_dj_start_prompt(mood: str, candidates: list) -> str:
    songs_list = "\n".join(_song_line(s) for s in candidates[:20])
    return f"""El usuario quiere escuchar música con este mood: "{mood}"

Canciones disponibles (con análisis semántico y características de audio):
{songs_list}

Elige la canción que MEJOR encaje con "{mood}" considerando vibe, tema emocional
y metáforas de las letras. Devuelve el JSON."""


# ══════════════════════════════════════════════════════
#  PROMPT 2 — Transición entre canciones
# ══════════════════════════════════════════════════════

DJ_NEXT_SYSTEM = """Eres Echofy DJ, el DJ personal del usuario.
Tu personalidad: carismático, cercano, musical. Hablas en primera persona.
Usas máximo 1-2 frases. Nunca más.

Señales de comportamiento:
- "completed":     le gustó → mantén o evoluciona el mood
- "skipped_early": no enganchó → cambia de dirección
- "skipped_mid":   le gustó a medias → ajuste suave

INSTRUCCIÓN CRÍTICA: Elige la siguiente canción considerando:
1. La señal de comportamiento del usuario
2. El mood de la sesión
3. El vibe, tema emocional y metáforas de CADA candidata
4. La coherencia emocional entre la canción anterior y la siguiente

Responde ÚNICAMENTE con JSON válido:
{
  "song_id": "id exacto elegido",
  "transition": "narración de transición (1-2 frases, primera persona)",
  "energy_delta": "up | same | down",
  "reason": "justificación interna"
}"""

def build_dj_next_prompt(
    prev_song:     dict,
    listen_signal: str,
    session_mood:  str,
    candidates:    list,
    lyrics_snippet: str = "",
) -> str:
    af_prev  = prev_song.get("audioFeatures") or {}
    sem_prev = prev_song.get("semanticAnalysis") or {}

    signal_map = {
        "completed":     "Le encantó — continúa o evoluciona el mood",
        "skipped_early": "No enganchó — necesita un cambio claro",
        "skipped_mid":   "Empezó bien pero perdió interés — ajuste suave",
    }

    lyrics_ctx = f'\nLetras anteriores: "{lyrics_snippet}"' if lyrics_snippet else ""

    songs_list = "\n".join(_song_line(s) for s in candidates[:20])

    return f"""Sesión DJ — Mood del usuario: "{session_mood}"

Canción anterior: "{prev_song.get('title','?')}" de {prev_song.get('artist','?')}
  Vibe: {af_prev.get('vibeTag','?')} | Tema: {sem_prev.get('mainTheme','?')}
  Emociones: {', '.join(sem_prev.get('emotionalTone',[]))}
{lyrics_ctx}

Señal del usuario: {listen_signal} → {signal_map.get(listen_signal,'sin señal')}

Canciones disponibles:
{songs_list}

Elige la MEJOR siguiente canción considerando coherencia emocional y el mood de la sesión.
Devuelve el JSON."""


# ══════════════════════════════════════════════════════
#  PROMPT 3 — Clasificador de mood
# ══════════════════════════════════════════════════════

DJ_MOOD_SYSTEM = """Eres un clasificador de estados de ánimo musicales.
Responde ÚNICAMENTE con JSON válido. Sin texto adicional.

Formato obligatorio:
{
  "mood": "descripción del estado (ej: melancólico aventurero, concentración intensa)",
  "energy_target": 1-9,
  "genres_hint": ["género1", "género2"],
  "vibe_keywords": ["romántico", "nostálgico", "épico"],
  "context": "actividad si se menciona"
}"""

def build_mood_prompt(user_input: str) -> str:
    return f'El usuario dice: "{user_input}"\nClasifica su estado de ánimo musical incluyendo vibes emocionales.'
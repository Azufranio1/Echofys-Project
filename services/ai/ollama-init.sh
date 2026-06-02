#!/bin/bash
# services/ai/ollama-init.sh
# Ejecutar una vez después del primer docker compose up
# para descargar los modelos en el volumen persistente

echo "🤖 Descargando modelos de Ollama..."
echo "⚠️  Esto puede tardar varios minutos según tu conexión (~3.5 GB total)"
echo ""

echo "📦 Descargando llama3.2:3b (~2 GB) — modelo principal..."
docker exec echofy-ollama ollama pull llama3.2:3b

echo ""
echo "📦 Descargando gemma2:2b (~1.5 GB) — modelo ligero..."
docker exec echofy-ollama ollama pull gemma2:2b

echo ""
echo "✅ Modelos descargados. Verificando..."
docker exec echofy-ollama ollama list

echo ""
echo "🚀 Listo. Los modelos están en el volumen 'ollama_models' y persisten entre reinicios."
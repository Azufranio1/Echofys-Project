echo "🤖 Descargando modelos de Ollama..."
echo "⚠️  Esto puede tardar varios minutos según tu conexión (~3.5 GB total)"
echo ""
echo "📦 Descargando gemma2:9b (~2 GB)"
docker exec echofy-ollama ollama pull gemma2:9b

echo ""
echo "✅ Modelos descargados. Verificando..."
docker exec echofy-ollama ollama list

echo ""
echo "🚀 Listo. Los modelos están en el volumen 'ollama_models' y persisten entre reinicios."
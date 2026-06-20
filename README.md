# 🎧 Echofy - Sistema Distribuido de Streaming Musical Inteligente

Echofy es una plataforma web avanzada de streaming musical de diseño arquitectónico desacoplado, concebida para redefinir la manera en que los usuarios exploran, reproducen y gestionan su catálogo musical digital. A diferencia de las plataformas tradicionales de consumo masivo, Echofy integra un ecosistema local de Inteligencia Artificial que procesa metadatos cognitivos e interpreta el lenguaje natural para actuar como un locutor y curador musical dinámico en tiempo real.

---

## 📌 1. Definición del Problema y Objetivos

### El Problema
El consumo de música digital a gran escala se encuentra centralizado en plataformas propietarias comerciales (como Spotify o Apple Music). Si bien son eficientes, estos sistemas presentan limitaciones críticas en entornos académicos o de infraestructura privada: dependen estrictamente de costosas llamadas a APIs de nubes públicas, exponen datos de comportamiento del usuario a servidores de terceros y sus algoritmos de recomendación suelen basarse en tendencias comerciales masivas en lugar de un análisis profundo del subtexto semántico de las canciones y el estado anímico real del oyente.

### La Propuesta
Echofy surge como una **solución e infraestructura robusta On-Premise** orientada a:
* **Automatizar la ingesta analítica:** Eliminar el registro manual de características de audio procesando señales físicas y líricas de forma automatizada.
* **Garantizar la soberanía de los datos:** Ejecutar modelos de lenguaje masivos (LLMs) de forma 100% local en microservicios aislados dentro del servidor perimetral.
* **Redefinir la experiencia de usuario (Agentic UI):** Reemplazar las listas estáticas de reproducción por una sesión interactiva guiada por un agente inteligente de conversación que controla el reproductor de forma reactiva y asíncrona.

### Objetivo General
Diseñar, desarrollar e implementar un sistema distribuido de streaming musical estructurado en microservicios que incorpore un motor de Generación Aumentada por Recuperación (RAG) local y un orquestador de diálogo basado en agentes, garantizando un servicio de reproducción multimedia de baja latencia junto con un agente DJ capaz de automatizar recomendaciones de canciones mediante el procesamiento del lenguaje natural.

---

## 🏗️ 2. Arquitectura y Stack Tecnológico

El núcleo del sistema está diseñado bajo el patrón de **Arquitectura de Microservicios Desacoplados**, lo que permite aislar las cargas de computación intensiva de inferencia de IA y procesamiento analítico de audio de los flujos transaccionales tradicionales.

<img width="975" height="549" alt="image" src="https://github.com/user-attachments/assets/0e8cb999-8362-4d43-9aec-fc433680d907" />

### Stack de Componentes Fuertes:
* **Ecosistema AI & RAG (Microservicio AI):** Desarrollado en Python, utiliza el servidor de inferencia local **Ollama** con el modelo fundacional **Llama 3 (8B)** y **Gemma 2 (2B)**. La vectorización lírica se procesa mediante `nomic-embed-text` generando arreglos dimensionales indexados.
* **Procesamiento de Señales de Audio (Ingestor):** Escrito en Python empleando la biblioteca **Librosa** para extraer el mapa de ritmo analítico exacto (`tempoBPM`) de los archivos binarios de forma matemática.
* **Capa de Transacción y Streaming (Auth, Songs, Lyrics, Player):** Construidos sobre **Node.js con TypeScript** y Express, comunicándose dinámicamente con bases de datos documentales (**MongoDB**) y relacionales (**MySQL via Prisma**), sirviendo contenido multimedia directamente a través de llaves criptográficas de servicio.
* **Capa de Rendimiento y Memoria (Redis):** Actúa como bus de caché de alta velocidad para conservar estados del reproductor, ventana de contexto de interacción del DJ e invalidaciones automáticas de datos del catálogo musical.

---

## 🤖 3. Componente Estrella: Echofy DJ Interactivo

La innovación principal radica en el **Orquestador de Diálogo Basado en Agentes**. Mediante técnicas avanzadas de *Prompt Engineering*, el modelo *Llama 3* actúa simultáneamente en dos capas lógicas dentro de la interfaz:

1. **Capa Narrativa (Locutor Virtual):** Interpreta los requerimientos del usuario (ej: *"Pon algo movido porque estoy feliz por aprobar mi defensa, pero que tenga letras profundas"*), analiza el contexto conceptual usando RAG lírico sobre MongoDB y entabla un diálogo natural y carismático emulando a un locutor de radio en vivo.
2. **Capa Estructural (Controlador de Hardware Frontend):** El agente evalúa las intenciones de diálogo y emite de manera obligatoria e invisible estructuras de control rígidas en formato **JSON**. El sistema discrimina de forma asíncrona cuándo responder de forma casual (`CHAT_ONLY`) y cuándo disparar eventos físicos para alterar de forma reactiva la cola del reproductor en el frontend (`PLAY_NOW`), inyectando las canciones sugeridas de inmediato.

La memoria del agente se enriquece en tiempo real combinando el historial conversacional almacenado en **Redis** con señales de comportamiento del reproductor del usuario, tales como tracks escuchados completamente o canciones saltadas de forma prematura (`completed`, `skipped_early`), optimizando la ventana de contexto.

<img width="1488" height="909" alt="WhatsApp Image 2026-06-19 at 8 32 10 PM" src="https://github.com/user-attachments/assets/2a5c2f77-2f72-4ee9-bf72-e86bee16c959" />

---

## ⚙️ 4. Manual de Instalación y Despliegue

Este apartado describe los pasos técnicos necesarios para el aprovisionamiento, configuración e inicialización del entorno unificado de Echofy utilizando capas de virtualización autónomas.

### 4.1. Requisitos del Sistema y del Entorno
* **Sistema Operativo:** Windows 10/11 con soporte para WSL2 (Windows Subsystem for Linux 2).
* **Espacio en Disco:** Mínimo 10 GB de espacio libre (requerido para la construcción de imágenes y la descarga local de los pesos de los LLMs).
* **Memoria RAM:** Mínimo 4 GB recomendados para la ejecución paralela de la suite de microservicios.

### 4.2. Preparación del Entorno (WSL2 y Docker)
1. Abra la herramienta de Windows **"Activar o desactivar las características de Windows"**.
2. Asegúrese de activar las casillas correspondientes a:
   * **Subsistema de Windows para Linux**
   * **Plataforma de máquina virtual**
<img width="650" height="577" alt="image" src="https://github.com/user-attachments/assets/27d33bcd-f3fa-4889-bf1d-a6b9b3573d96" />

3. Haga clic en Aceptar y **reinicie obligatoriamente la computadora**.
4. Tras el reinicio, abra una consola de **PowerShell como Administrador** y configure WSL2 por defecto ejecutando: ```wsl --set-default-version 2```
<img width="975" height="258" alt="image" src="https://github.com/user-attachments/assets/82195fdb-ecd4-4ffa-aeba-3552f73f76c8" />

5. Descargue e instale Docker Desktop para Windows, validando que la casilla "Use WSL 2 instead of Hyper-V (recommended)" permanezca seleccionada durante el asistente de instalación. Abra la aplicación y compruebe que el motor esté corriendo en verde (Engine Running).
<img width="975" height="673" alt="image" src="https://github.com/user-attachments/assets/c1344cc5-18bf-4a5b-8a7f-85b8c65fc251" />
<img width="975" height="552" alt="image" src="https://github.com/user-attachments/assets/6780c16c-c5ed-4834-8220-3b52b74fbbcb" />



### 4.3. Configuración de Credenciales y Variables

1. Clone este repositorio y abra la carpeta raíz Echofy-Project en su entorno de desarrollo (ej. Visual Studio Code).
<img width="544" height="378" alt="image" src="https://github.com/user-attachments/assets/c093c76e-8d13-4fa8-acb9-d8dff2797c28" />
<img width="544" height="378" alt="image" src="https://github.com/user-attachments/assets/e8f527a1-7795-4d43-b47e-a61fed52d44f" />

2. Verifique la presencia de los archivos de configuración .env en las rutas de cada microservicio respectivo (/services/songs/.env, /services/auth/.env, etc.).
<img width="488" height="419" alt="image" src="https://github.com/user-attachments/assets/b2a70a3f-323a-47f8-bc62-14913abfeac8" />
<img width="458" height="309" alt="image" src="https://github.com/user-attachments/assets/2ff77d3a-b5ad-4f34-883d-78e092bc5db4" />
<img width="456" height="313" alt="image" src="https://github.com/user-attachments/assets/f7020813-a82d-46be-9239-807843cdae11" />
<img width="466" height="214" alt="image" src="https://github.com/user-attachments/assets/7942bf1c-34df-4fd8-b307-fa509a2d8b0b" />
<img width="466" height="305" alt="image" src="https://github.com/user-attachments/assets/0f997ca0-c376-4340-ab5d-a7127f47931e" />
<img width="445" height="308" alt="image" src="https://github.com/user-attachments/assets/91e47de8-9413-4e79-a825-5971a2b80dd4" />
<img width="463" height="273" alt="image" src="https://github.com/user-attachments/assets/e29c3a15-b1a7-4a1f-9c0e-30286e810d27" />
<img width="466" height="311" alt="image" src="https://github.com/user-attachments/assets/7c6ce507-2280-4fcd-97f2-c50f045324d7" />
<img width="467" height="278" alt="image" src="https://github.com/user-attachments/assets/3b852258-f3e7-426a-9c14-4451d224bb8b" />

3. Asegúrese de incluir el archivo de credenciales de Google Drive de forma local: valide que el archivo service-account.json se encuentre presente tanto en la carpeta /services/player como en /services/songs para habilitar la transmisión de audio binario por streaming de forma fluida.
<img width="466" height="311" alt="image" src="https://github.com/user-attachments/assets/d3e9f6d9-9ad9-40ac-9668-62d735d20b8d" />
<img width="445" height="308" alt="image" src="https://github.com/user-attachments/assets/013762f9-2c3e-4d8e-bcf7-3eaaed1a445a" />

### 4.4. Inicialización de los Microservicios

1. Desde la ruta raíz del proyecto en la terminal integrada de su editor de código, levante el orquestador de contenedores ejecutando: ```docker-compose up --build```
<img width="647" height="211" alt="image" src="https://github.com/user-attachments/assets/00dffe0a-e89f-4205-8717-21fbe62c00fd" />
<img width="886" height="214" alt="image" src="https://github.com/user-attachments/assets/09e12f4f-b2dd-414a-b2aa-4224fb90de57" />
<img width="975" height="490" alt="image" src="https://github.com/user-attachments/assets/6c2b1e59-a062-41db-8204-5bb315b6cbda" />

2. Docker descargará y compilará las imágenes base ligeras de Node.js, Python y Redis, instalando de forma aislada las dependencias requeridas (requirements.txt y package.json). El proceso concluirá cuando los logs unificados transmitan en tiempo real el inicio de los puertos internos.
<img width="975" height="399" alt="image" src="https://github.com/user-attachments/assets/f4a8ea4d-ae34-495b-9168-0f733c7e7c84" />

### 4.5. Configuración e Inferencia del Modelo Local de IA

1. Con la suite de servicios activa, abra una nueva terminal paralela apuntando a la raíz del proyecto.
<img width="1123" height="93" alt="image" src="https://github.com/user-attachments/assets/51df12c5-18a5-44ed-bec6-03bd7080ef78" />

2. Ejecute el comando de inicialización para realizar la descarga y ejecución local del modelo base en Ollama:``` docker exec -it echofy-ollama ollama run gemma2:9b ```
<img width="1123" height="93" alt="image" src="https://github.com/user-attachments/assets/5ee2c4f9-56dc-4588-91b0-44162f07467f" />

3. Una vez completada la barra de descarga e inicializado el prompt de Ollama en la consola, el microservicio de IA se encuentra sincronizado y listo para recibir peticiones JSON automatizadas desde la plataforma. 

### 4.6. Acceso a la Aplicación Web

1. Diríjase a Docker Desktop, expanda el grupo de contenedores de echofy-project y localice el servicio denominado echofy-frontend.
<img width="975" height="633" alt="image" src="https://github.com/user-attachments/assets/6e5978a1-abef-4877-8d5a-e602740bea84" />

2. En la sección de puertos expuestos, haga clic en el hipervínculo del puerto 5173:5173.
<img width="975" height="35" alt="image" src="https://github.com/user-attachments/assets/009c5305-5bae-4e9d-8735-3f95e33259ff" />

3. El navegador abrirá automáticamente la plataforma en la dirección local fija:
<img width="975" height="523" alt="image" src="https://github.com/user-attachments/assets/9144aab4-e09e-4210-bf55-f810c7a11486" />

## 🧪 5. Credenciales de Prueba e Integridad del Sistema

Para validar la correcta interconexión entre la red de microservicios distribuidos, la base de datos documental (MongoDB), relacional (MySQL), la caché persistente (Redis) y las APIs de Google Drive, acceda al login con los siguientes perfiles de prueba:
- Acceso de Prueba General (Caja Negra):
  - Usuario: testusuario@echofy.com
  - Contraseña: EchofyTest2026!
- Acceso Premium Avanzado:
  - Usuario: Azu@echofy.com
  - Contraseña: Mr_Master123
 
### Protocolo de Verificación del Software:
Una vez autenticado en el sistema, realice las siguientes tres acciones de integridad para certificar la estabilidad de la arquitectura:
* **Validación del Catálogo (MongoDB + Redis):** Ingrese al Inicio. El renderizado exitoso de las carátulas musicales (artworks) y metadatos confirma que la base de datos documental y el bus de caché en Redis están respondiendo en microsegundos.
<img width="1123" height="603" alt="image" src="https://github.com/user-attachments/assets/be2a97b8-8984-4a6a-b927-729f4122a6e8" />

* **Validación de Streaming (Google Drive API):** Presione reproducir en un track. Si el contador de tiempo avanza y el audio se reproduce, el microservicio ha resuelto correctamente los tokens criptográficos de la cuenta de servicio y está transmitiendo audio binario en tiempo real.
<img width="1123" height="532" alt="image" src="https://github.com/user-attachments/assets/ddf761f3-84ec-4829-940d-01350190810e" />

* **Validación del Agente DJ (AI Container + Inferencia):** Active la interfaz interactiva del DJ y solicite una recomendación conversacional por chat. Si el agente le responde textualmente y acopla una canción de forma automática al reproductor físico, la red de inferencia local dispone de la VRAM y los recursos de procesamiento adecuados.
<img width="1122" height="532" alt="image" src="https://github.com/user-attachments/assets/5e1b1fba-0745-49b6-ad7c-ee87d19c4c53" />
<img width="1125" height="533" alt="image" src="https://github.com/user-attachments/assets/77fe6a27-3de6-4297-9ecf-8a75620b3111" />

## 🛠️ 6. Solución de Problemas Comunes

- Error: Conflicto de puertos ocupados (Port already in use)
  - Causa: Instancias de Node, Redis o MySQL corriendo localmente en el sistema operativo anfitrión fuera de Docker, bloqueando los puertos nativos (ej. 6379, 8082).
  - Solución: Cierre los procesos locales o abra la terminal de Windows y elimine el proceso mediante su identificador: ```taskkill /f /im <nombre_proceso>```
Posteriormente ejecute ```docker-compose down``` y vuelva a levantar el orquestador.

- Error: El catálogo musical no se actualiza
  - Causa: El microservicio lee los metadatos directamente desde la memoria RAM administrada por Redis para anular la latencia de red. Al inyectar nuevas canciones con el Ingestor Python, Redis requiere invalidar su memoria de forma manual.
  - Solución: Reinicie exclusivamente el contenedor de caché para forzar la lectura limpia y directa desde MongoDB ejecutando:  ```docker restart echofy-redis```

- Error: Firma JWT inválida (Invalid JWT Signature)
  - Causa: El reloj interno de la máquina virtual de WSL2 se desincroniza al suspender o hibernar la computadora anfitriona Windows. La divergencia horaria invalida las firmas de seguridad criptográficas frente a los servidores de Google.
  - Solución: Cierre sesión y vuelva a loguearse en el frontend. Si la falla persiste, abra PowerShell como Administrador y fuerce un reinicio completo del hipervisor de Linux ejecutando:  ```wsl --shutdown```. Abra Docker Desktop nuevamente y el reloj del hardware de WSL2 se sincronizará inmediatamente con el huso horario de internet de Windows.

## PD: 
- Para probar las funciones de pago se recomienda realizar un pago de suscripción mensual al QR que el sistema proporcionará. En cuyo caso, se solicita enviar un mensaje o correo indicando que se realizó el pago para proceder con la devolución posterior del dinero.
- Para probar las funciones Premium se recomienda utilizar las siguientes Credenciales:
  - Correo: Azu@echofy.com
  - Password: Mr_Master123

---



### ✨ Echofy® fue desarrollado bajo metodología ágil Extreme Programming (XP) por el grupo BitMates (2026).

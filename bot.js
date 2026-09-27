const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const qrcode = require('qrcode');
const express = require('express');
const pino = require('pino');
const { procesarComando } = require('./tareas');

const app = express();
const port = process.env.PORT || 10000;

// ===== ESTADO GLOBAL =====
let qrActual = null;
let conectado = false;
let sockGlobal = null;
let iniciando = false;

// ==========================================
// CONTROL DE PRESENCIA
// ==========================================
let intervaloPresencia = null;

// ==========================================
// CONTROL DE RECONEXIÓN
// ==========================================
let reconexionProgramada = false;
let generacionSocket = 0;

// =========================
// INTERFAZ WEB
// =========================
app.get('/', async (req, res) => {
    res.setHeader('Content-Type', 'text/html');

    if (conectado) {
        res.send(`
            <body style="background:#000;color:#0f0;text-align:center;font-family:sans-serif;padding-top:50px;">
                <h1>✅ BOT SATEX ACTIVO</h1>
                <p>Ya puedes cerrar esta pestaña.</p>
            </body>
        `);
        return;
    }

    if (qrActual) {
        try {
            const qrImage = await qrcode.toDataURL(qrActual);

            res.send(`
                <html>
                <body style="background:#000;color:white;text-align:center;font-family:sans-serif;padding-top:50px;">
                    <h1>Vincular WhatsApp Satex</h1>
                    <img src="${qrImage}" style="border:10px solid white; width:300px;"/>
                    <p>Escanea este código con tu celular.</p>

                    <script>
                        setTimeout(() => location.reload(), 20000);
                    </script>
                </body>
                </html>
            `);

        } catch (e) {

            res.send(
                '<h1>Generando QR... recarga en 5 segundos</h1>'
            );
        }

        return;
    }

    res.send(`
        <body style="background:#000;color:white;text-align:center;font-family:sans-serif;padding-top:50px;">
            <h1>🔄 Iniciando...</h1>
            <p>Si tarda más de 30 segundos, recarga la página.</p>

            <script>
                setTimeout(() => location.reload(), 5000);
            </script>
        </body>
    `);
});

// ==========================================
// KEEP-ALIVE PARA RENDER
// ==========================================
app.get('/keep-alive', (req, res) => {

    res.status(200).json({
        ok: true,
        whatsappConectado: conectado,
        estado: conectado
            ? 'CONECTADO'
            : 'DESCONECTADO',
        timestamp: new Date().toISOString()
    });
});

// =========================
// SERVIDOR
// =========================
app.listen(port, () => {

    console.log(
        '🚀 Servidor en puerto ' + port
    );

    iniciarWhatsApp();
});

// ==========================================
// PRESENCIA ONLINE
// ==========================================
function iniciarPresencia(
    miSocket,
    miGeneracion
) {

    if (intervaloPresencia) {

        clearInterval(
            intervaloPresencia
        );

        intervaloPresencia = null;
    }

    const publicarPresencia = async () => {

        try {

            if (
                sockGlobal !== miSocket ||
                generacionSocket !== miGeneracion ||
                !conectado ||
                !miSocket?.user
            ) {
                return;
            }

            await miSocket.sendPresenceUpdate(
                'available'
            );

        } catch (err) {

            console.log(
                '⚠️ Error actualizando presencia:',
                err.message
            );
        }
    };

    // Publicación inmediata.
    void publicarPresencia();

    // Renovación periódica.
    //
    // Baileys documenta que la presencia
    // expira después de aproximadamente
    // 10 segundos.
    intervaloPresencia = setInterval(
        publicarPresencia,
        5000
    );
}

// ==========================================
// DETENER PRESENCIA
// ==========================================
function detenerPresencia() {

    if (intervaloPresencia) {

        clearInterval(
            intervaloPresencia
        );

        intervaloPresencia = null;
    }
}

// ==========================================
// RECONEXIÓN CONTROLADA
// ==========================================
function programarReconexion() {

    if (reconexionProgramada) {
        return;
    }

    reconexionProgramada =
        true;

    console.log(
        '🔄 Reconexión programada en 5 segundos...'
    );

    setTimeout(
        async () => {

            reconexionProgramada =
                false;

            try {

                await iniciarWhatsApp();

            } catch (err) {

                console.log(
                    '❌ Error durante reconexión:',
                    err.message
                );
            }

        },
        5000
    );
}

// =========================
// BOT WHATSAPP
// =========================
async function iniciarWhatsApp() {

    if (iniciando) {
        return;
    }

    iniciando =
        true;

    // Nueva generación para identificar
    // exclusivamente este socket.
    const miGeneracion =
        ++generacionSocket;

    try {

        conectado =
            false;

        detenerPresencia();

        // ==========================================
        // CERRAR SOCKET ANTERIOR
        // ==========================================
        if (sockGlobal) {

            try {
                sockGlobal.ev.removeAllListeners();
            } catch {}

            try {
                sockGlobal.ws?.close();
            } catch {}

            sockGlobal =
                null;
        }

        // ==========================================
        // OBTENER VERSIÓN WEB DE WHATSAPP
        // ==========================================
        const {
            version
        } =
            await fetchLatestBaileysVersion();

        // ==========================================
        // SESIÓN ORIGINAL
        // ==========================================
        const {
            state,
            saveCreds
        } =
            await useMultiFileAuthState(
                './sesion_satex'
            );

        // ==========================================
        // CREAR SOCKET
        // ==========================================
        const sock =
            makeWASocket({

                version,

                auth:
                    state,

                logger:
                    pino({
                        level: 'silent'
                    }),

                browser: [
                    'Satex Bot',
                    'Safari',
                    '1.0.0'
                ],

                // ==================================
                // MARCAR ONLINE AL CONECTAR
                // ==================================
                markOnlineOnConnect:
                    true,

                // ==================================
                // KEEP-ALIVE DEL WEBSOCKET
                // ==================================
                keepAliveIntervalMs:
                    10000,

                // ==================================
                // MÁS MARGEN DE CONEXIÓN
                // ==================================
                connectTimeoutMs:
                    120000,

                defaultQueryTimeoutMs:
                    120000
            });

        sockGlobal =
            sock;

        sock.ev.on(
            'creds.update',
            saveCreds
        );

        // =========================
        // CONEXIÓN
        // =========================
        sock.ev.on(
            'connection.update',
            (update) => {

                // Ignorar eventos pertenecientes
                // a conexiones anteriores.
                if (
                    sockGlobal !== sock ||
                    generacionSocket !== miGeneracion
                ) {
                    return;
                }

                const {
                    connection,
                    lastDisconnect,
                    qr
                } = update;

                // =========================
                // QR
                // =========================
                if (qr) {

                    qrActual =
                        qr;

                    console.log(
                        '📡 QR generado'
                    );
                }

                // =========================
                // CONECTADO
                // =========================
                if (
                    connection === 'open'
                ) {

                    conectado =
                        true;

                    qrActual =
                        null;

                    console.log(
                        '✅ CONECTADO'
                    );

                    // Mantener "EN LÍNEA".
                    iniciarPresencia(
                        sock,
                        miGeneracion
                    );
                }

                // =========================
                // DESCONECTADO
                // =========================
                if (
                    connection === 'close'
                ) {

                    conectado =
                        false;

                    detenerPresencia();

                    const statusCode =
                        lastDisconnect
                            ?.error
                            ?.output
                            ?.statusCode;

                    console.log(
                        '❌ Conexión cerrada. Código:',
                        statusCode || 'N/D'
                    );

                    if (
                        sockGlobal === sock &&
                        generacionSocket === miGeneracion
                    ) {

                        sockGlobal =
                            null;
                    }

                    // Mantener comportamiento original:
                    // reconectar excepto cuando WhatsApp
                    // haya cerrado definitivamente la sesión.
                    const reconectar =
                        statusCode !==
                        DisconnectReason.loggedOut;

                    if (reconectar) {

                        programarReconexion();

                    } else {

                        console.log(
                            '🔒 Sesión cerrada por WhatsApp. Se requiere nueva vinculación.'
                        );
                    }
                }
            }
        );

        // =========================
        // MENSAJES
        // =========================
        sock.ev.on(
            'messages.upsert',
            async ({ messages }) => {

                // Mantener exactamente la lógica
                // de tu bot original.
                const msg =
                    messages[0];

                if (
                    !msg?.message ||
                    msg.key.fromMe
                ) {
                    return;
                }

                // IMPORTANTE:
                // No se cambia la llamada a tareas.js.
                await procesarComando(
                    msg,
                    sock
                );
            }
        );

    } catch (err) {

        conectado =
            false;

        detenerPresencia();

        console.log(
            '❌ Error en iniciarWhatsApp:',
            err.message
        );

        programarReconexion();

    } finally {

        iniciando =
            false;
    }
}

// ==========================================
// CIERRE LIMPIO PARA RENDER
// ==========================================
async function cierreLimpio(
    signal
) {

    console.log(
        `🛑 ${signal} recibido. Cerrando conexión de WhatsApp...`
    );

    conectado =
        false;

    detenerPresencia();

    try {

        if (sockGlobal) {

            try {
                sockGlobal.ev.removeAllListeners();
            } catch {}

            try {
                sockGlobal.ws?.close();
            } catch {}
        }

    } catch {}

    sockGlobal =
        null;
}

process.once(
    'SIGTERM',
    () => {

        cierreLimpio(
            'SIGTERM'
        ).finally(
            () => process.exit(0)
        );
    }
);

process.once(
    'SIGINT',
    () => {

        cierreLimpio(
            'SIGINT'
        ).finally(
            () => process.exit(0)
        );
    }
);

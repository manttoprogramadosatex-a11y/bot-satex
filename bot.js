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
            res.send('<h1>Generando QR... recarga en 5 segundos</h1>');
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

// =========================
// SERVIDOR
// =========================
app.listen(port, () => {
    console.log('🚀 Servidor en puerto ' + port);
    iniciarWhatsApp();
});

// =========================
// BOT WHATSAPP
// =========================
async function iniciarWhatsApp() {
    if (iniciando) return;
    iniciando = true;

    try {
        // evitar múltiples instancias
        if (sockGlobal) {
            sockGlobal.ev.removeAllListeners();
            sockGlobal = null;
        }

        const { state, saveCreds } = await useMultiFileAuthState('./sesion_satex');
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            auth: state,
            logger: pino({ level: 'silent' }),
            browser: ['Satex Bot', 'Safari', '1.0.0']
        });

        sockGlobal = sock;

        sock.ev.on('creds.update', saveCreds);

        // =========================
        // CONEXIÓN
        // =========================
        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                qrActual = qr;
                console.log('📡 QR generado');
            }

            if (connection === 'open') {
                conectado = true;
                qrActual = null;
                console.log('✅ CONECTADO');
            }

            if (connection === 'close') {
                conectado = false;

                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const reconectar = statusCode !== DisconnectReason.loggedOut;

                console.log('❌ Conexión cerrada. Reconectar:', reconectar);

                sockGlobal = null;

                if (reconectar) {
                    iniciando = false;
                    setTimeout(() => {
                        iniciarWhatsApp();
                    }, 5000); // 🔥 delay anti-loop
                }
            }
        });

        // =========================
        // MENSAJES
        // =========================
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            await procesarComando(msg, sock);
        });

    } catch (err) {
        console.log('❌ Error en iniciarWhatsApp:', err);

        iniciando = false;

        setTimeout(() => {
            iniciarWhatsApp();
        }, 7000);
    }

    iniciando = false;
}

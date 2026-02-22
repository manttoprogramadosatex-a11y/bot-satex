const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const express = require('express');
const pino = require('pino');
const { procesarComando } = require('./tareas'); 

const app = express();
const port = process.env.PORT || 10000;
let qrActual = null;
let conectado = false;

app.get('/', async (req, res) => {
    if (conectado) {
        res.send('<html><body style="background:#000;color:#0f0;text-align:center;padding-top:50px;font-family:sans-serif;"><h1>✅ BOT VINCULADO Y ACTIVO</h1><p>Ya puedes cerrar esta pestaña.</p></body></html>');
    } else if (qrActual) {
        const qrImagen = await qrcode.toDataURL(qrActual);
        res.send(`<html><body style="background:#000;color:white;text-align:center;padding-top:50px;font-family:sans-serif;"><h1>Vincular WhatsApp Satex</h1><img src="${qrImagen}" style="border:10px solid white;width:300px;"/><p>Escanea este código para iniciar sesión.</p></body></html>`);
    } else {
        res.send('<html><body style="background:#000;color:white;text-align:center;padding-top:50px;"><h1>Generando QR...</h1><p>Recarga la página en 5 segundos.</p></body></html>');
    }
});

app.listen(port, () => { console.log('🚀 Servidor iniciado en puerto ' + port); iniciarWhatsApp(); });

async function iniciarWhatsApp() {
    // La carpeta 'sesion_satex' guardará tu conexión
    const { state, saveCreds } = await useMultiFileAuthState('./sesion_satex');
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({ 
        version, 
        auth: state, 
        logger: pino({ level: 'silent' }), 
        browser: ['Satex System', 'Safari', '1.0.0'] 
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) { qrActual = qr; conectado = false; console.log('⚠️ Esperando escaneo de QR...'); }
        if (connection === 'open') { 
            qrActual = null; 
            conectado = true; 
            console.log('✅ BOT CONNECTED - WhatsApp listo'); 
        }
        if (connection === 'close') {
            conectado = false;
            const debieraReconectar = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (debieraReconectar) {
                console.log('🔄 Reconectando...');
                iniciarWhatsApp();
            } else {
                console.log('❌ Sesión cerrada. Borra la carpeta sesion_satex y reinicia para nuevo QR.');
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const texto = (msg.message.conversation || msg.message.extendedTextMessage?.text || "");
        await procesarComando(texto, msg.key.remoteJid, sock);
    });
}

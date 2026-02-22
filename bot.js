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
        res.send('<html><body style="background:#000;color:#0f0;text-align:center;padding-top:50px;font-family:sans-serif;"><h1>✅ BOT SATEX ACTIVO</h1></body></html>');
    } else if (qrActual) {
        const qrImagen = await qrcode.toDataURL(qrActual);
        res.send(`<html><body style="background:#000;color:white;text-align:center;padding-top:50px;font-family:sans-serif;"><h1>Vincular WhatsApp</h1><img src="${qrImagen}" style="width:300px;border:10px solid white;"/><p>Escanea para conectar el Bot.</p></body></html>`);
    } else {
        res.send('<html><body style="background:#000;color:white;text-align:center;padding-top:50px;"><h2>Iniciando... Recarga en 5 segundos.</h2></body></html>');
    }
});

app.listen(port, () => { console.log('🚀 Servidor iniciado'); iniciarWhatsApp(); });

async function iniciarWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('./sesion_satex');
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({ 
        version, 
        auth: state, 
        logger: pino({ level: 'silent' }), 
        browser: ['Satex System', 'Chrome', '1.0.0'] 
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) { qrActual = qr; conectado = false; }
        if (connection === 'open') { qrActual = null; conectado = true; console.log('✅ BOT CONECTADO'); }
        if (connection === 'close') {
            conectado = false;
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) iniciarWhatsApp();
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        // Pasamos el mensaje completo y la conexión a la lógica de tareas
        await procesarComando(msg, sock);
    });
}

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
        res.send('<html><body style="background:#000;color:#0f0;text-align:center;padding-top:50px;font-family:sans-serif;"><h1>✅ BOT CONECTADO</h1><p>Ya puedes cerrar esta ventana.</p></body></html>');
    } else if (qrActual) {
        const qrImagen = await qrcode.toDataURL(qrActual);
        res.send(`<html><body style="background:#000;color:white;text-align:center;padding-top:50px;font-family:sans-serif;"><h1>Escanea el QR para Satex</h1><img src="${qrImagen}" style="border:10px solid white;width:300px;"/><p>El QR se actualiza solo cada 30 segundos.</p></body></html>`);
    } else {
        res.send('<html><body style="background:#000;color:white;text-align:center;padding-top:50px;"><h1>Generando QR...</h1><p>Espera 10 segundos y recarga la página.</p></body></html>');
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
        browser: ['Satex Bot', 'Chrome', '1.0.0'],
        printQRInTerminal: true 
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) { qrActual = qr; conectado = false; }
        if (connection === 'open') { 
            qrActual = null; 
            conectado = true; 
            console.log('✅ BOT CONECTADO'); 
        }
        if (connection === 'close') {
            conectado = false;
            const debieraReconectar = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (debieraReconectar) iniciarWhatsApp();
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

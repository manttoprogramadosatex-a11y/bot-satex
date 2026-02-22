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
    if (conectado) { res.send('✅ BOT SATEX ACTIVO'); }
    else if (qrActual) {
        const qrImagen = await qrcode.toDataURL(qrActual);
        res.send(`<html><body style="text-align:center;"><img src="${qrImagen}"/><p>Escanea el QR</p></body></html>`);
    } else { res.send('Iniciando...'); }
});

app.listen(port, () => { iniciarWhatsApp(); });

async function iniciarWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('./sesion_satex');
    const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }) });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update;
        if (qr) qrActual = qr;
        if (connection === 'open') { conectado = true; qrActual = null; }
        if (connection === 'close') iniciarWhatsApp();
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        await procesarComando(msg, sock);
    });
}

const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const express = require('express');
const pino = require('pino');
const { procesarComando } = require('./tareas'); 

const app = express();
const port = process.env.PORT || 10000;
let qrActual = null;

app.get('/', async (req, res) => {
    if (qrActual) {
        const qrImagen = await qrcode.toDataURL(qrActual);
        res.send(`<html><body style="background:#000;color:white;text-align:center;"><img src="${qrImagen}" style="width:300px;margin-top:50px;"/><h2>Escanea el QR</h2></body></html>`);
    } else { res.send('✅ BOT CONECTADO Y EN LINEA'); }
});

app.listen(port, () => { console.log('🚀 Servidor listo'); iniciarWhatsApp(); });

async function iniciarWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('./sesion_satex');
    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({ version, auth: state, logger: pino({ level: 'silent' }), browser: ['Satex', 'Chrome', '1.0.0'] });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (u) => {
        if (u.qr) qrActual = u.qr;
        if (u.connection === 'open') { qrActual = null; console.log('✅ BOT CONECTADO'); }
        if (u.connection === 'close') setTimeout(() => iniciarWhatsApp(), 5000);
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const texto = (msg.message.conversation || msg.message.extendedTextMessage?.text || "");
        await procesarComando(texto, msg.key.remoteJid, sock);
    });
}

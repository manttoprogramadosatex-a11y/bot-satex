const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
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
        res.setHeader('Content-Type', 'text/html');
        res.send('<h1>✅ BOT CONECTADO</h1>');
    } else if (qrActual) {
        const qrImage = await qrcode.toDataURL(qrActual);
        res.send(`<html><body style="background:black;color:white;text-align:center;">
            <h2>Escanea el QR</h2>
            <img src="${qrImage}" style="border:10px solid white; width:300px;"/>
            <p>Recarga la página si el QR expira.</p>
        </body></html>`);
    } else {
        res.send('Iniciando... Espera 10 segundos y recarga.');
    }
});

app.listen(port, () => { console.log('Servidor en puerto ' + port); iniciarWhatsApp(); });

async function iniciarWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('./sesion_satex');
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true
    });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) qrActual = qr;
        if (connection === 'open') { conectado = true; qrActual = null; console.log('BOT LISTO'); }
        if (connection === 'close') {
            conectado = false;
            const debieraReconectar = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (debieraReconectar) iniciarWhatsApp();
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        await procesarComando(msg, sock);
    });
}

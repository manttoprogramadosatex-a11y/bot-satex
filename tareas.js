const axios = require('axios');
const URL_SHEETS = 'https://script.google.com/macros/s/AKfycbzGs-EURtoi-prZ0B_endUgs3jYf4HqUCkQp63ldNsPsvK3mUJ0Lb9nAQav45cth3At/exec'; 

const limpiar = (t) => t ? t.split('@')[0].trim() : "";

async function procesarComando(msg, sock) {
    const textoOriginal = (msg.message.conversation || msg.message.extendedTextMessage?.text || "");
    const jid = msg.key.remoteJid;
    const partes = textoOriginal.split('.');

    // --- COMANDO ABRIR ---
    if (partes[0].toLowerCase() === 'abrir' && partes.length >= 4) {
        try {
            const res = (await axios.post(URL_SHEETS, {
                accion: "abrir",
                maquina: limpiar(partes[1]),
                noMq: limpiar(partes[2]),
                falla: limpiar(partes[3])
            })).data;

            // EL CAMBIO ESTÁ AQUÍ: Orden visual para el mensaje de WhatsApp
            const msj = `✅ *ORDEN GENERADA*\n\n🆔 *OS:* ${res.os}\n🛠️ *Máquina:* ${res.maquinaNom}\n🔢 *# Maq.:* ${res.maquinaNum}\n📅 *Estado:* Reg. en Bitácora`;
            await sock.sendMessage(jid, { text: msj });
        } catch (e) { console.log("Error Abrir:", e); }
    }

    // --- COMANDO CERRAR ---
    if (partes[0].toLowerCase() === 'cerrar' && partes.length >= 4) {
        try {
            const res = (await axios.post(URL_SHEETS, {
                accion: "cerrar",
                os: partes[1].trim(),
                iniciales: partes[2].trim(),
                acciones: limpiar(partes[3])
            })).data;

            if (res.res === "cerrada") {
                const msj = `🔒 *OS FINALIZADA*\n\n🆔 *OS:* ${res.os}\n👤 *Técnico:* ${res.tecnico}\n⏱️ *Tiempo Transcurrido:* ${res.tiempo}\n✅ *Estado:* Cerrada en Bitácora`;
                await sock.sendMessage(jid, { text: msj });
            }
        } catch (e) { console.log("Error Cerrar:", e); }
    }
}
module.exports = { procesarComando };

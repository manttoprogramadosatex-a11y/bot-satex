const axios = require('axios');
const URL_SHEETS = 'https://script.google.com/macros/s/AKfycbz6Iu9NwM4GwFfQhQBWtrC5jtrpEzmALlFAgsKzrifbIXP3nu2-tmfU7QqeE1e061ij/exec'; 

const limpiar = (t) => t ? t.split('@')[0].trim() : "";

async function procesarComando(msg, sock) {
    if (!sock) return; // Evita el error de "sendMessage no es función"
    
    const textoOriginal = (msg.message.conversation || msg.message.extendedTextMessage?.text || "");
    const jid = msg.key.remoteJid;
    const partes = textoOriginal.split('.');

    // --- ABRIR ---
    if (partes[0].toLowerCase() === 'abrir' && partes.length >= 4) {
        try {
            const res = (await axios.post(URL_SHEETS, {
                accion: "abrir",
                maquina: limpiar(partes[1]),
                noMq: limpiar(partes[2]),
                falla: limpiar(partes[3])
            }, { timeout: 30000 })).data;

            const msj = `✅ *OS GENERADA*\n\n🆔 *OS:* ${res.os}\n🛠️ *Máquina:* ${res.maquinaNom}\n🔢 *# Maq.:* ${res.maquinaNum}\n📅 *Estado:* Reg. en Bitácora`;
            await sock.sendMessage(jid, { text: msj });
        } catch (e) { console.log("Error Sheets:", e.message); }
    }

    // --- CERRAR ---
    if (partes[0].toLowerCase() === 'cerrar' && partes.length >= 4) {
        try {
            const res = (await axios.post(URL_SHEETS, {
                accion: "cerrar",
                os: partes[1].trim(),
                iniciales: partes[2].trim(),
                acciones: limpiar(partes[3])
            }, { timeout: 30000 })).data;

            if (res.res === "cerrada") {
                const msj = `🔒 *OS FINALIZADA*\n\n🆔 *OS:* ${res.os}\n👤 *Técnico:* ${res.tecnico}\n⏱️ *Tiempo Transcurrido:* ${res.tiempo}\n✅ *Estado:* Cerrada en Bitácora`;
                await sock.sendMessage(jid, { text: msj });
            }
        } catch (e) { console.log("Error Sheets:", e.message); }
    }
}
module.exports = { procesarComando };

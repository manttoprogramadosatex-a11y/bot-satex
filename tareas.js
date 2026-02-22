const axios = require('axios');
const URL_SHEETS = 'https://script.google.com/macros/s/AKfycbxXUwkeVl5dmZwIn-psIjqYtRBhGImYoVRR13I6sFOBOt7hCcQhNsCW9DSyUKa3HLGk/exec'; 

const corregirMayusculas = (texto) => {
    if (!texto) return "";
    let t = texto.split('@')[0].trim(); // Ignora todo después del @
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
};

async function procesarComando(msg, sock) {
    const textoOriginal = (msg.message.conversation || msg.message.extendedTextMessage?.text || "");
    const jid = msg.key.remoteJid;
    const partes = textoOriginal.split('.');

    // --- COMANDO ABRIR ---
    if (partes[0].toLowerCase() === 'abrir' && partes.length >= 4) {
        try {
            const datos = {
                accion: "abrir",
                maquina: corregirMayusculas(partes[1]),
                noMq: partes[2].trim(),
                falla: corregirMayusculas(partes[3])
            };

            const res = (await axios.post(URL_SHEETS, datos)).data;
            const msj = `✅ *ORDEN GENERADA*\n\n🆔 *OS:* ${res.os}\n🛠️ *Máquina:* ${res.maquina}\n📅 *Estado:* Reg. en Bitácora`;
            await sock.sendMessage(jid, { text: msj });
        } catch (e) { await sock.sendMessage(jid, { text: "❌ Error al abrir OS" }); }
    }

    // --- COMANDO CERRAR ---
    // Estructura: Cerrar.N-OS.Iniciales.Acciones
    if (partes[0].toLowerCase() === 'cerrar' && partes.length >= 4) {
        try {
            const datos = {
                accion: "cerrar",
                os: partes[1].trim(),
                iniciales: partes[2].trim().toLowerCase(),
                acciones: partes[3].split('@')[0].trim()
            };

            const res = (await axios.post(URL_SHEETS, datos)).data;
            if (res) {
                const msj = `🔒 *OS FINALIZADA*\n\n🆔 *OS:* ${res.os}\n👤 *Técnico:* ${res.tecnico}\n✅ *Estado:* Cerrada en Bitácora`;
                await sock.sendMessage(jid, { text: msj });
            }
        } catch (e) { await sock.sendMessage(jid, { text: "❌ Error al cerrar OS. Verifica el número." }); }
    }
}
module.exports = { procesarComando };

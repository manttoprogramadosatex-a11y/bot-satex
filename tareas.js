const axios = require('axios');
const URL_SHEETS = 'https://script.google.com/macros/s/AKfycbxcH77ZxBlkOISn5YU7Tp25Mg6SpzZhigfwcgFfBYOdDV9_RP7BOghhCQW2vFJgSXnF/exec'; 

const limpiarTexto = (texto) => {
    if (!texto) return "";
    return texto.split('@')[0].trim(); // Elimina menciones y arrobas
};

async function procesarComando(msg, sock) {
    const textoOriginal = (msg.message.conversation || msg.message.extendedTextMessage?.text || "");
    const jid = msg.key.remoteJid;
    const partes = textoOriginal.split('.');

    // ABRIR: Abrir.Maquina.No.Falla
    if (partes[0].toLowerCase() === 'abrir' && partes.length >= 4) {
        try {
            const datos = {
                accion: "abrir",
                maquina: limpiarTexto(partes[1]),
                noMq: limpiarTexto(partes[2]),
                falla: limpiarTexto(partes[3])
            };
            const res = (await axios.post(URL_SHEETS, datos)).data;
            const msj = `✅ *ORDEN GENERADA*\n\n🆔 *OS:* ${res.os}\n🛠️ *Máquina:* ${res.maquina}\n📅 *Estado:* Reg. en Bitácora`;
            await sock.sendMessage(jid, { text: msj });
        } catch (e) { console.log(e); }
    }

    // CERRAR: Cerrar.OS.Iniciales.Acciones
    if (partes[0].toLowerCase() === 'cerrar' && partes.length >= 4) {
        try {
            const datos = {
                accion: "cerrar",
                os: partes[1].trim(),
                iniciales: partes[2].trim(),
                acciones: limpiarTexto(partes[3])
            };
            const res = (await axios.post(URL_SHEETS, datos)).data;
            if (res.res === "cerrada") {
                const msj = `🔒 *OS FINALIZADA*\n\n🆔 *OS:* ${res.os}\n👤 *Técnico:* ${res.tecnico}\n✅ *Estado:* Cerrada en Bitácora`;
                await sock.sendMessage(jid, { text: msj });
            } else {
                await sock.sendMessage(jid, { text: "❌ OS #" + datos.os + " no encontrada." });
            }
        } catch (e) { console.log(e); }
    }
}
module.exports = { procesarComando };

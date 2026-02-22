const axios = require('axios');
const URL_SHEETS = 'https://script.google.com/macros/s/AKfycbyGDAQB2fgKAD7r6rPvkXoZZ_5CYd96iU6kTbX8eDk8muD4IPzsjH9H5h9c4DsiCLHC/exec'; 

const limpiar = (t) => t ? t.split('@')[0].trim() : "";

async function procesarComando(msg, sock) {
    const textoOriginal = (msg.message.conversation || msg.message.extendedTextMessage?.text || "");
    const jid = msg.key.remoteJid;
    const partes = textoOriginal.split('.');

    if (partes[0].toLowerCase() === 'abrir' && partes.length >= 4) {
        try {
            const res = (await axios.post(URL_SHEETS, {
                accion: "abrir",
                maquina: limpiar(partes[1]),
                noMq: limpiar(partes[2]),
                falla: limpiar(partes[3])
            })).data;

            const msj = `✅ *ORDEN GENERADA*\n\n🆔 *OS:* ${res.os}\n🔢 *# Maq.:* ${res.maquinaNum}\n🛠️ *Máquina:* ${res.maquinaNom}\n📅 *Estado:* Reg. en Bitácora`;
            await sock.sendMessage(jid, { text: msj });
        } catch (e) { console.log(e); }
    }

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
        } catch (e) { console.log(e); }
    }
}
module.exports = { procesarComando };

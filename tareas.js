const axios = require('axios');

const URL_SHEETS = 'https://script.google.com/macros/s/AKfycby6mkLnTT-QjshbM77oufxBCzkcfVDlhSF5xen-Z41wqpf8iJ4XO4UM0cn-gDGYwsrp/exec'; 

const corregirMayusculas = (texto) => {
    if (!texto) return "";
    return texto.trim().toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

async function procesarComando(textoOriginal, msg, sock) {
    const texto = textoOriginal.trim();
    const chatDondeResponde = msg.key.remoteJid; // El grupo
    const personaQueEscribe = msg.key.participant || msg.key.remoteJid; // El número personal

    if (texto.toLowerCase().startsWith('abrir.')) {
        const partes = texto.split('.');
        
        if (partes.length < 5) {
            const errorMsg = "❌ *Formato Incorrecto.*\n\nUsa: Abrir.Tipo de Máquina.#de Máquina.Falla o problema.#de Falla reportada.";
            await sock.sendMessage(chatDondeResponde, { text: errorMsg });
            return;
        }

        try {
            const numeroLimpio = personaQueEscribe.split('@')[0].split(':')[0];

            const datos = {
                maquina: corregirMayusculas(partes[1]),
                noMq: partes[2].trim(),
                falla: corregirMayusculas(partes[3]),
                cantidad: partes[4].trim(),
                telefono: numeroLimpio
            };

            const respuesta = await axios.post(URL_SHEETS, datos);
            const res = respuesta.data;

            const msj = `✅ *ORDEN GENERADA*\n\n🆔 *OS:* ${res.idOS}\n🛠️ *Máquina:* ${datos.maquina}\n👤 *Técnico:* ${res.nombreTecnico}\n📅 *Estado:* Registrado en Satex`;
            
            await sock.sendMessage(chatDondeResponde, { text: msj });

        } catch (e) {
            console.log("Error Sheets:", e.message);
            await sock.sendMessage(chatDondeResponde, { text: "❌ Error al conectar con Google Sheets." });
        }
    }
}
module.exports = { procesarComando };

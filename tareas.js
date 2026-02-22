const axios = require('axios');

const URL_SHEETS = 'https://script.google.com/macros/s/AKfycbxSSG01O7hNG24HmzYZbJAOqbxnkh_Y63qW6ZAJnP6RXs_wtn3bOY5wgLaPSCQGX8Xr/exec'; 

const corregirMayusculas = (texto) => {
    if (!texto) return "";
    return texto.trim().toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

async function procesarComando(msg, sock) {
    const textoOriginal = (msg.message.conversation || msg.message.extendedTextMessage?.text || "");
    const texto = textoOriginal.trim();
    
    // El 'JID' es la dirección del chat (puede ser un grupo o un chat privado)
    const jidDestino = msg.key.remoteJid;
    // El 'Participante' es la persona real que escribió (en grupos)
    const autorMensaje = msg.key.participant || msg.key.remoteJid;

    if (texto.toLowerCase().startsWith('abrir.')) {
        const partes = texto.split('.');
        
        if (partes.length < 5) {
            const errorMsg = "❌ *Formato Incorrecto.*\n\nUsa: Abrir.Tipo de Máquina.#de Máquina.Falla o problema.#de Falla reportada.";
            await sock.sendMessage(jidDestino, { text: errorMsg });
            return;
        }

        try {
            // Extraemos solo los números del teléfono del autor
            const numeroLimpio = autorMensaje.split('@')[0].split(':')[0];

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
            
            // Enviamos la respuesta al mismo chat de origen
            await sock.sendMessage(jidDestino, { text: msj });

        } catch (e) {
            console.log("Error en Sheets:", e.message);
            await sock.sendMessage(jidDestino, { text: "❌ Error de conexión con Satex Sheets." });
        }
    }
}
module.exports = { procesarComando };

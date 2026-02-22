const axios = require('axios');

const URL_SHEETS = 'https://script.google.com/macros/s/AKfycbz5ltePeHrqX0-znZcyWHFCfEtOo25ejlC72H5RUUQb_fTOnJS2Ylogul1r3B1bqVoB/exec'; 

const corregirMayusculas = (texto) => {
    if (!texto) return "";
    return texto.trim().toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

async function procesarComando(textoOriginal, jid, sock) {
    const texto = textoOriginal.trim();
    
    if (texto.toLowerCase().startsWith('abrir.')) {
        const partes = texto.split('.');
        
        if (partes.length < 5) {
            const errorMsg = "❌ *Formato Incorrecto.*\n\nUsa: Abrir.Tipo de Máquina.#de Máquina.Falla o problema.#de Falla reportada.";
            await sock.sendMessage(jid, { text: errorMsg });
            return;
        }

        try {
            // Limpiamos el número de teléfono
            const numeroLimpio = jid.split('@')[0].split(':')[0];

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
            
            await sock.sendMessage(jid, { text: msj });

        } catch (e) {
            await sock.sendMessage(jid, { text: "❌ Error al conectar con Google Sheets." });
        }
    }
}
module.exports = { procesarComando };

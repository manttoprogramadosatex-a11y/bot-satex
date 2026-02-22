const axios = require('axios');

// URL DE TU GOOGLE SCRIPT
const URL_SHEETS = 'https://script.google.com/macros/s/AKfycbyyKVmDdCAuyyDH1GKpZGmwvg0QVm2bPoQa2wEo_BG7I10wgJT-0k82X9seGE_0FuOO/exec'; 

// Función auxiliar para poner la primera letra en mayúscula
const capitalizar = (texto) => {
    if (!texto) return "";
    return texto.trim().charAt(0).toUpperCase() + texto.trim().slice(1).toLowerCase();
};

async function procesarComando(textoOriginal, jid, sock) {
    // Quitamos espacios y pasamos a minúsculas solo para validar el inicio
    const texto = textoOriginal.trim();
    
    if (texto.toLowerCase().startsWith('abrir.')) {
        const partes = texto.split('.');
        
        if (partes.length < 5) {
            await sock.sendMessage(jid, { text: "⚠️ *Formato incorrecto*\nUsa: abrir.maquina.noMq.falla.cantidad" });
            return;
        }

        // Procesamos los datos con la primera letra en mayúscula
        const datosProcesados = {
            maquina: capitalizar(partes[1]), // Ejemplo: "prensa" -> "Prensa"
            noMq: partes[2].trim(),
            falla: capitalizar(partes[3]),   // Ejemplo: "electrica" -> "Electrica"
            cantidad: partes[4].trim(),
            telefono: jid.split('@')[0]
        };

        try {
            console.log(`📡 Enviando a Sheets:`, datosProcesados);
            
            const respuesta = await axios.post(URL_SHEETS, datosProcesados);
            const res = respuesta.data;

            const mensajeFinal = `✅ *ORDEN GENERADA*\n\n🆔 *OS:* ${res.idOS}\n🛠️ *Máquina:* ${datosProcesados.maquina}\n👤 *Técnico:* ${res.nombreTecnico}\n📅 *Estado:* Registrado en Satex`;
            
            await sock.sendMessage(jid, { text: mensajeFinal });

        } catch (error) {
            console.error("❌ Error Sheets:", error.message);
            await sock.sendMessage(jid, { text: "❌ *Error de conexión*\nNo se pudo guardar en Google Sheets." });
        }
    }
}
module.exports = { procesarComando };

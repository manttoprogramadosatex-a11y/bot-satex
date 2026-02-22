const axios = require('axios');

// URL DE TU GOOGLE SCRIPT
const URL_SHEETS = 'https://script.google.com/macros/s/AKfycbzC8XcfioEeM6KRyCxg7KEdnkzvCV0E8AdnL8Zcntjy1LEIkKY9MHT_eJWfbQvXGhOf/exec'; 

// Función para que la primera letra siempre sea Mayúscula
const capitalizar = (texto) => {
    if (!texto) return "";
    let t = texto.trim();
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
};

async function procesarComando(textoOriginal, jid, sock) {
    const texto = textoOriginal.trim();
    
    // Validamos 'abrir.' sin importar si el usuario escribió 'Abrir.' o 'abrir.'
    if (texto.toLowerCase().startsWith('abrir.')) {
        const partes = texto.split('.');
        
        // Si no tiene los 5 elementos (4 puntos), mandamos tu mensaje personalizado
        if (partes.length < 5) {
            const errorMsg = "❌ *Formato Incorrecto.*\n\nUsa: Abrir.Tipo de Máquina.#de Máquina.Falla o problema.#de Falla reportada.";
            await sock.sendMessage(jid, { text: errorMsg });
            return;
        }

        try {
            // Procesamos los datos para que lleguen limpios a Excel
            const datosParaEnviar = {
                maquina: capitalizar(partes[1]),
                noMq: partes[2].trim(),
                falla: capitalizar(partes[3]),
                cantidad: partes[4].trim(),
                telefono: jid.split('@')[0]
            };

            console.log(`📡 Enviando a Satex Sheets:`, datosParaEnviar);
            
            const respuesta = await axios.post(URL_SHEETS, datosParaEnviar);
            const res = respuesta.data;

            const mensajeExito = `✅ *ORDEN GENERADA*\n\n🆔 *OS:* ${res.idOS}\n🛠️ *Máquina:* ${datosParaEnviar.maquina}\n👤 *Técnico:* ${res.nombreTecnico}\n📅 *Estado:* Registrado en Satex`;
            
            await sock.sendMessage(jid, { text: mensajeExito });

        } catch (error) {
            console.error("❌ Error en conexión:", error.message);
            await sock.sendMessage(jid, { text: "❌ *Error de sistema*\nNo se pudo conectar con la base de datos de Satex." });
        }
    }
}
module.exports = { procesarComando };

const axios = require('axios');

// REEMPLAZA ESTA URL POR LA DE TU GOOGLE SCRIPT ACTUALIZADO
const URL_SHEETS = 'https://script.google.com/macros/s/AKfycbyyKVmDdCAuyyDH1GKpZGmwvg0QVm2bPoQa2wEo_BG7I10wgJT-0k82X9seGE_0FuOO/exec'; 

async function procesarComando(textoOriginal, jid, sock) {
    const texto = textoOriginal.trim();
    
    if (texto.toLowerCase().startsWith('abrir.')) {
        const partes = texto.split('.');
        
        if (partes.length < 5) {
            await sock.sendMessage(jid, { text: "⚠️ *Formato incorrecto*\nUsa: abrir.maquina.noMq.falla.cantidad" });
            return;
        }

        try {
            console.log(`📡 Enviando datos a Google: ${texto}`);
            const respuesta = await axios.post(URL_SHEETS, {
                maquina: partes[1],
                noMq: partes[2],
                falla: partes[3],
                cantidad: partes[4],
                telefono: jid.split('@')[0]
            });

            const res = respuesta.data;
            const mensajeFinal = `✅ *ORDEN GENERADA*\n\n🆔 *OS:* ${res.idOS}\n🛠️ *Máquina:* ${partes[1]}\n👤 *Técnico:* ${res.nombreTecnico}\n📅 *Estado:* Registrado en Satex`;
            
            await sock.sendMessage(jid, { text: mensajeFinal });

        } catch (error) {
            console.error("❌ Error Sheets:", error.message);
            await sock.sendMessage(jid, { text: "❌ *Error de conexión*\nNo se pudo guardar en Google Sheets. Revisa el Script." });
        }
    }
}
module.exports = { procesarComando };

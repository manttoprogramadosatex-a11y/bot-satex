const axios = require('axios');

// URL DE TU GOOGLE APPS SCRIPT
const URL_SHEETS = 'https://script.google.com/macros/s/AKfycbyyKVmDdCAuyyDH1GKpZGmwvg0QVm2bPoQa2wEo_BG7I10wgJT-0k82X9seGE_0FuOO/exec'; 

async function procesarComando(textoOriginal, jid, sock) {
    console.log(`📩 Mensaje recibido de ${jid}: ${textoOriginal}`); // ESTO APARECERÁ EN RENDER

    if (textoOriginal.toLowerCase().startsWith('abrir.')) {
        const partes = textoOriginal.split('.');
        if (partes.length < 5) {
            await sock.sendMessage(jid, { text: "❌ Formato incorrecto. Usa: abrir.maquina.noMq.falla.cantidad" });
            return;
        }

        try {
            const respuesta = await axios.post(URL_SHEETS, {
                maquina: partes[1].trim(),
                noMq: partes[2].trim(),
                falla: partes[3].trim(),
                cantidad: partes[4].trim(),
                telefono: jid.split('@')[0]
            });

            const res = respuesta.data;
            const mensaje = `🛠️ *OS GENERADA:* ${res.idOS}\n📌 *Máquina:* ${partes[1]}\n👤 *Asignado:* ${res.nombreTecnico}\n✅ Reporte guardado con éxito.`;
            
            await sock.sendMessage(jid, { text: mensaje });
        } catch (e) { 
            console.log("Error en Sheets:", e.message);
            await sock.sendMessage(jid, { text: "⚠️ Error al conectar con Google Sheets." });
        }
    }
}
module.exports = { procesarComando };

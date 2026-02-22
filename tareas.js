const axios = require('axios');

const URL_SHEETS = 'https://script.google.com/macros/s/AKfycbwdIxH6CYrphy6N9pSeon9HsN6qs3VgNK1mAuyPaCvbKQdUovBjK6KTqHLMav2yp5W6/exec'; 

async function procesarComando(textoOriginal, jid, sock) {
    if (textoOriginal.toLowerCase().startsWith('abrir.')) {
        const partes = textoOriginal.split('.');
        if (partes.length < 5) return;

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
        } catch (e) { console.log("Error Sheets:", e.message); }
    }
}
module.exports = { procesarComando };

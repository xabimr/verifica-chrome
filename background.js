// Crear el menú contextual cuando se instala la extensión
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "verificar-con-todas-las-ias",
    title: "Fact-check con IA y perspectiva de género",
    contexts: ["selection"]
  });
});

// URLs base para cada IA
const urlsIAs = {
  chatgpt: "https://chat.openai.com",
  grok: "https://x.com/i/grok",
  mistral: "https://chat.mistral.ai/chat"
};

// Función para construir URLs con el prompt
function construirURL(baseUrl, prompt, texto) {
  const consulta = `${prompt}: ${texto}`;

  switch (baseUrl) {
    case urlsIAs.grok:
      return `${baseUrl}?text=${encodeURIComponent(consulta)}`;
    case urlsIAs.chatgpt:
      return `${baseUrl}/?q=${encodeURIComponent(consulta)}`;
    case urlsIAs.claude:
      // Intentar con parámetro message para Claude
      return `${baseUrl}?message=${encodeURIComponent(consulta)}`;
    case urlsIAs.mistral:
      return `${baseUrl}?q=${encodeURIComponent(consulta)}`;
    case urlsIAs.deepseek:
      // Intentar con parámetro prompt para DeepSeek
      return `${baseUrl}?prompt=${encodeURIComponent(consulta)}`;
    case urlsIAs.gemini:
      // Gemini no acepta parámetros URL, se abre directamente
      return baseUrl;
    default:
      return baseUrl;
  }
}

// Función para copiar texto al portapapeles
async function copiarAlPortapapeles(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch (err) {
    console.error('Error al copiar al portapapeles:', err);
    return false;
  }
}



// Manejar el clic en el menú contextual
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "verificar-con-todas-las-ias" && info.selectionText) {
    const textoSeleccionado = info.selectionText;
    const prompt = `Eres una/un verificador(a) de hechos profesional. Verifica con rigor periodístico las afirmaciones del siguiente texto buscando fuentes primarias y secundarias reputadas.

CONFIGURACIÓN DE IDIOMA Y ESTILO:
1) Detecta el idioma del texto a verificar y redacta TODO el resultado en ese idioma
2) Usa lenguaje inclusivo y no sexista conforme al idioma detectado
3) Respeta pronombres y nombres autoidentificados si aparecen en fuentes fiables

INSTRUCCIONES:
1) BÚSQUEDA: Prioriza documentos oficiales, organismos públicos, prensa de referencia, bases académicas, informes técnicos, y especialmente plataformas de verificación como Maldita.es, Newtral, Chequeado, PolitiFact o miembros de la International Fact-Checking Network
2) COMPROBACIÓN: Extrae datos clave (cifras, nombres, cargos, fechas) y compáralos entre fuentes independientes
3) SESGOS Y PERSPECTIVA DE GÉNERO: Revisa posibles sesgos, énfasis en vida personal vs. logros, lenguaje estereotipado, ausencia de fuentes diversas
4) VEREDICTO: Etiqueta cada afirmación como Verdadero/Mayoritariamente verdadero/Mixto/Engañoso/Falso/No verificable

FORMATO DE SALIDA:
- Resumen ejecutivo (máx. 5 líneas)
- Hallazgos por afirmación con veredicto y evidencia
- Limitaciones y dudas abiertas
- Fuentes: Medio — Titular — URL — Fecha publicación — Fecha acceso

Texto a verificar`;
    const consultaCompleta = `${prompt}: ${textoSeleccionado}`;

    // Copiar la consulta completa al portapapeles como respaldo
    await copiarAlPortapapeles(consultaCompleta);

    // Mostrar notificación
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOCIgZmlsbD0iIzQyODVmNCIvPgo8cGF0aCBkPSJNMjAgMzJMMTIgMjRMMTQuNCAyMS42TDIwIDI3LjJMMzMuNiAxMy42TDM2IDEyTDIwIDMyWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
      title: 'Abriendo 3 IAs',
      message: 'ChatGPT, Grok y Mistral - Verificación con perspectiva de género.'
    });

    // Ordenar las IAs alfabéticamente y abrir cada una en una nueva pestaña
    const iasOrdenadas = Object.entries(urlsIAs).sort(([a], [b]) => a.localeCompare(b));

    iasOrdenadas.forEach(([nombre, baseUrl], index) => {
      setTimeout(async () => {
        const url = construirURL(baseUrl, prompt, textoSeleccionado);
        const nuevaTab = await chrome.tabs.create({
          url: url,
          active: index === 0 // Solo la primera pestaña será activa
        });
      }, index * 300); // 300ms de delay entre cada pestaña
    });
  }
});
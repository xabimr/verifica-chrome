// Crear el menú contextual cuando se instala la extensión
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "verificar-con-todas-las-ias",
    title: "Verificar con todas las IAs",
    contexts: ["selection"]
  });
});

// URLs base para cada IA
const urlsIAs = {
  grok: "https://x.com/i/grok",
  chatgpt: "https://chat.openai.com",
  claude: "https://claude.ai/chat",
  mistral: "https://chat.mistral.ai/chat",
  deepseek: "https://chat.deepseek.com",
  gemini: "https://gemini.google.com/app"
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

// Función para inyectar texto en páginas específicas
async function inyectarTextoEnPagina(tabId, consulta, sitio) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (texto, sitio) => {
        setTimeout(() => {
          let selector = '';
          let botonEnviar = '';

          switch (sitio) {
            case 'claude':
              selector = 'div[contenteditable="true"]';
              botonEnviar = 'button[aria-label="Send Message"], button:has(svg)';
              break;
            case 'deepseek':
              selector = 'textarea, div[contenteditable="true"]';
              botonEnviar = 'button[type="submit"], button:has(svg)';
              break;
            case 'gemini':
              selector = 'textarea[placeholder*="Enter a prompt"], div[contenteditable="true"], textarea[aria-label*="prompt"], .ql-editor, [data-testid="textbox"]';
              botonEnviar = 'button[aria-label="Send message"], button[data-testid="send-button"], button:has(svg[data-testid="send-icon"])';
              break;
          }

          const elemento = document.querySelector(selector);
          if (elemento) {
            // Llenar el campo de texto
            if (elemento.tagName === 'TEXTAREA') {
              elemento.value = texto;
              elemento.dispatchEvent(new Event('input', { bubbles: true }));
              elemento.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
              elemento.textContent = texto;
              elemento.dispatchEvent(new Event('input', { bubbles: true }));
              elemento.dispatchEvent(new Event('change', { bubbles: true }));
            }
            elemento.focus();

            // Para Gemini, intentar enviar automáticamente
            if (sitio === 'gemini') {
              setTimeout(() => {
                // Buscar el botón de enviar con múltiples selectores
                const selectoresBoton = [
                  'button[aria-label="Send message"]',
                  'button[data-testid="send-button"]',
                  'button:has(svg[data-testid="send-icon"])',
                  'button[type="submit"]',
                  'button:has(svg)',
                  '[role="button"]:has(svg)',
                  'button[aria-label*="Send"]'
                ];

                let boton = null;
                for (const sel of selectoresBoton) {
                  boton = document.querySelector(sel);
                  if (boton && !boton.disabled) break;
                }

                if (boton && !boton.disabled) {
                  boton.click();
                } else {
                  // Como último recurso, simular Enter
                  elemento.dispatchEvent(new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true
                  }));
                }
              }, 1000); // Esperar 1 segundo después de llenar el texto
            }
          }
        }, 2000); // Esperar 2 segundos para que cargue la página
      },
      args: [consulta, sitio]
    });
  } catch (error) {
    console.log(`No se pudo inyectar texto en ${sitio}:`, error);
  }
}

// Manejar el clic en el menú contextual
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "verificar-con-todas-las-ias" && info.selectionText) {
    const textoSeleccionado = info.selectionText;
    const prompt = "Por favor, verifica la información que aparece a continuación";
    const consultaCompleta = `${prompt}: ${textoSeleccionado}`;

    // Copiar la consulta completa al portapapeles como respaldo
    await copiarAlPortapapeles(consultaCompleta);

    // Mostrar notificación
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOCIgZmlsbD0iIzQyODVmNCIvPgo8cGF0aCBkPSJNMjAgMzJMMTIgMjRMMTQuNCAyMS42TDIwIDI3LjJMMzMuNiAxMy42TDM2IDEyTDIwIDMyWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
      title: 'Abriendo 6 IAs',
      message: 'Se intentará llenar automáticamente el texto en todas las plataformas.'
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

        // Para sitios que necesitan inyección de script
        if (['claude', 'deepseek', 'gemini'].includes(nombre)) {
          setTimeout(() => {
            inyectarTextoEnPagina(nuevaTab.id, consultaCompleta, nombre);
          }, 3000); // Esperar 3 segundos para que cargue completamente
        }
      }, index * 300); // 300ms de delay entre cada pestaña
    });
  }
});
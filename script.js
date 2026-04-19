(() => {
  const testoInput      = document.getElementById('testo-input');

  const fontSelezionato = document.getElementById('font-selezionato');
  const grassettoToggle = document.getElementById('grassetto-toggle');
  const dimensioneFont  = document.getElementById('dimensione-font');
  const coloreFont      = document.getElementById('colore-font');
  const pulisciBtn      = document.getElementById('pulisci-button');
  const annullaBtn      = document.getElementById('annulla-button');
  const scaricaBtn      = document.getElementById('scarica-button');

  const fontMinus       = document.getElementById('font-minus');
  const fontPlus        = document.getElementById('font-plus');
  const menuDimensioni  = document.getElementById('menu-dimensioni');
  const opzioniDimensione = document.querySelectorAll('.opzione-dimensione');

  const riquadroVerde   = document.getElementById('contenuto-verde');
  const righeEditorInp  = document.getElementById('righe-editor');

  // DETTATURA DISABILITATA TEMPORANEAMENTE
/*
const dettaturaBtn    = document.getElementById('dettatura-button');
const linguaSelect    = document.getElementById('lingua-dettatura');
*/

  // blocco memoria
  const memoriaCont     = document.getElementById('memoria-contenuto');
  const bloccoMemoria   = document.getElementById('blocco-memoria');

  let storicoUndo       = [];
  let indiceUndo        = -1;
  let inUndo            = false;

  let archivioCompleto  = [];   // per download completo
  let memoriaLog        = [];   // per blocco memoria visibile
  let ultimoTestoValido = "";

  let riconoscimento    = null;
  let dettaturaAttiva   = false;

  // per non far scattare il controllo righe quando aggiungo io il newline con Shift+Invio
  let saltoControlloRighe = false;


  /* ---------------- UTILITY ---------------- */

  function portaCaretAllaFine() {
    const range = document.createRange();
    const sel   = window.getSelection();
    range.selectNodeContents(testoInput);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function aggiornaUltimoTestoValido() {
    ultimoTestoValido = testoInput.innerText;
  }

  function maxRigheEditor() {
    const n = parseInt(righeEditorInp.value, 10);
    return Number.isNaN(n) || n < 1 ? 1 : n;
  }

  // righe logiche (quante "\n")
  function calcolaRigheLogiche() {
    const txt = testoInput.innerText;
    return txt ? txt.split("\n").length : 1;
  }

  // righe visive (wrap automatico)
  function calcolaRigheVisive() {
    const st = getComputedStyle(testoInput);
    let lh = parseFloat(st.lineHeight);
    if (isNaN(lh)) {
      const fs = parseFloat(st.fontSize) || 16;
      lh = fs * 1.3;
    }
    return Math.round(testoInput.scrollHeight / lh) || 1;
  }

  function calcolaRigheTotali() {
    return Math.max(calcolaRigheLogiche(), calcolaRigheVisive());
  }

  // sincronizza stile viewer + memoria con l'editor
  function sincronizzaStili() {
    const st = getComputedStyle(testoInput);

    [riquadroVerde, memoriaCont].forEach(el => {
      if (!el) return;
      el.style.fontFamily = st.fontFamily;
      el.style.fontSize   = st.fontSize;
      el.style.color      = st.color;
      el.style.fontWeight = st.fontWeight;
      el.style.lineHeight = st.lineHeight;
    });
  }

  function applicaDimensioneFont(valore) {
    let n = parseInt(valore, 10);
    if (Number.isNaN(n)) {
      n = parseInt(dimensioneFont.value, 10);
    }
    if (Number.isNaN(n)) n = 28;

    if (n < 8) n = 8;
    if (n > 200) n = 200;

    dimensioneFont.value = n;
    testoInput.style.fontSize = n + "px";
    sincronizzaStili();
  }

  function apriMenuDimensioni() {
    menuDimensioni.classList.remove('nascosto');
  }

  function chiudiMenuDimensioni() {
    menuDimensioni.classList.add('nascosto');
  }

  /* ----------- RENDER BLOCCO MEMORIA CON COPIA ----------- */
  function aggiornaMemoria() {
    memoriaCont.innerHTML = "";

    memoriaLog.forEach((riga) => {
      const wrapper = document.createElement("div");
      wrapper.classList.add("memoria-riga");

      const testoSpan = document.createElement("span");
      testoSpan.classList.add("memoria-testo");
      testoSpan.textContent = riga;

      const btn = document.createElement("button");
      btn.classList.add("bottone-copia");
      btn.textContent = "Copia";

      btn.addEventListener("click", () => {
        navigator.clipboard.writeText(riga);
      });

      wrapper.appendChild(testoSpan);
      wrapper.appendChild(btn);
      memoriaCont.appendChild(wrapper);
    });

    bloccoMemoria.scrollTop = bloccoMemoria.scrollHeight;
  }


  /* ---------------- UNDO ---------------- */

  function aggiungiUndo() {
    if (inUndo) return;
    const t = testoInput.innerHTML;
    if (storicoUndo.length && storicoUndo[storicoUndo.length - 1] === t) return;

    storicoUndo.push(t);
    if (storicoUndo.length > 50) storicoUndo.shift();

    indiceUndo = storicoUndo.length - 1;
    annullaBtn.disabled = indiceUndo <= 0;
  }

  function annulla() {
    if (indiceUndo <= 0) return;

    inUndo = true;
    indiceUndo--;
    testoInput.innerHTML = storicoUndo[indiceUndo];
    inUndo = false;

    portaCaretAllaFine();
    aggiornaUltimoTestoValido();
    annullaBtn.disabled = indiceUndo <= 0;
    sincronizzaStili();
  }


  /* ---------------- INPUT (controllo righe) ---------------- */

  testoInput.addEventListener("input", () => {
    const limite = maxRigheEditor();
    const righeTot = calcolaRigheTotali();

    if (righeTot > limite) {
      testoInput.innerText = ultimoTestoValido;
      portaCaretAllaFine();
      return;
    }

    aggiornaUltimoTestoValido();
    aggiungiUndo();
  });


  /* ---------------- KEYDOWN ---------------- */

  testoInput.addEventListener("keydown", e => {
    ultimoTestoValido = testoInput.innerText;
    const limite = maxRigheEditor();

    // CTRL/CMD + Z
    if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      annulla();
      return;
    }

    // SHIFT + ENTER → nuova riga logica, ma solo se non supera il limite
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();

      const testoPrima = testoInput.innerText;
      const testoDopo  = testoPrima + "\n";

      // simulazione per calcolare le righe totali dopo
      const backup = testoInput.innerText;
      testoInput.innerText = testoDopo;
      const righeTotDopo = calcolaRigheTotali();
      testoInput.innerText = backup;
      portaCaretAllaFine();

      if (righeTotDopo > limite) {
        return;
      }

      saltoControlloRighe = true;
      document.execCommand("insertLineBreak");
      return;
    }

    // ENTER normale → invio a MEMORIA + VIEWER
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      const testoRaw = testoInput.innerText;
      const testo = testoRaw.trim();

      if (testo.length > 0) {
        archivioCompleto.push(testo);
        memoriaLog.push(testo);
        aggiornaMemoria();
        riquadroVerde.innerText = testo;
      } else {
        riquadroVerde.innerText = "";
        archivioCompleto.push("");
      }

      testoInput.innerHTML = "";
      portaCaretAllaFine();
      aggiornaUltimoTestoValido();
      aggiungiUndo();
      sincronizzaStili();
      return;
    }
  });


  /* ---------------- STILI (font / size / color / bold) ---------------- */

  fontSelezionato.addEventListener("change", () => {
    testoInput.style.fontFamily = fontSelezionato.value;
    sincronizzaStili();
    aggiungiUndo();
  });

  dimensioneFont.addEventListener("focus", apriMenuDimensioni);
  dimensioneFont.addEventListener("click", apriMenuDimensioni);

  dimensioneFont.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applicaDimensioneFont(dimensioneFont.value);
      chiudiMenuDimensioni();
    } else if (e.key === "Escape") {
      chiudiMenuDimensioni();
    }
  });

  dimensioneFont.addEventListener("blur", () => {
    setTimeout(() => {
      applicaDimensioneFont(dimensioneFont.value);
      chiudiMenuDimensioni();
    }, 120);
  });

  fontMinus.addEventListener("click", () => {
    const corrente = parseInt(dimensioneFont.value, 10) || 28;
    applicaDimensioneFont(corrente - 1);
  });

  fontPlus.addEventListener("click", () => {
    const corrente = parseInt(dimensioneFont.value, 10) || 28;
    applicaDimensioneFont(corrente + 1);
  });

  opzioniDimensione.forEach(btn => {
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      applicaDimensioneFont(btn.textContent.trim());
      chiudiMenuDimensioni();
    });
  });

  document.addEventListener("click", (e) => {
    const controllo = document.getElementById("controllo-dimensione");
    if (!controllo.contains(e.target)) {
      chiudiMenuDimensioni();
    }
  });

  coloreFont.addEventListener("input", () => {
    testoInput.style.color = coloreFont.value;
    sincronizzaStili();
  });

  grassettoToggle.addEventListener("click", () => {
    const att = grassettoToggle.classList.toggle("attivo");
    const peso = att ? "bold" : "normal";

    testoInput.style.fontWeight = peso;
    riquadroVerde.style.fontWeight = peso;
    memoriaCont.style.fontWeight = peso;

    aggiungiUndo();
  });


  /* ---------------- DOWNLOAD ---------------- */

  scaricaBtn.addEventListener("click", () => {
    const oggi = new Date();
    const yyyy = oggi.getFullYear();
    const mm   = String(oggi.getMonth() + 1).padStart(2, "0");
    const dd   = String(oggi.getDate()).padStart(2, "0");

    const nomeFile = `traduzione-${yyyy}-${mm}-${dd}.txt`;

    const full = memoriaLog.join("\n");
    const blob = new Blob([full], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nomeFile;
    a.click();
  });


  /* ---------------- DETTATURA ---------------- */

  /* ---------------- DETTATURA DISABILITATA ---------------- */
/*

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  riconoscimento = new SpeechRecognition();
  riconoscimento.continuous = true;
  riconoscimento.interimResults = false;
  riconoscimento.lang = linguaSelect.value;

  linguaSelect.addEventListener("change", () => {
    riconoscimento.lang = linguaSelect.value;
    if (dettaturaAttiva) {
      riconoscimento.stop();
      setTimeout(() => riconoscimento.start(), 200);
    }
  });

  riconoscimento.onresult = event => {
    const limite = maxRigheEditor();

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      if (!res.isFinal) continue;

      const aggiunta = res[0].transcript + " ";
      const prima = testoInput.innerText;

      testoInput.innerText = prima + aggiunta;

      const righeTot = calcolaRigheTotali();
      if (righeTot > limite) {
        testoInput.innerText = prima;
        portaCaretAllaFine();
        continue;
      }

      portaCaretAllaFine();
      aggiornaUltimoTestoValido();
      aggiungiUndo();
    }
  };

  riconoscimento.onend = () => {
    if (dettaturaAttiva) riconoscimento.start();
  };

} else {
  dettaturaBtn.disabled = true;
  dettaturaBtn.title = "Dettatura non supportata.";
}

dettaturaBtn.addEventListener("click", () => {
  if (!riconoscimento) return;
  dettaturaAttiva = !dettaturaAttiva;
  dettaturaBtn.classList.toggle("attivo", dettaturaAttiva);
  if (dettaturaAttiva) riconoscimento.start();
  else riconoscimento.stop();
});

*/

  /* ---------------- INIT ---------------- */

  // grassetto attivo di default OVUNQUE
  grassettoToggle.classList.add("attivo");
  testoInput.style.fontWeight = "bold";
  riquadroVerde.style.fontWeight = "bold";
  memoriaCont.style.fontWeight = "bold";

  aggiornaUltimoTestoValido();
  aggiungiUndo();
  sincronizzaStili();
  applicaDimensioneFont(dimensioneFont.value);
})();
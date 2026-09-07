(function () {
  const { genres, levels, passages } = window.OUTLOUD;

  const state = {
    view: "list",
    genre: "all",
    level: "all",
    currentId: null,
    sentenceMode: false,
    sentenceIndex: 0,
    sentences: [],
  };

  const els = {
    views: {
      list: document.getElementById("view-list"),
      read: document.getElementById("view-read"),
    },
    genreFilters: document.getElementById("genre-filters"),
    passageList: document.getElementById("passage-list"),
    resultCount: document.getElementById("result-count"),
    readGenre: document.getElementById("read-genre"),
    readLevel: document.getElementById("read-level"),
    readTitle: document.getElementById("read-title"),
    readStats: document.getElementById("read-stats"),
    readBody: document.getElementById("read-body"),
    fontSize: document.getElementById("font-size"),
    btnSentence: document.getElementById("btn-sentence"),
    btnPrev: document.getElementById("btn-prev-sentence"),
    btnNext: document.getElementById("btn-next-sentence"),
  };

  function genreById(id) {
    return genres.find((g) => g.id === id);
  }

  function countChars(text) {
    return text.replace(/\s/g, "").length;
  }

  function splitSentences(text) {
    const chunks = [];
    text
      .trim()
      .split(/\n+/)
      .forEach((para) => {
        const parts = para.match(/[^。\.!\?？\n]+[。\.!\?？]?/g) || [para];
        parts.forEach((part) => {
          const trimmed = part.trim();
          if (trimmed) chunks.push(trimmed);
        });
      });
    return chunks;
  }

  function estimateMinutes(chars) {
    return Math.max(1, Math.round(chars / 220));
  }

  function filteredPassages() {
    return passages.filter((p) => {
      const genreOk = state.genre === "all" || p.genre === state.genre;
      const levelOk = state.level === "all" || p.level === state.level;
      return genreOk && levelOk;
    });
  }

  function setView(view) {
    state.view = view;
    Object.entries(els.views).forEach(([key, node]) => {
      const show = key === view;
      node.hidden = !show;
      node.classList.toggle("is-visible", show);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderFilterChips() {
    genres.forEach((g) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.dataset.genre = g.id;
      btn.textContent = `${g.emoji} ${g.label}`;
      els.genreFilters.appendChild(btn);
    });
  }

  function syncChips() {
    document.querySelectorAll("[data-genre]").forEach((chip) => {
      chip.classList.toggle("is-active", chip.dataset.genre === state.genre);
    });
    document.querySelectorAll("[data-level]").forEach((chip) => {
      chip.classList.toggle("is-active", chip.dataset.level === state.level);
    });
  }

  function renderList() {
    const list = filteredPassages();
    els.resultCount.textContent = `${list.length}편 · 눌러서 바로 읽기`;

    if (!list.length) {
      els.passageList.innerHTML =
        '<div class="empty-state">조건에 맞는 지문이 없어요.</div>';
      return;
    }

    els.passageList.innerHTML = list
      .map((p) => {
        const g = genreById(p.genre);
        const preview = p.text.replace(/\s+/g, " ").slice(0, 80) + "…";
        const chars = countChars(p.text);
        return `
        <button type="button" class="passage-item" data-open="${p.id}">
          <div class="passage-item-top">
            <span class="tag">${g.emoji} ${g.label}</span>
            <span class="tag tag-level">${levels[p.level]}</span>
          </div>
          <h2>${p.title}</h2>
          <p>${preview}</p>
          <div class="meta">${chars}자 · 약 ${estimateMinutes(chars)}분</div>
        </button>`;
      })
      .join("");
  }

  function renderPassage(passage) {
    state.currentId = passage.id;
    state.sentenceMode = false;
    state.sentenceIndex = 0;
    state.sentences = splitSentences(passage.text);

    const g = genreById(passage.genre);
    const chars = countChars(passage.text);

    els.readGenre.textContent = `${g.emoji} ${g.label}`;
    els.readLevel.textContent = levels[passage.level];
    els.readTitle.textContent = passage.title;
    els.readStats.textContent = `${chars}자 · ${state.sentences.length}문장 · 약 ${estimateMinutes(chars)}분`;

    const paragraphs = passage.text.trim().split(/\n+/);
    let sentenceCursor = 0;

    els.readBody.classList.remove("sentence-mode");
    els.readBody.innerHTML = paragraphs
      .map((para) => {
        const parts = para.match(/[^。\.!\?？\n]+[。\.!\?？]?/g) || [para];
        const html = parts
          .map((part) => {
            const trimmed = part.trim();
            if (!trimmed) return "";
            const idx = sentenceCursor++;
            return `<span class="sentence" data-s="${idx}">${trimmed}</span> `;
          })
          .join("");
        return `<p>${html}</p>`;
      })
      .join("");

    els.btnSentence.setAttribute("aria-pressed", "false");
    els.btnPrev.disabled = true;
    els.btnNext.disabled = true;
    setView("read");
  }

  function openById(id) {
    const passage = passages.find((p) => p.id === id);
    if (passage) renderPassage(passage);
  }

  function openSurprise(preferGenre) {
    let pool = passages;
    if (preferGenre && preferGenre !== "all") {
      pool = passages.filter((p) => p.genre === preferGenre);
    }
    if (!pool.length) pool = passages;

    let pick = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && pick.id === state.currentId) {
      pick = pool[(pool.indexOf(pick) + 1) % pool.length];
    }
    renderPassage(pick);
  }

  function updateSentenceHighlight() {
    els.readBody.querySelectorAll(".sentence").forEach((node, i) => {
      node.classList.toggle("is-active", i === state.sentenceIndex);
    });
    const active = els.readBody.querySelector(".sentence.is-active");
    if (active) active.scrollIntoView({ behavior: "smooth", block: "center" });
    els.btnPrev.disabled = state.sentenceIndex <= 0;
    els.btnNext.disabled = state.sentenceIndex >= state.sentences.length - 1;
  }

  function toggleSentenceMode(on) {
    state.sentenceMode = on;
    els.readBody.classList.toggle("sentence-mode", on);
    els.btnSentence.setAttribute("aria-pressed", String(on));
    if (on) {
      state.sentenceIndex = 0;
      updateSentenceHighlight();
    } else {
      els.readBody.querySelectorAll(".sentence").forEach((n) => n.classList.remove("is-active"));
      els.btnPrev.disabled = true;
      els.btnNext.disabled = true;
    }
  }

  document.addEventListener("click", (e) => {
    const viewBtn = e.target.closest("[data-view]");
    if (viewBtn && viewBtn.dataset.view) {
      e.preventDefault();
      if (viewBtn.dataset.view === "list") {
        renderList();
        setView("list");
      }
      return;
    }

    if (e.target.closest("[data-action='surprise']")) {
      openSurprise(state.genre !== "all" ? state.genre : null);
      return;
    }

    if (e.target.closest("[data-action='another-same']")) {
      const current = passages.find((p) => p.id === state.currentId);
      openSurprise(current ? current.genre : null);
      return;
    }

    const genreChip = e.target.closest("#genre-filters [data-genre]");
    if (genreChip) {
      state.genre = genreChip.dataset.genre;
      syncChips();
      renderList();
      return;
    }

    const levelChip = e.target.closest("[data-level]");
    if (levelChip) {
      state.level = levelChip.dataset.level;
      syncChips();
      renderList();
      return;
    }

    const openBtn = e.target.closest("[data-open]");
    if (openBtn) openById(openBtn.dataset.open);
  });

  els.btnSentence.addEventListener("click", () => {
    toggleSentenceMode(!state.sentenceMode);
  });

  els.btnPrev.addEventListener("click", () => {
    if (!state.sentenceMode || state.sentenceIndex <= 0) return;
    state.sentenceIndex -= 1;
    updateSentenceHighlight();
  });

  els.btnNext.addEventListener("click", () => {
    if (!state.sentenceMode || state.sentenceIndex >= state.sentences.length - 1) return;
    state.sentenceIndex += 1;
    updateSentenceHighlight();
  });

  els.fontSize.addEventListener("input", () => {
    document.documentElement.style.setProperty("--reader-size", `${els.fontSize.value}px`);
  });

  document.addEventListener("keydown", (e) => {
    if (state.view !== "read" || !state.sentenceMode) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      els.btnNext.click();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      els.btnPrev.click();
    }
  });

  renderFilterChips();
  syncChips();
  renderList();
  document.documentElement.style.setProperty("--reader-size", `${els.fontSize.value}px`);
})();

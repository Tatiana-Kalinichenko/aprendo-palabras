const STORAGE_KEY = "aprendo-espanol-cards-v1";
    const MAX_LEARNING = 30;
    const MODE_LABELS = {
      dictionary: "Словник",
      learning: "Вивчення",
      known: "Знаю"
    };
    const MODE_ORDER = ["dictionary", "learning", "known"];

    let state = loadState();
    let selectedIds = new Set();
    let study = null;
    let toastTimer = null;

    const $ = (selector) => document.querySelector(selector);

    const els = {
      stats: $("#stats"),
      studyBtn: $("#studyBtn"),
      closeStudyBtn: $("#closeStudyBtn"),
      exportCsvBtn: $("#exportCsvBtn"),
      importCsvBtn: $("#importCsvBtn"),
      csvFileInput: $("#csvFileInput"),
      studyPanel: $("#studyPanel"),
      createCardForm: $("#createCardForm"),
      cardFront: $("#cardFront"),
      cardBack: $("#cardBack"),
      cardNotes: $("#cardNotes"),
      createTagPicker: $("#createTagPicker"),
      newTagsInput: $("#newTagsInput"),
      quickTagName: $("#quickTagName"),
      quickAddTag: $("#quickAddTag"),
      tagList: $("#tagList"),
      searchInput: $("#searchInput"),
      modeFilter: $("#modeFilter"),
      sortSelect: $("#sortSelect"),
      selectedInfo: $("#selectedInfo"),
      bulkModeSelect: $("#bulkModeSelect"),
      bulkTagInput: $("#bulkTagInput"),
      bulkApplyMode: $("#bulkApplyMode"),
      bulkAddTags: $("#bulkAddTags"),
      bulkReplaceTags: $("#bulkReplaceTags"),
      bulkRemoveTags: $("#bulkRemoveTags"),
      bulkDelete: $("#bulkDelete"),
      tableWrap: $("#tableWrap"),
      modalBackdrop: $("#cardModalBackdrop"),
      closeCardModal: $("#closeCardModal"),
      editCardForm: $("#editCardForm"),
      editCardId: $("#editCardId"),
      editFront: $("#editFront"),
      editBack: $("#editBack"),
      editNotes: $("#editNotes"),
      editMode: $("#editMode"),
      editTagPicker: $("#editTagPicker"),
      editNewTagsInput: $("#editNewTagsInput"),
      deleteFromModal: $("#deleteFromModal"),
      toast: $("#toast")
    };

    function loadState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { cards: [], tags: [] };
        const parsed = JSON.parse(raw);
        return {
          cards: Array.isArray(parsed.cards) ? parsed.cards : [],
          tags: Array.isArray(parsed.tags) ? parsed.tags : []
        };
      } catch (error) {
        console.warn("Could not load data", error);
        return { cards: [], tags: [] };
      }
    }

    function saveState() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function uid(prefix) {
      if (window.crypto && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }

    function normalize(value) {
      return String(value || "").trim().toLocaleLowerCase("uk");
    }

    function escapeHtml(value) {
      return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function multiline(value) {
      return escapeHtml(value).replace(/\n/g, "<br>");
    }

    function splitTags(value) {
      return String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    function uniqueByNormalized(names) {
      const seen = new Set();
      return names.filter((name) => {
        const key = normalize(name);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    function ensureTags(names) {
      const ids = [];
      for (const name of uniqueByNormalized(names)) {
        const existing = state.tags.find((tag) => normalize(tag.name) === normalize(name));
        if (existing) {
          ids.push(existing.id);
        } else {
          const tag = { id: uid("tag"), name: name.trim() };
          state.tags.push(tag);
          ids.push(tag.id);
        }
      }
      sortTags();
      return ids;
    }

    function sortTags() {
      state.tags.sort((a, b) => a.name.localeCompare(b.name, "uk", { sensitivity: "base" }));
    }

    function getTagNames(card) {
      return (card.tagIds || [])
        .map((id) => state.tags.find((tag) => tag.id === id))
        .filter(Boolean)
        .map((tag) => tag.name)
        .sort((a, b) => a.localeCompare(b, "uk", { sensitivity: "base" }));
    }

    function getPrimaryTagName(card) {
      return getTagNames(card)[0] || "Без тегів";
    }

    function isExistingCardId(id) {
      return state.cards.some((card) => card.id === id);
    }

    function getSelectedCardIds() {
      const checkedIds = Array.from(els.tableWrap.querySelectorAll(".card-check:checked"))
        .map((checkbox) => checkbox.dataset.cardId)
        .filter(Boolean);

      for (const id of checkedIds) {
        selectedIds.add(id);
      }

      selectedIds = new Set(Array.from(selectedIds).filter(isExistingCardId));
      return Array.from(selectedIds);
    }

    function updateSelectedInfo() {
      selectedIds = new Set(Array.from(selectedIds).filter(isExistingCardId));
      els.selectedInfo.textContent = `Обрано: ${selectedIds.size}`;
    }

    function sortHeaderButton(sortValue, label, activeSort) {
      const isActive = activeSort === sortValue;
      return `<button class="sort-header ${isActive ? "active" : ""}" data-sort="${escapeHtml(sortValue)}" type="button">${escapeHtml(label)}${isActive ? '<span class="sort-indicator">↑</span>' : ''}</button>`;
    }

    function learningCountExcluding(ids = []) {
      const excluded = new Set(ids);
      return state.cards.filter((card) => card.mode === "learning" && !excluded.has(card.id)).length;
    }

    function canMoveToLearning(ids) {
      const idSet = new Set(Array.from(ids).filter(isExistingCardId));
      const currentOutsideSelection = state.cards.filter((card) => card.mode === "learning" && !idSet.has(card.id)).length;
      const movingIntoLearning = state.cards.filter((card) => idSet.has(card.id) && card.mode !== "learning").length;
      return currentOutsideSelection + movingIntoLearning <= MAX_LEARNING;
    }

    function showToast(message) {
      window.clearTimeout(toastTimer);
      els.toast.textContent = message;
      els.toast.classList.add("show");
      toastTimer = window.setTimeout(() => {
        els.toast.classList.remove("show");
      }, 2600);
    }

    function renderAll() {
      selectedIds = new Set(Array.from(selectedIds).filter((id) => state.cards.some((card) => card.id === id)));
      renderStats();
      renderTagPickers();
      renderTagList();
      renderCardList();
      renderStudy();
      updateStudyButton();
    }

    function renderStats() {
      const counts = {
        dictionary: state.cards.filter((card) => card.mode === "dictionary").length,
        learning: state.cards.filter((card) => card.mode === "learning").length,
        known: state.cards.filter((card) => card.mode === "known").length
      };

      els.stats.innerHTML = `
        <span class="stat"><strong>${counts.dictionary}</strong> у Словнику</span>
        <span class="stat"><strong>${counts.learning}/${MAX_LEARNING}</strong> у Вивченні</span>
        <span class="stat"><strong>${counts.known}</strong> Знаю</span>
        <span class="stat"><strong>${state.tags.length}</strong> тегів</span>
      `;
    }

    function renderTagPickers() {
      const renderPicker = (container, name, selected = []) => {
        if (!state.tags.length) {
          container.innerHTML = `<p class="muted-text">Тегів ще немає. Створіть нові через поле нижче.</p>`;
          return;
        }

        container.innerHTML = state.tags.map((tag) => `
          <label class="tag-check">
            <input type="checkbox" name="${name}" value="${escapeHtml(tag.id)}" ${selected.includes(tag.id) ? "checked" : ""}>
            ${escapeHtml(tag.name)}
          </label>
        `).join("");
      };

      renderPicker(els.createTagPicker, "createTags");
      const editCard = state.cards.find((card) => card.id === els.editCardId.value);
      renderPicker(els.editTagPicker, "editTags", editCard ? editCard.tagIds || [] : []);
    }

    function renderTagList() {
      if (!state.tags.length) {
        els.tagList.innerHTML = `<div class="empty">Теги ще не створені.</div>`;
        return;
      }

      els.tagList.innerHTML = state.tags.map((tag) => {
        const count = state.cards.filter((card) => (card.tagIds || []).includes(tag.id)).length;
        return `
          <div class="tag-line">
            <div>
              <strong>${escapeHtml(tag.name)}</strong>
              <div class="muted-text">${count} карт.</div>
            </div>
            <div class="row-actions">
              <button class="mini icon-btn" data-tag-action="rename" data-tag-id="${escapeHtml(tag.id)}" aria-label="Редагувати тег" title="Редагувати тег">✎</button>
              <button class="mini danger icon-btn" data-tag-action="delete" data-tag-id="${escapeHtml(tag.id)}" aria-label="Видалити тег" title="Видалити тег">🗑</button>
            </div>
          </div>
        `;
      }).join("");
    }

    function getVisibleCards() {
      const search = normalize(els.searchInput.value);
      const mode = els.modeFilter.value;
      const sort = els.sortSelect.value;

      const filtered = state.cards.filter((card) => {
        const tagNames = getTagNames(card).join(" ");
        const haystack = normalize(`${card.front} ${card.back} ${card.notes || ""} ${tagNames}`);
        const matchesSearch = !search || haystack.includes(search);
        const matchesMode = mode === "all" || card.mode === mode;
        return matchesSearch && matchesMode;
      });

      filtered.sort((a, b) => {
        if (sort === "back") {
          return a.back.localeCompare(b.back, "uk", { sensitivity: "base" });
        }
        if (sort === "tags") {
          return getPrimaryTagName(a).localeCompare(getPrimaryTagName(b), "uk", { sensitivity: "base" })
            || a.front.localeCompare(b.front, "uk", { sensitivity: "base" });
        }
        if (sort === "mode") {
          return MODE_ORDER.indexOf(a.mode) - MODE_ORDER.indexOf(b.mode)
            || a.front.localeCompare(b.front, "uk", { sensitivity: "base" });
        }
        return a.front.localeCompare(b.front, "uk", { sensitivity: "base" });
      });

      return filtered;
    }

    function renderCardList() {
      const visible = getVisibleCards();
      const allVisibleSelected = visible.length > 0 && visible.every((card) => selectedIds.has(card.id));

      updateSelectedInfo();

      if (!state.cards.length) {
        els.tableWrap.innerHTML = `<div class="empty">Поки що немає жодної картки. Створіть першу зліва.</div>`;
        return;
      }

      if (!visible.length) {
        els.tableWrap.innerHTML = `<div class="empty">За поточним пошуком нічого не знайдено.</div>`;
        return;
      }

      const sort = els.sortSelect.value;
      let lastGroup = null;
      const rows = [];

      for (const card of visible) {
        const group = sort === "tags" ? getPrimaryTagName(card) : sort === "mode" ? MODE_LABELS[card.mode] : null;
        if (group && group !== lastGroup) {
          rows.push(`<tr class="group-row"><td colspan="8">${escapeHtml(group)}</td></tr>`);
          lastGroup = group;
        }

        const tagsHtml = getTagNames(card).map((name) => `<span class="tag">${escapeHtml(name)}</span>`).join("") || `<span class="muted-text">Без тегів</span>`;
        const notes = card.notes ? `<div class="muted-text">${multiline(card.notes)}</div>` : `<span class="muted-text">—</span>`;

        rows.push(`
          <tr>
            <td>
              <input type="checkbox" class="card-check" data-card-id="${escapeHtml(card.id)}" ${selectedIds.has(card.id) ? "checked" : ""}>
            </td>
            <td class="word-cell">${multiline(card.front)}</td>
            <td class="word-cell">${multiline(card.back)}</td>
            <td>${notes}</td>
            <td>${tagsHtml}</td>
            <td><span class="mode-badge mode-${escapeHtml(card.mode)}">${MODE_LABELS[card.mode]}</span></td>
            <td>
              <select data-card-action="mode" data-card-id="${escapeHtml(card.id)}" aria-label="Змінити режим картки">
                <option value="dictionary" ${card.mode === "dictionary" ? "selected" : ""}>Словник</option>
                <option value="learning" ${card.mode === "learning" ? "selected" : ""}>Вивчення</option>
                <option value="known" ${card.mode === "known" ? "selected" : ""}>Знаю</option>
              </select>
            </td>
            <td>
              <div class="row-actions">
                <button class="mini icon-btn" data-card-action="edit" data-card-id="${escapeHtml(card.id)}" aria-label="Редагувати картку" title="Редагувати картку">✎</button>
                <button class="mini danger icon-btn" data-card-action="delete" data-card-id="${escapeHtml(card.id)}" aria-label="Видалити картку" title="Видалити картку">🗑</button>
              </div>
            </td>
          </tr>
        `);
      }

      els.tableWrap.innerHTML = `
        <table>
          <colgroup>
            <col class="select-col">
            <col class="word-col">
            <col class="word-col">
            <col class="notes-col">
            <col class="tags-col">
            <col class="mode-col">
            <col class="change-col">
            <col class="actions-col">
          </colgroup>
          <thead>
            <tr>
              <th><input type="checkbox" id="selectAllVisible" ${allVisibleSelected ? "checked" : ""} aria-label="Обрати всі видимі картки"></th>
              <th>${sortHeaderButton("front", "Сторона 1", sort)}</th>
              <th>${sortHeaderButton("back", "Сторона 2", sort)}</th>
              <th>Примітки</th>
              <th>${sortHeaderButton("tags", "Теги", sort)}</th>
              <th>${sortHeaderButton("mode", "Режим", sort)}</th>
              <th>Змінити</th>
              <th>Дії</th>
            </tr>
          </thead>
          <tbody>${rows.join("")}</tbody>
        </table>
      `;
    }

    function updateStudyButton() {
      const learningCount = state.cards.filter((card) => card.mode === "learning").length;
      els.studyBtn.disabled = learningCount < 1;
      els.studyBtn.textContent = learningCount < 1 ? "Немає карток для вивчення" : "Вчити";
      els.closeStudyBtn.style.display = study ? "block" : "none";
    }

    function renderStudy() {
      if (!study) {
        els.studyPanel.classList.remove("active");
        els.studyPanel.innerHTML = "";
        return;
      }

      const card = state.cards.find((item) => item.id === study.cardId);
      if (!card || card.mode !== "learning") {
        pickStudyCard();
        return;
      }

      els.studyPanel.classList.add("active");

      const showingSide = study.flipped ? (study.side === "front" ? "back" : "front") : study.side;
      const label = showingSide === "front" ? "Сторона 1 — українською" : "Сторона 2 — іспанською";
      const text = showingSide === "front" ? card.front : card.back;
      const notesHtml = study.flipped && card.notes ? `<div class="study-notes">${multiline(card.notes)}</div>` : "";
      const answerHtml = study.flipped && study.answer.trim()
        ? `<div><label>Ваш варіант</label><div class="answer-preview">${multiline(study.answer)}</div></div>`
        : "";

      const controls = study.flipped ? `
        ${answerHtml}
        <button class="ghost" data-study-action="flip" type="button">Перевернути</button>
        <button class="ghost" data-study-action="next" type="button">Інша картка</button>
        <button class="mini blue" data-study-action="dictionary" type="button">← Повернути в словник</button>
        <button class="mini good" data-study-action="known" type="button">Знаю →</button>
        <button class="mini icon-btn" data-study-action="edit" type="button" aria-label="Редагувати картку" title="Редагувати картку">✎</button>
      ` : `
        <label for="studyAnswer">Ваш переклад, якщо хочете перевірити себе</label>
        <textarea id="studyAnswer" class="answer-box" placeholder="Поле необовʼязкове. Напишіть переклад і натисніть “Перевернути”.">${escapeHtml(study.answer)}</textarea>
        <button class="primary" data-study-action="flip" type="button">Перевернути</button>
      `;

      els.studyPanel.innerHTML = `
        <div class="study-layout">
          <div class="flashcard">
            <p class="side-label">${escapeHtml(label)}</p>
            <p class="card-word">${multiline(text)}</p>
            ${notesHtml}
          </div>
          <div class="study-controls">
            <div>
              <h2 class="study-title">Режим вивчення</h2>
              <p class="hint study-hint">Категорії тут не показуються, щоб не підказувати відповідь.</p>
            </div>
            ${controls}
          </div>
        </div>
      `;
    }

    function getCheckedTagIds(container) {
      return Array.from(container.querySelectorAll("input[type='checkbox']:checked")).map((input) => input.value);
    }

    function createCard(event) {
      event.preventDefault();

      const front = els.cardFront.value.trim();
      const back = els.cardBack.value.trim();
      if (!front || !back) {
        showToast("Заповніть обидві сторони картки.");
        return;
      }

      const tagIds = [
        ...getCheckedTagIds(els.createTagPicker),
        ...ensureTags(splitTags(els.newTagsInput.value))
      ];

      state.cards.push({
        id: uid("card"),
        front,
        back,
        notes: els.cardNotes.value.trim(),
        tagIds: Array.from(new Set(tagIds)),
        mode: "dictionary",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      saveState();
      els.createCardForm.reset();
      renderAll();
      showToast("Картку створено в режимі “Словник”.");
    }

    function openCardModal(cardId) {
      const card = state.cards.find((item) => item.id === cardId);
      if (!card) return;

      els.editCardId.value = card.id;
      els.editFront.value = card.front;
      els.editBack.value = card.back;
      els.editNotes.value = card.notes || "";
      els.editMode.value = card.mode;
      els.editNewTagsInput.value = "";
      renderTagPickers();
      els.modalBackdrop.classList.add("active");
      els.editFront.focus();
    }

    function closeCardModal() {
      els.modalBackdrop.classList.remove("active");
      els.editCardForm.reset();
      els.editCardId.value = "";
    }

    function saveCardEdit(event) {
      event.preventDefault();

      const card = state.cards.find((item) => item.id === els.editCardId.value);
      if (!card) return;

      const newMode = els.editMode.value;
      if (newMode === "learning" && card.mode !== "learning" && !canMoveToLearning([card.id])) {
        showToast(`У режимі “Вивчення” може бути не більше ${MAX_LEARNING} карток.`);
        els.editMode.value = card.mode;
        return;
      }

      const tagIds = [
        ...getCheckedTagIds(els.editTagPicker),
        ...ensureTags(splitTags(els.editNewTagsInput.value))
      ];

      card.front = els.editFront.value.trim();
      card.back = els.editBack.value.trim();
      card.notes = els.editNotes.value.trim();
      card.mode = newMode;
      card.tagIds = Array.from(new Set(tagIds));
      card.updatedAt = new Date().toISOString();

      if (!card.front || !card.back) {
        showToast("Обидві сторони картки мають бути заповнені.");
        return;
      }

      saveState();
      closeCardModal();
      renderAll();
      showToast("Картку оновлено.");
    }

    function deleteCards(ids) {
      const idList = Array.from(ids);
      if (!idList.length) {
        showToast("Спочатку оберіть картки.");
        return;
      }

      const confirmed = confirm(`Видалити картки: ${idList.length}? Цю дію неможливо скасувати.`);
      if (!confirmed) return;

      state.cards = state.cards.filter((card) => !idList.includes(card.id));
      selectedIds = new Set(Array.from(selectedIds).filter((id) => !idList.includes(id)));

      if (study && idList.includes(study.cardId)) {
        study = null;
      }

      saveState();
      renderAll();
      showToast("Картки видалено.");
    }

    function moveCards(ids, mode) {
      if (!MODE_LABELS[mode]) {
        showToast("Оберіть коректний режим.");
        return false;
      }

      const idList = Array.from(new Set(Array.from(ids).filter(isExistingCardId)));
      if (!idList.length) {
        showToast("Спочатку оберіть картки.");
        return false;
      }

      if (mode === "learning" && !canMoveToLearning(idList)) {
        showToast(`У режимі “Вивчення” може бути не більше ${MAX_LEARNING} карток.`);
        return false;
      }

      let changedCount = 0;
      for (const card of state.cards) {
        if (idList.includes(card.id) && card.mode !== mode) {
          card.mode = mode;
          card.updatedAt = new Date().toISOString();
          changedCount += 1;
        }
      }

      if (study) {
        const current = state.cards.find((card) => card.id === study.cardId);
        if (!current || current.mode !== "learning") pickStudyCard();
      }

      saveState();
      renderAll();
      const message = changedCount
        ? `Режим змінено: ${MODE_LABELS[mode]} (${changedCount}).`
        : `Обрані картки вже були в режимі “${MODE_LABELS[mode]}”.`;
      showToast(message);
      return true;
    }

    function applyTagChange(ids, action) {
      const idList = Array.from(ids);
      if (!idList.length) {
        showToast("Спочатку оберіть картки.");
        return;
      }

      const names = splitTags(els.bulkTagInput.value);
      if (!names.length) {
        showToast("Введіть один або кілька тегів через кому.");
        return;
      }

      const tagIds = ensureTags(names);

      for (const card of state.cards) {
        if (!idList.includes(card.id)) continue;

        if (action === "replace") {
          card.tagIds = Array.from(new Set(tagIds));
        } else if (action === "add") {
          card.tagIds = Array.from(new Set([...(card.tagIds || []), ...tagIds]));
        } else if (action === "remove") {
          card.tagIds = (card.tagIds || []).filter((id) => !tagIds.includes(id));
        }

        card.updatedAt = new Date().toISOString();
      }

      els.bulkTagInput.value = "";
      saveState();
      renderAll();
      showToast("Теги оновлено.");
    }

    function renameTag(tagId) {
      const tag = state.tags.find((item) => item.id === tagId);
      if (!tag) return;

      const name = prompt("Нова назва тегу:", tag.name);
      if (name === null) return;

      const trimmed = name.trim();
      if (!trimmed) {
        showToast("Назва тегу не може бути порожньою.");
        return;
      }

      const duplicate = state.tags.find((item) => item.id !== tagId && normalize(item.name) === normalize(trimmed));
      if (duplicate) {
        const confirmed = confirm("Такий тег уже існує. Обʼєднати ці теги?");
        if (!confirmed) return;

        for (const card of state.cards) {
          if ((card.tagIds || []).includes(tagId)) {
            card.tagIds = Array.from(new Set((card.tagIds || []).map((id) => id === tagId ? duplicate.id : id)));
          }
        }
        state.tags = state.tags.filter((item) => item.id !== tagId);
      } else {
        tag.name = trimmed;
      }

      sortTags();
      saveState();
      renderAll();
      showToast("Тег оновлено на всіх картках.");
    }

    function deleteTag(tagId) {
      const tag = state.tags.find((item) => item.id === tagId);
      if (!tag) return;

      const confirmed = confirm(`Видалити тег “${tag.name}”? Картки залишаться, але без цього тегу.`);
      if (!confirmed) return;

      state.tags = state.tags.filter((item) => item.id !== tagId);
      for (const card of state.cards) {
        card.tagIds = (card.tagIds || []).filter((id) => id !== tagId);
      }

      saveState();
      renderAll();
      showToast("Тег видалено з усіх карток.");
    }

    function addQuickTag() {
      const name = els.quickTagName.value.trim();
      if (!name) {
        showToast("Введіть назву тегу.");
        return;
      }

      const existing = state.tags.find((tag) => normalize(tag.name) === normalize(name));
      if (existing) {
        showToast("Такий тег уже існує.");
        return;
      }

      state.tags.push({ id: uid("tag"), name });
      sortTags();
      els.quickTagName.value = "";
      saveState();
      renderAll();
      showToast("Тег створено.");
    }

    function csvEscape(value) {
      const text = String(value ?? "");
      if (/[",\n\r]/.test(text)) {
        return `"${text.replaceAll('"', '""')}"`;
      }
      return text;
    }

    function exportCardsToCsv() {
      const headers = ["side_1_ukrainian", "side_2_spanish", "notes", "mode", "tags"];
      const rows = state.cards.map((card) => [
        card.front,
        card.back,
        card.notes || "",
        card.mode || "dictionary",
        getTagNames(card).join("; ")
      ]);

      const csv = [headers, ...rows]
        .map((row) => row.map(csvEscape).join(","))
        .join("\r\n");

      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `aprendo-espanol-cards-${date}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast(state.cards.length ? "CSV експортовано." : "Експортовано порожній CSV-шаблон.");
    }

    function parseCsv(text) {
      const rows = [];
      let row = [];
      let field = "";
      let inQuotes = false;

      const cleanText = String(text || "").replace(/^\uFEFF/, "");

      for (let i = 0; i < cleanText.length; i += 1) {
        const char = cleanText[i];
        const next = cleanText[i + 1];

        if (char === '"') {
          if (inQuotes && next === '"') {
            field += '"';
            i += 1;
          } else {
            inQuotes = !inQuotes;
          }
          continue;
        }

        if (char === "," && !inQuotes) {
          row.push(field);
          field = "";
          continue;
        }

        if ((char === "\n" || char === "\r") && !inQuotes) {
          if (char === "\r" && next === "\n") i += 1;
          row.push(field);
          if (row.some((item) => item.trim() !== "")) rows.push(row);
          row = [];
          field = "";
          continue;
        }

        field += char;
      }

      row.push(field);
      if (row.some((item) => item.trim() !== "")) rows.push(row);
      return rows;
    }

    function countMatches(text, pattern) {
      const matches = String(text || "").match(pattern);
      return matches ? matches.length : 0;
    }

    function scoreDecodedCsvText(text) {
      const value = String(text || "");
      const rows = parseCsv(value).slice(0, 12);
      const replacementCount = countMatches(value, /�/g);
      const suspiciousMojibakeCount = countMatches(value, /(?:Ð|Ñ|Ã|Â|Р|С)/g);
      const controlCount = countMatches(value, /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g);
      const cyrillicCount = countMatches(value, /[А-Яа-яЄєІіЇїҐґ]/g);
      const spanishAccentCount = countMatches(value, /[áéíóúüñÁÉÍÓÚÜÑ¿¡]/g);
      const headerScore = looksLikeCsvHeader(rows[0] || []) ? 200 : 0;
      const tableScore = rows.reduce((sum, row) => {
        const filled = row.filter((cell) => String(cell || "").trim()).length;
        return sum + Math.min(filled, 5) * 8;
      }, 0);

      return headerScore + tableScore + cyrillicCount * 3 + spanishAccentCount * 3
        - replacementCount * 250 - suspiciousMojibakeCount * 14 - controlCount * 80;
    }

    function decodeCsvArrayBuffer(buffer) {
      const bytes = new Uint8Array(buffer);
      const hasUtf8Bom = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
      const hasUtf16LeBom = bytes[0] === 0xFF && bytes[1] === 0xFE;
      const hasUtf16BeBom = bytes[0] === 0xFE && bytes[1] === 0xFF;

      const decodeWith = (label, fatal = false) => new TextDecoder(label, { fatal }).decode(buffer);

      if (hasUtf8Bom) return { text: decodeWith("utf-8"), encoding: "UTF-8 BOM" };
      if (hasUtf16LeBom) return { text: decodeWith("utf-16le"), encoding: "UTF-16 LE" };
      if (hasUtf16BeBom) return { text: decodeWith("utf-16be"), encoding: "UTF-16 BE" };

      const evenNulls = bytes.filter((byte, index) => index % 2 === 0 && byte === 0).length;
      const oddNulls = bytes.filter((byte, index) => index % 2 === 1 && byte === 0).length;
      if (oddNulls > bytes.length * 0.2 && evenNulls < oddNulls / 3) {
        return { text: decodeWith("utf-16le"), encoding: "UTF-16 LE" };
      }
      if (evenNulls > bytes.length * 0.2 && oddNulls < evenNulls / 3) {
        return { text: decodeWith("utf-16be"), encoding: "UTF-16 BE" };
      }

      try {
        return { text: decodeWith("utf-8", true), encoding: "UTF-8" };
      } catch (error) {
        // Not valid UTF-8, so the file was likely saved by Excel/Windows in another encoding.
      }

      const candidates = ["windows-1251", "windows-1252", "iso-8859-1"]
        .map((label) => ({ label, text: decodeWith(label) }))
        .map((candidate) => ({
          ...candidate,
          score: scoreDecodedCsvText(candidate.text)
        }))
        .sort((a, b) => b.score - a.score);

      const best = candidates[0];
      const encodingNames = {
        "windows-1251": "Windows-1251",
        "windows-1252": "Windows-1252",
        "iso-8859-1": "ISO-8859-1"
      };

      return { text: best.text, encoding: encodingNames[best.label] || best.label };
    }

    function normalizeHeader(value) {
      return normalize(value).replace(/[\s_-]+/g, "");
    }

    function mapCsvMode(value) {
      const key = normalize(value);
      if (["learning", "вивчення", "учу", "вчу"].includes(key)) return "learning";
      if (["known", "знаю", "вивчено"].includes(key)) return "known";
      return "dictionary";
    }

    function splitCsvTags(value) {
      return String(value || "")
        .split(/[;|]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    function getCsvColumnIndexes(headerRow) {
      const normalized = headerRow.map(normalizeHeader);
      const findAny = (names, fallback) => {
        const keys = names.map(normalizeHeader);
        const index = normalized.findIndex((name) => keys.includes(name));
        return index >= 0 ? index : fallback;
      };

      return {
        front: findAny(["side_1_ukrainian", "side 1", "сторона 1", "українською", "front"], 0),
        back: findAny(["side_2_spanish", "side 2", "сторона 2", "іспанською", "spanish", "back"], 1),
        notes: findAny(["notes", "примітки", "синоніми", "відмінювання"], 2),
        mode: findAny(["mode", "режим"], 3),
        tags: findAny(["tags", "теги", "категорії", "categories"], 4)
      };
    }

    function looksLikeCsvHeader(row) {
      const names = row.map(normalizeHeader);
      return names.some((name) => [
        "side1ukrainian", "side2spanish", "сторона1", "сторона2",
        "українською", "іспанською", "front", "back", "notes", "mode", "tags"
      ].includes(name));
    }

    function importCardsFromCsvText(text, sourceEncoding = "") {
      const rows = parseCsv(text);
      if (!rows.length) {
        showToast("CSV-файл порожній.");
        return;
      }

      const hasHeader = looksLikeCsvHeader(rows[0]);
      const indexes = hasHeader ? getCsvColumnIndexes(rows[0]) : { front: 0, back: 1, notes: 2, mode: 3, tags: 4 };
      const dataRows = hasHeader ? rows.slice(1) : rows;
      let imported = 0;
      let skipped = 0;
      let movedToDictionary = 0;

      for (const row of dataRows) {
        const front = String(row[indexes.front] || "").trim();
        const back = String(row[indexes.back] || "").trim();

        if (!front || !back) {
          skipped += 1;
          continue;
        }

        let mode = mapCsvMode(row[indexes.mode] || "dictionary");
        if (mode === "learning" && !canMoveToLearning([`csv_${imported}_${Date.now()}`])) {
          mode = "dictionary";
          movedToDictionary += 1;
        }

        state.cards.push({
          id: uid("card"),
          front,
          back,
          notes: String(row[indexes.notes] || "").trim(),
          tagIds: ensureTags(splitCsvTags(row[indexes.tags] || "")),
          mode,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        imported += 1;
      }

      if (!imported) {
        showToast("Не імпортовано жодної картки. Перевірте, чи заповнені перші дві колонки.");
        return;
      }

      selectedIds.clear();
      saveState();
      renderAll();

      let message = `Імпортовано карток: ${imported}.`;
      if (sourceEncoding) message += ` Кодування: ${sourceEncoding}.`;
      if (skipped) message += ` Пропущено рядків: ${skipped}.`;
      if (movedToDictionary) message += ` ${movedToDictionary} карт. перенесено в Словник через ліміт Вивчення.`;
      showToast(message);
    }

    function importCardsFromCsvFile(file) {
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const decoded = decodeCsvArrayBuffer(reader.result);
          importCardsFromCsvText(decoded.text, decoded.encoding);
        } catch (error) {
          showToast("Не вдалося розпізнати кодування CSV-файлу. Спробуйте зберегти файл як CSV UTF-8.");
        }
      };
      reader.onerror = () => showToast("Не вдалося прочитати CSV-файл.");
      reader.readAsArrayBuffer(file);
    }

    function pickStudyCard(excludeId = null) {
      const learning = state.cards.filter((card) => card.mode === "learning");
      if (!learning.length) {
        study = null;
        saveState();
        renderAll();
        showToast("У режимі “Вивчення” більше немає карток.");
        return;
      }

      const candidates = learning.length > 1
        ? learning.filter((card) => card.id !== excludeId)
        : learning;

      const card = candidates[Math.floor(Math.random() * candidates.length)];
      study = {
        cardId: card.id,
        side: Math.random() < 0.5 ? "front" : "back",
        flipped: false,
        answer: ""
      };
      renderAll();
      els.studyPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function handleStudyAction(action) {
      if (!study) return;
      const card = state.cards.find((item) => item.id === study.cardId);
      if (!card) return;

      const answerEl = $("#studyAnswer");
      if (answerEl) study.answer = answerEl.value;

      if (action === "flip") {
        study.flipped = !study.flipped;
        renderStudy();
        return;
      }

      if (action === "next") {
        pickStudyCard(study.cardId);
        return;
      }

      if (action === "dictionary") {
        card.mode = "dictionary";
        card.updatedAt = new Date().toISOString();
        saveState();
        pickStudyCard(card.id);
        showToast("Картку повернуто в Словник.");
        return;
      }

      if (action === "known") {
        card.mode = "known";
        card.updatedAt = new Date().toISOString();
        saveState();
        pickStudyCard(card.id);
        showToast("Картку переміщено в “Знаю”.");
        return;
      }

      if (action === "edit") {
        openCardModal(card.id);
      }
    }

    function insertAtCursor(targetId, char) {
      const input = document.getElementById(targetId);
      if (!input) return;

      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      input.value = `${input.value.slice(0, start)}${char}${input.value.slice(end)}`;
      input.focus();
      input.setSelectionRange(start + char.length, start + char.length);
    }

    function bindEvents() {
      els.createCardForm.addEventListener("submit", createCard);

      els.quickAddTag.addEventListener("click", addQuickTag);
      els.quickTagName.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          addQuickTag();
        }
      });

      els.searchInput.addEventListener("input", renderCardList);
      els.modeFilter.addEventListener("change", renderCardList);
      els.sortSelect.addEventListener("change", renderCardList);

      els.studyBtn.addEventListener("click", () => pickStudyCard());
      els.closeStudyBtn.addEventListener("click", () => {
        study = null;
        renderAll();
      });

      els.exportCsvBtn.addEventListener("click", exportCardsToCsv);
      els.importCsvBtn.addEventListener("click", () => els.csvFileInput.click());
      els.csvFileInput.addEventListener("change", (event) => {
        importCardsFromCsvFile(event.target.files[0]);
        event.target.value = "";
      });

      function applyBulkModeFromToolbar() {
        const mode = els.bulkModeSelect.value;
        if (!mode) {
          showToast("Оберіть режим для групової дії.");
          return;
        }

        const ids = getSelectedCardIds();
        const changed = moveCards(ids, mode);
        if (changed) {
          els.bulkModeSelect.value = "";
        }
      }

      els.bulkApplyMode.addEventListener("click", applyBulkModeFromToolbar);
      els.bulkModeSelect.addEventListener("change", () => {
        if (els.bulkModeSelect.value) applyBulkModeFromToolbar();
      });

      els.bulkAddTags.addEventListener("click", () => applyTagChange(getSelectedCardIds(), "add"));
      els.bulkReplaceTags.addEventListener("click", () => applyTagChange(getSelectedCardIds(), "replace"));
      els.bulkRemoveTags.addEventListener("click", () => applyTagChange(getSelectedCardIds(), "remove"));
      els.bulkDelete.addEventListener("click", () => deleteCards(getSelectedCardIds()));

      els.closeCardModal.addEventListener("click", closeCardModal);
      els.modalBackdrop.addEventListener("click", (event) => {
        if (event.target === els.modalBackdrop) closeCardModal();
      });
      els.editCardForm.addEventListener("submit", saveCardEdit);
      els.deleteFromModal.addEventListener("click", () => {
        const id = els.editCardId.value;
        closeCardModal();
        deleteCards([id]);
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && els.modalBackdrop.classList.contains("active")) {
          closeCardModal();
        }
      });

      document.addEventListener("click", (event) => {
        const accentButton = event.target.closest("[data-char][data-target]");
        if (accentButton) {
          insertAtCursor(accentButton.dataset.target, accentButton.dataset.char);
          return;
        }

        const sortButton = event.target.closest("[data-sort]");
        if (sortButton) {
          els.sortSelect.value = sortButton.dataset.sort;
          renderCardList();
          return;
        }

        const tagButton = event.target.closest("[data-tag-action]");
        if (tagButton) {
          if (tagButton.dataset.tagAction === "rename") renameTag(tagButton.dataset.tagId);
          if (tagButton.dataset.tagAction === "delete") deleteTag(tagButton.dataset.tagId);
          return;
        }

        const cardButton = event.target.closest("button[data-card-action]");
        if (cardButton) {
          const id = cardButton.dataset.cardId;
          if (cardButton.dataset.cardAction === "edit") openCardModal(id);
          if (cardButton.dataset.cardAction === "delete") deleteCards([id]);
          return;
        }

        const studyButton = event.target.closest("[data-study-action]");
        if (studyButton) {
          handleStudyAction(studyButton.dataset.studyAction);
        }
      });

      document.addEventListener("change", (event) => {
        const checkbox = event.target.closest(".card-check");
        if (checkbox) {
          if (checkbox.checked) selectedIds.add(checkbox.dataset.cardId);
          else selectedIds.delete(checkbox.dataset.cardId);
          renderCardList();
          return;
        }

        if (event.target.id === "selectAllVisible") {
          const visible = getVisibleCards();
          if (event.target.checked) {
            visible.forEach((card) => selectedIds.add(card.id));
          } else {
            visible.forEach((card) => selectedIds.delete(card.id));
          }
          renderCardList();
          return;
        }

        const modeSelect = event.target.closest("select[data-card-action='mode']");
        if (modeSelect) {
          const id = modeSelect.dataset.cardId;
          const card = state.cards.find((item) => item.id === id);
          const previous = card ? card.mode : null;
          const ok = moveCards([id], modeSelect.value);
          if (!ok && previous) {
            modeSelect.value = previous;
          }
        }
      });

      els.studyPanel.addEventListener("input", (event) => {
        if (event.target.id === "studyAnswer" && study) {
          study.answer = event.target.value;
        }
      });
    }

    bindEvents();
    sortTags();
    saveState();
    renderAll();

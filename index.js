console.log("[DeleteFromHere] loaded");

/**
 * Delete from a given message onward
 * (uses SillyTavern's own UI delete flow as fallback-safe method)
 */
function deleteFromHere(index) {
    if (!confirm("Delete this message and all following messages?")) return;

    const mes =
        document.querySelector(`.mes[data-messageid="${index}"]`) ||
        document.querySelector(`.mes[message_id="${index}"]`);

    if (!mes) {
        console.error("[DFH] message not found for index:", index);
        return;
    }

    // Try to find ST's built-in delete button and click it
    const candidates = mes.querySelectorAll("button, .mes_button, div");

    for (const el of candidates) {
        const title = (el.getAttribute("title") || "").toLowerCase();
        const aria = (el.getAttribute("aria-label") || "").toLowerCase();

        if (title.includes("delete") || aria.includes("delete")) {
            el.click();
            console.log("[DFH] triggered native delete");
            return;
        }
    }

    console.error("[DFH] could not find native delete button in message UI");
}

/**
 * Inject button into message UI
 */
function injectButton(mes) {
    try {
        if (!mes || mes.dataset.dfhAttached === "1") return;

        const buttons = mes.querySelector(".mes_buttons");
        if (!buttons) return;

        const btn = document.createElement("div");
        btn.className = "mes_button dfh-btn";
        btn.title = "Delete from here";
        btn.textContent = "✂️";

        btn.onclick = (e) => {
            e.stopPropagation();

            const id =
                mes.dataset.messageid ||
                mes.getAttribute("message_id");

            if (id == null) {
                console.error("[DFH] missing message id on element");
                return;
            }

            deleteFromHere(id);
        };

        buttons.appendChild(btn);

        mes.dataset.dfhAttached = "1";
    } catch (err) {
        console.error("[DFH inject error]", err);
    }
}

/**
 * Scan all messages once per render cycle
 */
function scan() {
    try {
        document.querySelectorAll(".mes").forEach(injectButton);
    } catch (e) {
        console.error("[DFH scan error]", e);
    }
}

/**
 * Hook into ST events if they exist (safe optional usage)
 */
function hookEvents() {
    const ctx = window.SillyTavernContext || window.getContext?.();

    const es = ctx?.eventSource || window.eventSource;
    const et = ctx?.event_types || window.event_types;

    if (es && et) {
        es.on(et.CHAT_CHANGED, scan);
        es.on(et.MESSAGE_RENDERED, scan);
        console.log("[DFH] hooked into ST events");
        return;
    }

    console.log("[DFH] using fallback scan loop");
    setInterval(scan, 1500);
}

/**
 * Init
 */
setTimeout(scan, 500);
hookEvents();

console.log("[DeleteFromHere] ready");
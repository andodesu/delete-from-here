console.log("[DFH] native loader active");

function getContext() {
    return window.SillyTavernContext
        || window.getContext?.()
        || null;
}

function deleteFromHere(messageId) {
    if (!confirm("Delete this message and all following messages?")) return;

    const index = Number(messageId);

    if (Number.isNaN(index)) {
        console.error("[DFH] bad index:", messageId);
        return;
    }

    const context = window.SillyTavernContext || window.getContext?.();
    const chat = context?.chat || window.chat;

    if (!Array.isArray(chat)) {
        console.error("[DFH] chat not found");
        return;
    }

    console.log("[DFH] deleting from:", index);

    // 🔥 core action
    chat.splice(index);

    // 🔥 force ST to rebuild state
    try { context?.saveChat?.(); } catch {}
    try { window.saveChat?.(); } catch {}

    // 🔥 THIS is the missing piece in your versions
    try {
        context?.eventSource?.emit?.(context?.event_types?.CHAT_CHANGED);
    } catch {}

    try {
        window.eventSource?.emit?.("chat_changed");
    } catch {}

    // 🔥 hard fallback refresh (this is what actually makes it visible)
    setTimeout(() => {
        try { context?.reloadCurrentChat?.(); } catch {}
        try { window.reloadCurrentChat?.(); } catch {}
    }, 50);
}

/**
 * This is the KEY upgrade:
 * Instead of scanning the DOM repeatedly,
 * we patch message rendering once.
 */
function attachToMessage(mes) {
    try {
        if (!mes || mes.dataset.dfhAttached) return;

        const buttons = mes.querySelector(".mes_buttons");
        if (!buttons) return;

        const btn = document.createElement("div");
        btn.className = "mes_button dfh-btn";
        btn.title = "Delete from here";
        btn.textContent = "✂️";

        btn.onclick = (e) => {
            e.stopPropagation();
            deleteFromHere(mes.dataset.messageid);
        };

        buttons.appendChild(btn);

        mes.dataset.dfhAttached = "1";
    } catch (err) {
        console.error("[DFH] attach error", err);
    }
}

/**
 * 🔥 CORE UPGRADE POINT:
 * Hook into ST message rendering if available.
 */
function hookRenderer() {
    const ctx = getContext();

    // Preferred: ST event hook
    if (ctx?.eventSource && ctx?.event_types) {
        ctx.eventSource.on(ctx.event_types.MESSAGE_RENDERED, (mes) => {
            if (mes) attachToMessage(mes);
        });

        ctx.eventSource.on(ctx.event_types.CHAT_CHANGED, () => {
            document.querySelectorAll(".mes").forEach(attachToMessage);
        });

        console.log("[DFH] hooked into ST event system");
        return;
    }

    // Fallback: mutation observer (still better than polling)
    const obs = new MutationObserver((mutations) => {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (node?.classList?.contains("mes")) {
                    attachToMessage(node);
                }
                if (node?.querySelectorAll) {
                    node.querySelectorAll(".mes").forEach(attachToMessage);
                }
            }
        }
    });

    obs.observe(document.body, { childList: true, subtree: true });

    console.log("[DFH] using MutationObserver fallback");
}

// initial pass (safe)
setTimeout(() => {
    document.querySelectorAll(".mes").forEach(attachToMessage);
}, 500);

// hook system
hookRenderer();
console.log("[DeleteFromHere] extension loaded");

function getChat() {
    // Try all known safe sources
    if (window.chat) return window.chat;
    if (window.SillyTavernContext?.chat) return window.SillyTavernContext.chat;
    if (window.getContext?.()?.chat) return window.getContext().chat;
    return null;
}

function save() {
    window.saveChat?.();
    window.SillyTavernContext?.saveChat?.();
    window.getContext?.()?.saveChat?.();
}

function reload() {
    window.reloadCurrentChat?.();
    window.SillyTavernContext?.reloadCurrentChat?.();
    window.getContext?.()?.reloadCurrentChat?.();
}

function deleteFromHere(id) {
    if (!confirm("Delete this message and all following messages?")) return;

    const chat = getChat();

    if (!chat) {
        console.error("[DeleteFromHere] chat not found");
        return;
    }

    chat.splice(id);

    save();
    reload();
}

function addButton(mes) {
    try {
        const buttons = mes.querySelector(".mes_buttons");
        if (!buttons) return;

        if (buttons.querySelector(".delete-from-here")) return;

        const btn = document.createElement("div");
        btn.className = "mes_button delete-from-here";
        btn.title = "Delete from here";
        btn.textContent = "✂️";

        btn.onclick = (e) => {
            e.stopPropagation();
            const id = Number(mes.dataset.messageid);
            deleteFromHere(id);
        };

        buttons.appendChild(btn);
    } catch (err) {
        console.error("[DeleteFromHere] inject error:", err);
    }
}

function scan() {
    document.querySelectorAll(".mes").forEach(addButton);
}

// initial + fallback safety net
setTimeout(scan, 800);
setTimeout(scan, 2000);

if (window.eventSource && window.event_types) {
    window.eventSource.on(window.event_types.CHAT_CHANGED, scan);
    window.eventSource.on(window.event_types.MESSAGE_RENDERED, scan);
}
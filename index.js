function deleteFromHere(messageId) {
    const context = window.SillyTavernContext || window.getContext?.();
    if (!context) return;

    if (!confirm("Delete this message and all following messages?")) return;

    // ✅ OFFICIAL API PATH (preferred)
    if (typeof context.deleteMessages === "function") {
        context.deleteMessages(messageId);
        return;
    }

    // fallback for older builds
    context.chat.splice(messageId);
    context.saveChat?.();
    context.reloadCurrentChat?.();
}

function injectButton(mes) {
    const buttons = mes.querySelector(".mes_buttons");
    if (!buttons || buttons.querySelector(".delete-from-here")) return;

    const btn = document.createElement("div");
    btn.className = "mes_button delete-from-here";
    btn.title = "Delete from here";
    btn.textContent = "✂️";

    btn.onclick = (e) => {
        e.stopPropagation();
        deleteFromHere(Number(mes.dataset.messageid));
    };

    buttons.appendChild(btn);
}

function scan() {
    document.querySelectorAll(".mes").forEach(injectButton);
}

window.eventSource?.on?.(window.event_types?.MESSAGE_RENDERED, scan);
window.eventSource?.on?.(window.event_types?.CHAT_CHANGED, scan);

setTimeout(scan, 500);
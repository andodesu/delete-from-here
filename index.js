function deleteFromHere(messageId) {
    if (messageId == null || messageId < 0) return;

    if (!confirm("Delete this message and all following messages?")) return;

    // ST global variables (important difference)
    const chat = window.chat;

    chat.splice(messageId);

    if (window.saveChat) window.saveChat();
    if (window.reloadCurrentChat) window.reloadCurrentChat();
}

function injectButton(mes) {
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
}

function scan() {
    document.querySelectorAll(".mes").forEach(injectButton);
}

// Hook into ST events safely (if available)
if (window.eventSource && window.event_types) {
    window.eventSource.on(window.event_types.MESSAGE_RENDERED, scan);
    window.eventSource.on(window.event_types.CHAT_CHANGED, scan);
}

// fallback (important for first render timing)
setTimeout(scan, 1000);
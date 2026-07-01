import { eventSource, event_types, chat, saveChat, reloadCurrentChat } from "../../../script.js";

/**
 * Delete this message and all messages after it
 */
function deleteFromHere(messageId) {
    if (messageId == null || messageId < 0) return;

    if (!confirm("Delete this message and all following messages?")) return;

    chat.splice(messageId);

    saveChat();

    reloadCurrentChat();
}

/**
 * Inject button into message action row
 */
function injectButton(mes) {
    const buttons = mes.querySelector(".mes_buttons");
    if (!buttons) return;

    // prevent duplicates
    if (buttons.querySelector(".delete-from-here")) return;

    const btn = document.createElement("div");
    btn.className = "mes_button delete-from-here";
    btn.title = "Delete from here";
    btn.innerHTML = "✂️";

    btn.addEventListener("click", (e) => {
        e.stopPropagation();

        const id = Number(mes.dataset.messageid);
        deleteFromHere(id);
    });

    buttons.appendChild(btn);
}

/**
 * Apply to all messages
 */
function scan() {
    document.querySelectorAll(".mes").forEach(injectButton);
}

/**
 * Hooks (no polling)
 */
eventSource.on(event_types.MESSAGE_RENDERED, scan);
eventSource.on(event_types.CHAT_CHANGED, scan);

// initial run
setTimeout(scan, 500);
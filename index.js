import { eventSource, event_types } from "../../../script.js";
import { deleteMessages } from "../../../scripts/messages.js";

const BUTTON_CLASS = "st-delete-from-here-btn";

/**
 * Inject button into each message actions area
 */
function addDeleteButtonToMessage(messageElement, messageId) {
    if (messageElement.querySelector(`.${BUTTON_CLASS}`)) return;

    const actionsBar = messageElement.querySelector(".mes_buttons");
    if (!actionsBar) return;

    const btn = document.createElement("div");
    btn.className = `mes_button ${BUTTON_CLASS}`;
    btn.innerText = "🗑️ Delete → End";

    btn.style.cursor = "pointer";

    btn.addEventListener("click", (e) => {
        e.stopPropagation();

        const confirmDelete = confirm("Delete this message and all messages after it?");
        if (!confirmDelete) return;

        // Core SillyTavern function (fast path, no UI navigation)
        deleteMessages(messageId, /* inclusive */ true);
    });

    actionsBar.appendChild(btn);
}

/**
 * Scan all messages currently in DOM
 */
function processMessages() {
    const messages = document.querySelectorAll(".mes");

    messages.forEach((msgEl) => {
        const messageId = Number(msgEl.getAttribute("mesid"));
        if (isNaN(messageId)) return;

        addDeleteButtonToMessage(msgEl, messageId);
    });
}

/**
 * Hook into SillyTavern render cycle
 */
function init() {
    // Initial pass
    processMessages();

    // Re-run whenever messages update
    eventSource.on(event_types.MESSAGE_RECEIVED, processMessages);
    eventSource.on(event_types.MESSAGE_DELETED, processMessages);
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, processMessages);
}

/**
 * Register extension
 */
init();
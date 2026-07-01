(function () {
    try {
        console.log("[Delete from Here] Loading...");

        const BUTTON_CLASS = "st-delete-from-here-btn";

        function getMessages() {
            return document.querySelectorAll(".mes");
        }

        function addButton(msgEl) {
            if (msgEl.querySelector(`.${BUTTON_CLASS}`)) return;

            const actionsBar =
                msgEl.querySelector(".mes_buttons") ||
                msgEl.querySelector(".mes_buttons_container") ||
                msgEl.querySelector(".mes-controls");

            if (!actionsBar) return;

            const id = Number(msgEl.getAttribute("mesid"));
            if (isNaN(id)) return;

            const btn = document.createElement("div");
            btn.className = `mes_button ${BUTTON_CLASS}`;
            btn.innerText = "🗑️ Delete from Here";

            btn.style.cursor = "pointer";

            btn.addEventListener("click", (e) => {
                e.stopPropagation();

                if (!confirm("Delete this message and all messages after it?")) return;

                // Try ST native delete system via DOM event (version-safe approach)
                const event = new CustomEvent("delete-messages-from-index", {
                    detail: { messageId: id }
                });

                window.dispatchEvent(event);
            });

            actionsBar.appendChild(btn);
        }

        function scan() {
            getMessages().forEach(addButton);
        }

        function init() {
            scan();

            const observer = new MutationObserver(scan);
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            console.log("[Delete from Here] Loaded successfully");
        }

        init();

    } catch (err) {
        console.error("[Delete from Here] Init failed:", err);
    }
})();
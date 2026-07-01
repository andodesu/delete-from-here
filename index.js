console.log("[DeleteFromHere] loaded");

function deleteFromHere(index) {
    if (!confirm("Delete this message and all following messages?")) return;

    const chat = window.chat;

    if (!Array.isArray(chat)) {
        console.error("[DeleteFromHere] chat not found");
        return;
    }

    chat.splice(index);

    // safest possible save calls
    try { window.saveChat?.(); } catch (e) {}
    try { window.reloadCurrentChat?.(); } catch (e) {}
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
        console.error("[DeleteFromHere] inject error", err);
    }
}

function scan() {
    try {
        document.querySelectorAll(".mes").forEach(addButton);
    } catch (e) {
        console.error("[DeleteFromHere] scan failed", e);
    }
}

// multiple safe entry points (ST is inconsistent across builds)
setTimeout(scan, 500);
setTimeout(scan, 1500);
setTimeout(scan, 3000);

document.addEventListener("DOMContentLoaded", scan);

console.log("[DeleteFromHere] init complete");
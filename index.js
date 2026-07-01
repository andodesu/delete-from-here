(function() {
    'use strict';

    console.log('🚀 Delete After Here: Event delegation (single listener).');

    // --- Helper to get ST context ---
    function getContext() {
        return window.SillyTavern ? SillyTavern.getContext() : null;
    }

    // --- Main deletion logic (unchanged, uses native deleteMessage) ---
    async function deleteAfter(messageId) {
        const context = getContext();
        if (!context) {
            console.error('❌ Context not found.');
            return;
        }

        let chat = context.chat;
        if (!chat && typeof context.getChat === 'function') chat = context.getChat();
        if (!chat) {
            console.error('❌ Chat array not found.');
            return;
        }

        let index = chat.findIndex(msg => String(msg.id) === String(messageId));
        if (index === -1) {
            const idx = parseInt(messageId);
            if (!isNaN(idx) && idx >= 0 && idx < chat.length) index = idx;
        }
        if (index === -1) {
            console.error(`❌ Message ID ${messageId} not found.`);
            return;
        }

        const count = chat.length - index - 1;
        if (!confirm(`Delete this message and ${count} message${count !== 1 ? 's' : ''} after it?`)) return;

        // Collect mesid from DOM (reliable)
        const currentIdNum = parseInt(messageId);
        const allMes = document.querySelectorAll('.mes');
        const idsToDelete = [];
        allMes.forEach(mes => {
            const mesIdAttr = mes.getAttribute('mesid');
            if (mesIdAttr !== null) {
                const idNum = parseInt(mesIdAttr);
                if (!isNaN(idNum) && idNum >= currentIdNum) {
                    idsToDelete.push(idNum);
                }
            }
        });
        idsToDelete.sort((a, b) => b - a);

        if (typeof context.deleteMessage !== 'function') {
            console.error('❌ context.deleteMessage is not a function!');
            return;
        }

        let deleted = 0;
        for (const mesId of idsToDelete) {
            try {
                await context.deleteMessage(mesId);
                deleted++;
            } catch (e) {
                console.error(`❌ Error deleting message ${mesId}:`, e);
            }
        }

        const refresh = () => {
            if (typeof context.refreshMessages === 'function') context.refreshMessages();
            else if (typeof context.loadChat === 'function') context.loadChat();
        };
        refresh();
        setTimeout(refresh, 150);

        if (typeof context.toast === 'function') {
            context.toast(`Deleted ${deleted} messages.`, 'info');
        }
    }

    // --- Inject scissor icon into .extraMesButtons ---
    function injectScissor(container, messageId) {
        if (!container) return;

        // Remove existing scissor if present (avoid duplicates)
        const existing = container.querySelector('.delete-after-here-item');
        if (existing) existing.remove();

        const item = document.createElement('div');
        item.className = 'delete-after-here-item mes_button';
        item.style.cursor = 'pointer';
        item.title = 'Delete all after this message';
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');

        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-scissors fa-fw';
        icon.style.fontSize = '0.9em';
        icon.style.transform = 'translateY(-1px)';
        icon.style.display = 'inline-block';
        item.appendChild(icon);

        item.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteAfter(messageId);
            // Close the menu by clicking the three‑dots toggle
            const mes = container.closest('.mes');
            if (mes) {
                const toggle = mes.querySelector('.mes_button.extraMesButtonsHint');
                if (toggle) toggle.click();
            }
        });

        container.appendChild(item);
    }

    // --- Helper to get message ID from .mes element ---
    function getMessageId(el) {
        const id = el.getAttribute('mesid');
        if (id !== null) return id;
        if (el.dataset.messageId) return el.dataset.messageId;
        if (el.dataset.id) return el.dataset.id;
        return el.id || null;
    }

    // --- Set up event delegation on #chat (ONE listener) ---
    function setupDelegation() {
        const container = document.querySelector('#chat');
        if (!container) return false;

        // Only attach once
        if (container.dataset.deleteAfterHereDelegated) return true;
        container.dataset.deleteAfterHereDelegated = 'true';

        // One listener for all three‑dots clicks
        container.addEventListener('click', function(e) {
            // Find if the click was on or inside a .mes_button.extraMesButtonsHint
            const toggle = e.target.closest('.mes_button.extraMesButtonsHint');
            if (!toggle) return;

            const mes = toggle.closest('.mes');
            if (!mes) return;
            const id = getMessageId(mes);
            if (!id) return;
            const menu = mes.querySelector('.extraMesButtons');
            if (!menu) return;

            // Wait a tiny bit for the menu to become visible (style change)
            setTimeout(() => {
                // Check if menu is actually visible (offsetParent is non-null)
                if (menu.offsetParent !== null) {
                    injectScissor(menu, id);
                }
            }, 50);
        });

        return true;
    }

    // --- Check for any already‑open menus on load ---
    function scanExisting() {
        const container = document.querySelector('#chat');
        if (!container) return false;

        container.querySelectorAll('.extraMesButtons').forEach(menu => {
            // If the menu is visible (offsetParent !== null)
            if (menu.offsetParent !== null) {
                const mes = menu.closest('.mes');
                if (mes) {
                    const id = getMessageId(mes);
                    if (id) injectScissor(menu, id);
                }
            }
        });
        return true;
    }

    // --- Retry initialisation until #chat is available ---
    let attempts = 0, interval;
    function init() {
        if (interval) clearInterval(interval);
        interval = setInterval(() => {
            attempts++;
            const ok = setupDelegation() && scanExisting();
            if (ok) {
                clearInterval(interval);
                interval = null;
                console.log('✅ Delete After Here ready.');
            } else if (attempts >= 30) {
                clearInterval(interval);
                interval = null;
                console.error('❌ Failed to initialise.');
            }
        }, 1000);
    }

    // --- Start when DOM is ready ---
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
    document.addEventListener('SillyTavernReady', () => setTimeout(init, 500));
})();
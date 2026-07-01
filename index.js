(function() {
    'use strict';

    console.log('🚀 Delete After Here: Loaded.');

    // --- Helpers ---
    function getContext() {
        return window.SillyTavern?.getContext() || null;
    }

    function getMessageId(el) {
        return el.getAttribute('mesid')
            || el.dataset.messageId
            || el.dataset.id
            || el.id
            || null;
    }

    /** Check if a menu element is currently visible */
    function isMenuVisible(menu) {
        return (
            menu.offsetParent !== null &&
            menu.style.display !== 'none' &&
            !menu.hasAttribute('hidden')
        );
    }

    // --- Core deletion logic (uses native deleteMessage) ---
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

        // Collect all mesid ≥ current from DOM (reliable)
        const currentIdNum = parseInt(messageId);
        const allMes = document.querySelectorAll('.mes');
        const idsToDelete = [];
        for (const mes of allMes) {
            const mesId = mes.getAttribute('mesid');
            if (mesId !== null) {
                const idNum = parseInt(mesId);
                if (!isNaN(idNum) && idNum >= currentIdNum) {
                    idsToDelete.push(idNum);
                }
            }
        }
        idsToDelete.sort((a, b) => b - a); // reverse order

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

        // Refresh UI
        const refresh = () => {
            if (typeof context.refreshMessages === 'function') context.refreshMessages();
            else if (typeof context.loadChat === 'function') context.loadChat();
        };
        refresh();
        setTimeout(refresh, 150); // extra safety

        if (typeof context.toast === 'function') {
            context.toast(`Deleted ${deleted} messages.`, 'info');
        }
    }

    // --- Inject scissor icon into .extraMesButtons ---
    function injectScissor(container, messageId) {
        if (!container) return;

        // Remove any existing scissor to avoid duplicates
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
        icon.style.fontSize = '0.95em';
        icon.style.transform = 'translateY(-3px)';
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

    // --- Set up a one‑shot observer that reacts when the menu becomes visible ---
    function waitForMenuAndInject(menu, messageId) {
        // Cleanup function to disconnect both observers
        let observers = [];

        const cleanup = () => {
            for (const obs of observers) {
                if (obs) obs.disconnect();
            }
            observers = [];
        };

        // Check visibility and inject if visible
        const checkAndInject = () => {
            if (isMenuVisible(menu)) {
                injectScissor(menu, messageId);
                cleanup();
                return true;
            }
            return false;
        };

        // If already visible, inject immediately
        if (checkAndInject()) return;

        // Observer for changes on the menu itself (style, hidden, class)
        const menuObserver = new MutationObserver(() => {
            if (checkAndInject()) {
                menuObserver.disconnect();
                // also disconnect dropdown observer if it exists
                if (dropdownObserver) dropdownObserver.disconnect();
            }
        });
        menuObserver.observe(menu, {
            attributes: true,
            attributeFilter: ['style', 'hidden', 'class'],
        });
        observers.push(menuObserver);

        // Also observe the parent .dropdown for class changes (if present)
        const dropdown = menu.closest('.dropdown');
        let dropdownObserver = null;
        if (dropdown) {
            dropdownObserver = new MutationObserver(() => {
                if (checkAndInject()) {
                    dropdownObserver.disconnect();
                    menuObserver.disconnect();
                }
            });
            dropdownObserver.observe(dropdown, {
                attributes: true,
                attributeFilter: ['class'],
            });
            observers.push(dropdownObserver);
        }

        // Safety cleanup after 5 seconds (prevents memory leaks)
        setTimeout(() => {
            for (const obs of observers) {
                if (obs) obs.disconnect();
            }
            observers = [];
        }, 5000);
    }

    // --- Event delegation: single click listener on #chat ---
    function setupDelegation() {
        const container = document.querySelector('#chat');
        if (!container) return false;

        if (container.dataset.deleteAfterHereDelegated) return true;
        container.dataset.deleteAfterHereDelegated = 'true';

        container.addEventListener('click', function(e) {
            const toggle = e.target.closest('.mes_button.extraMesButtonsHint');
            if (!toggle) return;

            const mes = toggle.closest('.mes');
            if (!mes) return;
            const id = getMessageId(mes);
            if (!id) return;
            const menu = mes.querySelector('.extraMesButtons');
            if (!menu) return;

            waitForMenuAndInject(menu, id);
        });

        return true;
    }

    // --- Check for any already‑open menus on page load ---
    function scanExisting() {
        const container = document.querySelector('#chat');
        if (!container) return false;

        const menus = container.querySelectorAll('.extraMesButtons');
        for (const menu of menus) {
            if (isMenuVisible(menu)) {
                const mes = menu.closest('.mes');
                if (mes) {
                    const id = getMessageId(mes);
                    if (id) injectScissor(menu, id);
                }
            }
        }
        return true;
    }

    // --- Initialisation with retry ---
    let attempts = 0;
    let interval = null;

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
    document.addEventListener('SillyTavernReady', () => {
        setTimeout(init, 500);
    });
})();
(function() {
    'use strict';

    console.log('🚀 Delete After Here: Loaded (with fixed modal).');

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

    function isMenuVisible(menu) {
        return (
            menu.offsetParent !== null &&
            menu.style.display !== 'none' &&
            !menu.hasAttribute('hidden')
        );
    }

    // --- Confirmation using ST's native modal (with robust handling) ---
    async function confirmWithModal(message) {
        const context = getContext();
        if (context && typeof context.callGenericPopup === 'function') {
            try {
                const result = await context.callGenericPopup(message, 'confirm', null, {
                    okButton: 'Delete',
                    cancelButton: 'Cancel',
                });
                console.log('🔍 Popup result:', result); // Debug: check console
                // Affirmative if result is true, or equals "Delete", or is a truthy non-cancel value
                if (result === true || result === 'Delete' || (typeof result === 'string' && result.toLowerCase() === 'delete')) {
                    return true;
                }
                return false;
            } catch (e) {
                console.error('Popup error, falling back to confirm:', e);
                return confirm(message);
            }
        }
        return confirm(message);
    }

    // --- Core deletion logic ---
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
        let msg;
        if (count === 0) {
            msg = 'Are you sure you want to delete this message?';
        } else {
            msg = `Are you sure you want to delete this message and ${count} message${count !== 1 ? 's' : ''} after it?`;
        }
        if (!(await confirmWithModal(msg))) return;

        // Collect all mesid ≥ current from DOM
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

        // Refresh UI
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

    // --- Inject scissor icon ---
    function injectScissor(container, messageId) {
        if (!container) return;
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
            const mes = container.closest('.mes');
            if (mes) {
                const toggle = mes.querySelector('.mes_button.extraMesButtonsHint');
                if (toggle) toggle.click();
            }
        });

        container.appendChild(item);
    }

    // --- One‑shot observer for menu visibility ---
    function waitForMenuAndInject(menu, messageId) {
        let observers = [];

        const cleanup = () => {
            for (const obs of observers) {
                if (obs) obs.disconnect();
            }
            observers = [];
        };

        const checkAndInject = () => {
            if (isMenuVisible(menu)) {
                injectScissor(menu, messageId);
                cleanup();
                return true;
            }
            return false;
        };

        if (checkAndInject()) return;

        const menuObserver = new MutationObserver(() => {
            if (checkAndInject()) {
                menuObserver.disconnect();
                if (dropdownObserver) dropdownObserver.disconnect();
            }
        });
        menuObserver.observe(menu, {
            attributes: true,
            attributeFilter: ['style', 'hidden', 'class'],
        });
        observers.push(menuObserver);

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

        // Safety cleanup after 5s
        setTimeout(() => {
            for (const obs of observers) {
                if (obs) obs.disconnect();
            }
            observers = [];
        }, 5000);
    }

    // --- Event delegation (single listener) ---
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

    // --- Scan for already‑open menus on load ---
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

    // --- Initialisation ---
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

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
    document.addEventListener('SillyTavernReady', () => {
        setTimeout(init, 500);
    });
})();
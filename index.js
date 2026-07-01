(function() {
    'use strict';

    // ============================================================
    // SillyTavern Extension: Delete All After
    // Adds a scissor icon (✂️) to each message's action menu.
    // Clicking it deletes that message and all messages after it.
    // ============================================================

    // --- Helpers ---

    /** Get SillyTavern's extension context */
    function getContext() {
        return window.SillyTavern?.getContext() || null;
    }

    /** Extract message ID from a .mes element */
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

    // --- Confirmation Dialog ---

    /**
     * Show a confirmation modal using SillyTavern's native popup system.
     * Falls back to browser confirm() if the API is unavailable.
     */
    async function confirmWithModal(message) {
        const context = getContext();
        if (context?.callGenericPopup) {
            try {
                const result = await context.callGenericPopup(message, 'confirm', null, {
                    okButton: 'Delete',
                    cancelButton: 'Cancel',
                });
                // ST's confirm popup returns 1 for "Delete", 0 for "Cancel"
                return result === 1;
            } catch {
                // Fallback if the popup fails
                return confirm(message);
            }
        }
        return confirm(message);
    }

    // --- Deletion Logic ---

    /**
     * Delete the clicked message and all messages after it.
     * Uses ST's native deleteMessage API for each message.
     */
    async function deleteAfter(messageId) {
        const context = getContext();
        if (!context) {
            console.error('[DeleteAfter] Context not found.');
            return;
        }

        const chat = context.chat ?? (typeof context.getChat === 'function' ? context.getChat() : null);
        if (!chat) {
            console.error('[DeleteAfter] Chat array not found.');
            return;
        }

        // Find the index of the message
        let index = chat.findIndex(msg => String(msg.id) === String(messageId));
        if (index === -1) {
            const idx = parseInt(messageId);
            if (!isNaN(idx) && idx >= 0 && idx < chat.length) index = idx;
        }
        if (index === -1) {
            console.error(`[DeleteAfter] Message ID ${messageId} not found.`);
            return;
        }

        // Build confirmation message
        const count = chat.length - index - 1;
        const msg = count === 0
            ? 'Are you sure you want to delete this message?'
            : `Are you sure you want to delete this message and ${count} message${count !== 1 ? 's' : ''} after it?`;

        if (!(await confirmWithModal(msg))) return;

        // Collect all mesid ≥ current from the DOM
        const currentIdNum = parseInt(messageId);
        const idsToDelete = [];
        for (const mes of document.querySelectorAll('.mes')) {
            const mesId = mes.getAttribute('mesid');
            if (mesId !== null) {
                const idNum = parseInt(mesId);
                if (!isNaN(idNum) && idNum >= currentIdNum) {
                    idsToDelete.push(idNum);
                }
            }
        }
        idsToDelete.sort((a, b) => b - a); // Delete from bottom up

        if (typeof context.deleteMessage !== 'function') {
            console.error('[DeleteAfter] deleteMessage is not available.');
            return;
        }

        // Perform deletions
        let deleted = 0;
        for (const mesId of idsToDelete) {
            try {
                await context.deleteMessage(mesId);
                deleted++;
            } catch (e) {
                console.error(`[DeleteAfter] Failed to delete ${mesId}:`, e);
            }
        }

        // Refresh UI
        const refresh = () => {
            if (typeof context.refreshMessages === 'function') context.refreshMessages();
            else if (typeof context.loadChat === 'function') context.loadChat();
        };
        refresh();
        setTimeout(refresh, 150);

        // Toast notification
        if (typeof context.toast === 'function') {
            context.toast(`Deleted ${deleted} messages.`, 'info');
        }
    }

    // --- UI Injection ---

    /**
     * Inject the scissor icon into the .extraMesButtons container
     */
    function injectScissor(container, messageId) {
        if (!container) return;

        // Remove any existing scissor (avoid duplicates)
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
            // Close the menu
            const mes = container.closest('.mes');
            if (mes) {
                const toggle = mes.querySelector('.mes_button.extraMesButtonsHint');
                toggle?.click();
            }
        });

        container.appendChild(item);
    }

    // --- Visibility Observer ---

    /**
     * Wait for the menu to become visible, then inject the scissor.
     * Uses a one-shot MutationObserver that self-destructs after injection.
     */
    function waitForMenuAndInject(menu, messageId) {
        let observers = [];

        const cleanup = () => {
            for (const obs of observers) {
                obs?.disconnect();
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

        // If already visible, inject immediately
        if (checkAndInject()) return;

        // Observe the menu itself
        const menuObserver = new MutationObserver(() => {
            if (checkAndInject()) {
                menuObserver.disconnect();
                dropdownObserver?.disconnect();
            }
        });
        menuObserver.observe(menu, {
            attributes: true,
            attributeFilter: ['style', 'hidden', 'class'],
        });
        observers.push(menuObserver);

        // Also observe the parent dropdown for class changes
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

        // Safety: clean up after 5 seconds (prevents memory leaks)
        setTimeout(cleanup, 5000);
    }

    // --- Event Delegation ---

    /**
     * Set up a single click listener on #chat using event delegation.
     * This handles all three-dots toggles without per-message listeners.
     */
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

    // --- Scan Existing Menus ---

    /**
     * Check for any menus that are already open when the extension loads.
     * This handles the case where a menu was open before the extension initialized.
     */
    function scanExisting() {
        const container = document.querySelector('#chat');
        if (!container) return false;

        for (const menu of container.querySelectorAll('.extraMesButtons')) {
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
                console.error('❌ Failed to initialise Delete After Here.');
            }
        }, 1000);
    }

    // --- Start ---

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
    document.addEventListener('SillyTavernReady', () => setTimeout(init, 500));
})();
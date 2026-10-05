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

    /**
     * Read the message index from a .mes element.
     * ST exposes this as the `mesid` attribute, which equals the
     * message's position in the chat array.
     */
    function getMesIndex(el) {
        const raw = el.getAttribute('mesid')
            || el.dataset.messageId
            || el.dataset.id
            || el.id
            || null;
        return raw === null ? null : String(raw);
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
                return confirm(message);
            }
        }
        return confirm(message);
    }

    // --- Deletion Logic ---

    /**
     * Delete the message at `mesIndex` and all messages after it.
     * Uses ST's native deleteMessage API for each message.
     */
    async function deleteAfter(mesIndex) {
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

        // ST's chat array objects have no `id` property. The "message ID"
        // exposed in the DOM as the `mesid` attribute is actually the array
        // index. So we parse it directly — no need to search for a match.
        const index = parseInt(mesIndex);
        if (isNaN(index) || index < 0 || index >= chat.length) {
            console.error(`[DeleteAfter] Message index ${mesIndex} is out of range.`);
            return;
        }

        const count = chat.length - index - 1;
        const msg = count === 0
            ? 'Are you sure you want to delete this message?'
            : `Are you sure you want to delete this message and ${count} message${count !== 1 ? 's' : ''} after it?`;

        if (!(await confirmWithModal(msg))) return;

        if (typeof context.deleteMessage !== 'function') {
            console.error('[DeleteAfter] deleteMessage is not available.');
            return;
        }

        const targetIndex = index;
        const maxIterations = 1000;
        let deleted = 0;
        let iteration = 0;

        while (iteration++ < maxIterations) {
            // Re-scan the DOM for the highest remaining mesid >= target.
            // ST's deleteMessage renumbers mesids after each deletion
            // (via updateViewMessageIds), so we must re-read them instead
            // of using a stale snapshot from before the loop.
            let highest = -1;
            for (const mes of document.querySelectorAll('.mes')) {
                const idStr = mes.getAttribute('mesid');
                if (idStr === null) continue;
                const idNum = parseInt(idStr);
                if (!isNaN(idNum) && idNum >= targetIndex && idNum > highest) {
                    highest = idNum;
                }
            }

            if (highest === -1) break;

            const beforeCount = document.querySelectorAll('.mes').length;

            try {
                await context.deleteMessage(highest);
            } catch (e) {
                console.error(`[DeleteAfter] Failed to delete message at index ${highest}:`, e);
                break;
            }

            const afterCount = document.querySelectorAll('.mes').length;

            // Guard against deleteMessage silently no-op'ing (e.g. it can't
            // find the element) — without this, the loop could spin forever.
            if (afterCount >= beforeCount) {
                console.warn(
                    `[DeleteAfter] Deletion at index ${highest} did not reduce message count. Aborting.`
                );
                break;
            }

            deleted++;
        }

        const refresh = () => {
            if (typeof context.refreshMessages === 'function') context.refreshMessages();
            else if (typeof context.loadChat === 'function') context.loadChat();
        };
        refresh();
        setTimeout(refresh, 150);

        if (typeof context.toast === 'function') {
            context.toast(`Deleted ${deleted} message${deleted !== 1 ? 's' : ''}.`, 'info');
        }
    }

    // --- UI Injection ---

    /**
     * Inject the scissor icon into the .extraMesButtons container.
     */
    function injectScissor(container, mesIndex) {
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
            deleteAfter(mesIndex);
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
    function waitForMenuAndInject(menu, mesIndex) {
        let observers = [];

        const cleanup = () => {
            for (const obs of observers) obs?.disconnect();
            observers = [];
        };

        const checkAndInject = () => {
            if (isMenuVisible(menu)) {
                injectScissor(menu, mesIndex);
                cleanup();
                return true;
            }
            return false;
        };

        if (checkAndInject()) return;

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

        setTimeout(cleanup, 5000);
    }

    // --- Event Delegation ---

    /**
     * Set up a single click listener on #chat using event delegation.
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

            const mesIndex = getMesIndex(mes);
            if (mesIndex === null) return;

            const menu = mes.querySelector('.extraMesButtons');
            if (!menu) return;

            waitForMenuAndInject(menu, mesIndex);
        });

        return true;
    }

    // --- Scan Existing Menus ---

    /**
     * Inject the scissor into any menus that are already open on load.
     */
    function scanExisting() {
        const container = document.querySelector('#chat');
        if (!container) return false;

        for (const menu of container.querySelectorAll('.extraMesButtons')) {
            if (isMenuVisible(menu)) {
                const mes = menu.closest('.mes');
                if (mes) {
                    const mesIndex = getMesIndex(mes);
                    if (mesIndex !== null) injectScissor(menu, mesIndex);
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

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
    document.addEventListener('SillyTavernReady', () => setTimeout(init, 500));
})();
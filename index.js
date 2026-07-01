(function() {
    'use strict';

    // --- Helper: get ST context ---
    function getContext() {
        return window.SillyTavern ? SillyTavern.getContext() : null;
    }

    // --- Deletion logic (same as before) ---
    function deleteAfter(messageId) {
        const context = getContext();
        if (!context) return;

        let chat = context.chat || (typeof context.getChat === 'function' ? context.getChat() : null);
        if (!chat) {
            console.warn('Delete After Here: chat not available');
            return;
        }

        const index = chat.findIndex(msg => msg.id === messageId);
        if (index === -1) {
            console.warn('Delete After Here: message not found');
            return;
        }

        const count = chat.length - index - 1;
        if (!confirm(`Delete this message and ${count} message${count !== 1 ? 's' : ''} after it?`)) {
            return;
        }

        chat.splice(index);

        if (typeof context.saveChat === 'function') context.saveChat();
        else if (typeof context.setChat === 'function') context.setChat(chat);

        if (typeof context.refreshMessages === 'function') context.refreshMessages();
        else if (typeof context.loadChat === 'function') context.loadChat();

        if (typeof context.toast === 'function') {
            context.toast('Deleted message and all following messages.', 'info');
        }
    }

    // --- Add our option to a dropdown menu ---
    function addDeleteOptionToDropdown(dropdownMenu, messageId) {
        // Avoid duplicates
        if (dropdownMenu.querySelector('.delete-after-here-item')) return;

        const listItem = document.createElement('li');
        listItem.className = 'delete-after-here-item';

        const link = document.createElement('a');
        link.href = '#';
        link.textContent = '🗑️ Delete all after this'; // or use text only
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            deleteAfter(messageId);

            // Close the dropdown
            const dropdown = dropdownMenu.closest('.dropdown');
            if (dropdown) {
                const toggle = dropdown.querySelector('[data-toggle="dropdown"]');
                if (toggle) toggle.click(); // toggles it off
            }
        });

        listItem.appendChild(link);
        dropdownMenu.appendChild(listItem);
    }

    // --- Process a single message element ---
    function processMessage(messageElement) {
        const messageId = messageElement.dataset.messageId;
        if (!messageId) return;

        // Find the dropdown toggle (three‑dots button)
        const toggleBtn = messageElement.querySelector('[data-toggle="dropdown"]');
        if (!toggleBtn) return;

        const dropdown = toggleBtn.closest('.dropdown');
        if (!dropdown) return;

        // Prevent attaching multiple listeners to the same dropdown
        if (dropdown.dataset.deleteAfterHere === 'true') return;
        dropdown.dataset.deleteAfterHere = 'true';

        // When the dropdown opens, inject our item
        dropdown.addEventListener('shown.bs.dropdown', function() {
            const menu = this.querySelector('.dropdown-menu');
            if (menu) {
                addDeleteOptionToDropdown(menu, messageId);
            }
        });

        // If dropdown is already open (rare), add immediately
        if (dropdown.classList.contains('show')) {
            const menu = dropdown.querySelector('.dropdown-menu');
            if (menu) addDeleteOptionToDropdown(menu, messageId);
        }
    }

    // --- Watch the chat container for new messages ---
    function observeMessages() {
        const chatContainer = document.getElementById('chat');
        if (!chatContainer) {
            console.warn('Delete After Here: chat container not found');
            return;
        }

        // Process messages already on the page
        chatContainer.querySelectorAll('.mes').forEach(processMessage);

        // Observe future messages
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // If the added node is a message itself
                        if (node.matches && node.matches('.mes')) {
                            processMessage(node);
                        }
                        // Or if it contains messages
                        if (node.querySelectorAll) {
                            node.querySelectorAll('.mes').forEach(processMessage);
                        }
                    }
                }
            }
        });

        observer.observe(chatContainer, { childList: true, subtree: true });
        console.log('✅ Delete After Here: observer started.');
    }

    // --- Start when DOM is ready ---
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        observeMessages();
    } else {
        document.addEventListener('DOMContentLoaded', observeMessages);
    }

    // Also re-run when ST re-renders the chat (e.g., after navigation)
    document.addEventListener('SillyTavernReady', () => {
        setTimeout(observeMessages, 300);
    });
})();
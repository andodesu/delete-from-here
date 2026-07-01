(function() {
    'use strict';

    console.log('🚀 Delete After Here: Specialised script loaded.');

    function getContext() {
        return window.SillyTavern ? SillyTavern.getContext() : null;
    }

    function deleteAfter(messageId) {
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

        const index = chat.findIndex(msg => msg.id === messageId);
        if (index === -1) {
            console.error(`❌ Message ID ${messageId} not found.`);
            return;
        }

        const count = chat.length - index - 1;
        if (!confirm(`Delete this message and ${count} message${count !== 1 ? 's' : ''} after it?`)) return;

        chat.splice(index);

        if (typeof context.saveChat === 'function') context.saveChat();
        else if (typeof context.setChat === 'function') context.setChat(chat);

        if (typeof context.refreshMessages === 'function') context.refreshMessages();
        else if (typeof context.loadChat === 'function') context.loadChat();

        if (typeof context.toast === 'function') context.toast('Deleted messages.', 'info');
        console.log('✅ Deletion complete.');
    }

    function addDeleteOptionToMenu(menu, messageId) {
        if (!menu) {
            console.warn('⚠️ Menu element is null.');
            return false;
        }
        // Avoid duplicates
        if (menu.querySelector('.delete-after-here-item')) {
            console.log('ℹ️ Option already exists.');
            return false;
        }

        const listItem = document.createElement('div'); // 'mes_buttons' likely uses divs, not <li>
        listItem.className = 'delete-after-here-item mes_button'; // mimic existing button style
        listItem.style.cursor = 'pointer';
        listItem.textContent = '🗑️ Delete all after';
        listItem.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteAfter(messageId);
            // Close the menu – find the toggle button and click it again
            const mesElement = menu.closest('.mes');
            if (mesElement) {
                const toggleBtn = mesElement.querySelector('.mes_button.extraMesButtonsHint');
                if (toggleBtn) toggleBtn.click(); // toggle off
            }
        });

        menu.appendChild(listItem);
        console.log(`✅ Delete option added for message ${messageId}`);
        return true;
    }

    function processMessage(messageElement) {
        const messageId = messageElement.dataset.messageId;
        if (!messageId) {
            console.warn('⚠️ Message has no data-message-id.');
            return;
        }

        // Find the three-dots button
        const toggleBtn = messageElement.querySelector('.mes_button.extraMesButtonsHint');
        if (!toggleBtn) {
            console.warn(`⚠️ No toggle button found for message ${messageId}`);
            return;
        }

        // Avoid attaching duplicate listeners
        if (toggleBtn.dataset.deleteAfterHereHook === 'true') return;
        toggleBtn.dataset.deleteAfterHereHook = 'true';

        toggleBtn.addEventListener('click', function() {
            console.log(`🖱️ Toggle clicked for message ${messageId}`);
            // Wait a tiny bit for the menu to appear
            setTimeout(() => {
                // The menu is likely a sibling of the button or inside the same .mes
                // Try to find .mes_buttons inside the message element
                let menu = messageElement.querySelector('.mes_buttons');
                if (!menu) {
                    // Sometimes it might be elsewhere – try to find it globally (less ideal)
                    menu = document.querySelector('.mes_buttons');
                }
                if (menu) {
                    addDeleteOptionToMenu(menu, messageId);
                } else {
                    console.warn('⚠️ Menu .mes_buttons not found.');
                }
            }, 150);
        });

        console.log(`✅ Toggle listener set for message ${messageId}`);
    }

    function scanAndProcess() {
        const chatContainer = document.getElementById('chat');
        if (!chatContainer) {
            console.warn('❌ #chat container not found.');
            return;
        }

        // Find all messages with class 'mes'
        const messages = chatContainer.querySelectorAll('.mes');
        console.log(`📊 Found ${messages.length} messages.`);
        if (messages.length === 0) {
            console.warn('⚠️ No .mes elements found. Check if messages are loaded.');
            // Optionally try alternative selectors
            const altMessages = chatContainer.querySelectorAll('[data-message-id]');
            if (altMessages.length > 0) {
                console.log(`ℹ️ Found ${altMessages.length} elements with data-message-id. Using those.`);
                altMessages.forEach(processMessage);
                return;
            }
        }
        messages.forEach(processMessage);

        // Watch for new messages
        const observer = new MutationObserver(() => {
            chatContainer.querySelectorAll('.mes').forEach(msg => {
                const toggle = msg.querySelector('.mes_button.extraMesButtonsHint');
                if (toggle && !toggle.dataset.deleteAfterHereHook) {
                    processMessage(msg);
                }
            });
        });
        observer.observe(chatContainer, { childList: true, subtree: true });
        console.log('👀 Observer started.');
    }

    // Initialise
    let attempts = 0;
    function init() {
        attempts++;
        if (document.getElementById('chat')) {
            scanAndProcess();
        } else {
            if (attempts < 15) {
                console.log(`⏳ Waiting for #chat... (attempt ${attempts})`);
                setTimeout(init, 500);
            } else {
                console.error('❌ #chat never appeared.');
            }
        }
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
    document.addEventListener('SillyTavernReady', () => setTimeout(init, 300));
})();
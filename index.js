(function() {
    'use strict';

    console.log('🚀 Delete After Here: Script loaded.');

    function getContext() {
        return window.SillyTavern ? SillyTavern.getContext() : null;
    }

    function deleteAfter(messageId) {
        const context = getContext();
        if (!context) {
            console.error('❌ Delete After Here: Context not found.');
            return;
        }

        let chat = context.chat;
        if (!chat && typeof context.getChat === 'function') chat = context.getChat();
        if (!chat) {
            console.error('❌ Delete After Here: Chat array not found.');
            return;
        }

        const index = chat.findIndex(msg => msg.id === messageId);
        if (index === -1) {
            console.error(`❌ Delete After Here: Message ID ${messageId} not found.`);
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
        console.log('✅ Delete After Here: Deletion complete.');
    }

    function addDeleteOptionToMenu(menu, messageId) {
        if (!menu) {
            console.warn('⚠️ Delete After Here: Menu is null.');
            return false;
        }
        if (menu.querySelector('.delete-after-here-item')) {
            console.log('ℹ️ Delete After Here: Option already exists.');
            return false;
        }

        const li = document.createElement('li');
        li.className = 'delete-after-here-item';
        const a = document.createElement('a');
        a.href = '#';
        a.textContent = '🗑️ Delete all after this';
        a.style.cursor = 'pointer';
        a.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            deleteAfter(messageId);
            const dropdown = menu.closest('.dropdown');
            if (dropdown) {
                const toggle = dropdown.querySelector('[data-toggle="dropdown"]');
                if (toggle) toggle.click();
            }
        });
        li.appendChild(a);
        menu.appendChild(li);
        console.log(`✅ Delete After Here: Option added to menu for message ${messageId}`);
        return true;
    }

    function processMessage(messageElement) {
        const messageId = messageElement.dataset.messageId;
        if (!messageId) {
            console.warn('⚠️ Delete After Here: Message has no dataset.messageId.', messageElement);
            return;
        }

        const toggleBtn = messageElement.querySelector('[data-toggle="dropdown"]');
        if (!toggleBtn) {
            console.warn(`⚠️ Delete After Here: No [data-toggle="dropdown"] found for message ${messageId}. Checking other selectors...`);
            // Debug: Log all buttons inside the message
            const allButtons = messageElement.querySelectorAll('button, a, [role="button"]');
            console.log('Buttons found:', allButtons);
            return;
        }

        const dropdown = toggleBtn.closest('.dropdown');
        if (!dropdown) {
            console.warn(`⚠️ Delete After Here: .dropdown parent not found for message ${messageId}`);
            return;
        }

        if (dropdown.dataset.deleteAfterHereHook === 'true') {
            return; // Already hooked
        }
        dropdown.dataset.deleteAfterHereHook = 'true';

        toggleBtn.addEventListener('click', function(e) {
            console.log(`🖱️ Delete After Here: Toggle clicked for message ${messageId}`);
            setTimeout(() => {
                const menu = dropdown.querySelector('.dropdown-menu');
                if (menu && dropdown.classList.contains('show')) {
                    addDeleteOptionToMenu(menu, messageId);
                } else {
                    console.warn('⚠️ Delete After Here: Menu not found or dropdown not open. Menu:', menu, 'Show class:', dropdown.classList.contains('show'));
                    // Try to find the menu anyway
                    const anyMenu = dropdown.querySelector('.dropdown-menu');
                    if (anyMenu) {
                        console.log('🔍 Found menu anyway, attempting to add option.');
                        addDeleteOptionToMenu(anyMenu, messageId);
                    }
                }
            }, 100); // Increased delay to ensure menu renders
        });

        console.log(`✅ Delete After Here: Toggle hooked for message ${messageId}`);
    }

    function scanAndProcess() {
        const chatContainer = document.getElementById('chat');
        if (!chatContainer) {
            console.warn('❌ Delete After Here: #chat container not found in DOM.');
            return false;
        }
        console.log('✅ Delete After Here: #chat container found.');

        const messages = chatContainer.querySelectorAll('.mes');
        console.log(`📊 Delete After Here: Found ${messages.length} messages with class '.mes'.`);

        if (messages.length === 0) {
            // Let's see what IS inside #chat
            console.log('🔍 Content of #chat:', chatContainer.innerHTML.substring(0, 500) + '...');
        }

        messages.forEach(processMessage);

        // Watch for new messages
        const observer = new MutationObserver(() => {
            chatContainer.querySelectorAll('.mes').forEach(msg => {
                const toggle = msg.querySelector('[data-toggle="dropdown"]');
                if (toggle) {
                    const dropdown = toggle.closest('.dropdown');
                    if (dropdown && dropdown.dataset.deleteAfterHereHook !== 'true') {
                        processMessage(msg);
                    }
                }
            });
        });

        observer.observe(chatContainer, { childList: true, subtree: true });
        console.log('👀 Delete After Here: MutationObserver started.');
        return true;
    }

    // Retry logic
    let attempts = 0;
    function init() {
        attempts++;
        if (document.getElementById('chat')) {
            scanAndProcess();
        } else {
            if (attempts < 15) {
                console.log(`⏳ Delete After Here: Waiting for #chat... (attempt ${attempts})`);
                setTimeout(init, 500);
            } else {
                console.error('❌ Delete After Here: #chat never appeared.');
            }
        }
    }

    // Start the script
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }

    document.addEventListener('SillyTavernReady', () => {
        console.log('🎉 Delete After Here: SillyTavernReady event fired.');
        setTimeout(init, 300);
    });

})();
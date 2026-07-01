(function() {
    'use strict';

    console.log('🔍 Delete After Here: Debug mode – searching for deletion functions...');

    function getContext() {
        return window.SillyTavern ? SillyTavern.getContext() : null;
    }

    const context = getContext();
    if (!context) {
        console.error('❌ Context not found.');
        return;
    }

    // Search for functions containing "delete" or "remove" (case-insensitive)
    const deleteFuncsOnWindow = Object.keys(window)
        .filter(k => typeof window[k] === 'function' && /delete|remove/i.test(k))
        .sort();
    const deleteFuncsOnContext = Object.keys(context)
        .filter(k => typeof context[k] === 'function' && /delete|remove/i.test(k))
        .sort();

    console.log('🔍 Functions containing "delete" or "remove" on window:', deleteFuncsOnWindow);
    console.log('🔍 Functions containing "delete" or "remove" on context:', deleteFuncsOnContext);

    // Also check for any property that might be the chat module
    const chatModuleKeys = Object.keys(context).filter(k => /chat/i.test(k) && typeof context[k] === 'object');
    console.log('🔍 Properties on context that look like chat modules:', chatModuleKeys);

    // If there is a chat module, inspect its functions
    chatModuleKeys.forEach(key => {
        const mod = context[key];
        if (mod && typeof mod === 'object') {
            const funcs = Object.keys(mod).filter(k => typeof mod[k] === 'function' && /delete|remove/i.test(k));
            if (funcs.length) {
                console.log(`🔍 Functions on context.${key} containing "delete"/"remove":`, funcs);
            }
        }
    });

    // Also check for any global object named "chats" or "chat"
    if (window.chats) {
        const chatFuncs = Object.keys(window.chats).filter(k => typeof window.chats[k] === 'function' && /delete|remove/i.test(k));
        console.log('🔍 Functions on window.chats containing "delete"/"remove":', chatFuncs);
    }

    console.log('✅ Debug complete. Please report the output above.');
})();
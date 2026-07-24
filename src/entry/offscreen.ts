// Offscreen document for playing audio files
// This is needed because content scripts can't play audio from remote URLs
// due to the page's CSP restrictions.

let currentAudio: HTMLAudioElement | null = null;

chrome.runtime.onMessage.addListener((message: { type: string; url?: string }) => {
    if (message.type === 'playAudio' && message.url) {
        console.log('[Zhongwen] Playing audio offscreen', message)
        // Stop any currently playing audio
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }

        currentAudio = new Audio(message.url);
        currentAudio.play().catch(err => {
            console.warn('[Zhongwen offscreen] Failed to play audio:', err);
        });
    }

    if (message.type === 'stopAudio') {
        console.log('[Zhongwen] Stopping audio offscreen', message)
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
    }
});

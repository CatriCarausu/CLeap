document.querySelector('#go-to-options').addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
    } else {
        window.open(chrome.runtime.getURL('options.html'));
    }
});

function save_options_visualizer() {
    var visualizerMode = document.getElementById('visualizer-mode').checked;

    chrome.storage.sync.set({

        enableVisualizer: visualizerMode

    }, () => {
        
        console.log('enable viz');
    });
}

function save_options_gestures() {
    var gestureMode = document.getElementById('gesture-mode').checked;
    
    chrome.storage.sync.set({
    
        enableGesture: gestureMode
    
    }, () => {
        console.log('enable gesture');
    });
}

function restore_options() {

    chrome.storage.sync.get({
        enableGesture: true, 
        enableVisualizer: true
    }, function(items) {
        document.getElementById('gesture-mode').checked = items.enableGesture;
        document.getElementById('visualizer-mode').checked = items.enableVisualizer;
    });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('visualizer-mode').addEventListener('click', save_options_visualizer);
document.getElementById('gesture-mode').addEventListener('click', save_options_gestures);
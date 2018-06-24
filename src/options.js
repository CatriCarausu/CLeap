
function save_options() {
  var urlInputValue = document.getElementById('url-input').value;
  
  chrome.storage.sync.set({
    openTabUrl: urlInputValue
  }, () => {
   
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';

    setTimeout(() => {
      status.textContent = '';
    }, 900);
  });
}

function restore_options() {
  chrome.storage.sync.get({
    openTabUrl: 'www.youtube.com'
  }, (items) => {
    
    if (document.getElementById('url-input')) {
      document.getElementById('url-input').value = items.openTabUrl;
    }
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save') && document.getElementById('save').addEventListener('click', save_options);
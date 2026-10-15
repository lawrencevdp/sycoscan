const b = document.getElementById("backend"), a = document.getElementById("auto");
chrome.storage.sync.get({ backend: "http://localhost:8000", auto: false }, (s) => { b.value = s.backend; a.checked = s.auto; });
b.onchange = () => chrome.storage.sync.set({ backend: b.value });
a.onchange = () => chrome.storage.sync.set({ auto: a.checked });

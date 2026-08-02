// sw-cleanup.js — ç'regjistron çdo Service Worker të vjetër dhe pastron
// arkivat e tij. I padëmshëm nëse s'ka asnjë; vdekjeprurës për SW "zombie"
// që servirin versione të vjetra të aplikacionit.
(function () {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      var kishte = regs.length > 0;

      regs.forEach(function (reg) {
        reg.unregister();
      });

      if (kishte && window.caches) {
        caches.keys().then(function (keys) {
          return Promise.all(keys.map(function (k) { return caches.delete(k); }));
        }).then(function () {
          // Rifreskim një herë që faqja të vijë nga rrjeti, jo nga SW i vdekur
          if (!sessionStorage.getItem("__sw_cleaned")) {
            sessionStorage.setItem("__sw_cleaned", "1");
            location.reload();
          }
        });
      }
    }).catch(function () {});
  }
})();
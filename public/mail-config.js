/** Aucun secret : le pilote Gmail local est accessible seulement depuis cet ordinateur. */
window.ATELIER_MAIL_SERVICE_URL = ["127.0.0.1","localhost"].includes(location.hostname) ? "http://127.0.0.1:8787" : "";

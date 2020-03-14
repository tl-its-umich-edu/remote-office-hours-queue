function notifyWithElement(selector) {
    const elem = document.querySelector(selector);
    if (!!elem) {
        new Notification(elem.innerText);
    }
}

function requestNotify() {
    if (Notification.permission === "denied") {
        return;
    } else if (Notification.permission === "default") {
        Notification.requestPermission();
    }
}

function notify() {
    notifyWithElement('#turn-soon');
    notifyWithElement('#turn-now');
}

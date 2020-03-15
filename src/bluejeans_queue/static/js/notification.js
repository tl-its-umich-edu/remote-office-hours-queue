function clearLastNotification() {
    window.localStorage.setItem(location.href, '');
}

function getLastNotification() {
    const url = location.href;
    const stored = window.localStorage.getItem(url);
    if (!stored) return undefined;
    parsed = JSON.parse(stored);
    parsed.timestamp = new Date(parsed.timestamp);
    return parsed;
}

function setLastNotification(type) {
    const url = location.href;
    const n = {
        timestamp: new Date(),
        type: type,
    };
    window.localStorage.setItem(url, JSON.stringify(n));
}

function isNotificationRepeat(type) {
    const last = getLastNotification();
    if (!last) return false;
    const now = new Date();
    return last.type === type
        && new Date(last.timestamp.getTime() + 60 * 60 * 1000) > now;
}

function notifyWithElement(selector) {
    const elem = document.querySelector(selector);
    if (!elem) {
        console.log('selector not found: ' + selector);
        return;
    }
    if (isNotificationRepeat(selector)) {
        console.log('notification is a repeat for ' + selector);
        return;
    }
    // new Notification(elem.innerText);
    alert(elem.innerText);
    setLastNotification(selector);
}

function requestNotify() {
    if (Notification.permission === "denied") {
        return;
    } else if (Notification.permission === "default") {
        Notification.requestPermission();
    }
    document.querySelector('#enablenotifications').remove();
}

function notify() {
    notifyWithElement('#turn-soon');
    notifyWithElement('#turn-now');
}

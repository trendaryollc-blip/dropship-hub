// Firebase Cloud Messaging Service Worker
// This file handles push notifications in the background

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCwM2fYDcEWqGT2iqxpO-cyrCQek760Ez0",
  authDomain: "dropship-hub-61ff0.firebaseapp.com",
  projectId: "dropship-hub-61ff0",
  storageBucket: "dropship-hub-61ff0.firebasestorage.app",
  messagingSenderId: "377423864635",
  appId: "1:377423864635:web:c348d4f47b42fbc0a38d1e",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon, image, url } = payload.notification || {};

  const notificationOptions = {
    body: body || "You have a new intelligence digest",
    icon: icon || "/icon-192x192.png",
    image: image || undefined,
    badge: "/badge-72x72.png",
    tag: "daily-digest",
    renotify: true,
    data: { url: url || "/dashboard" },
    actions: [
      { action: "open", title: "View Digest" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  self.registration.showNotification(title || "DropShip Hub", notificationOptions);
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

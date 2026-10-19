
"use strict";

const CACHE_NAME = "imfundo-quest-v1";

const APP_FILES = [
    "./",
    "index.html",
    "./learner.html",
    "./teacher.html",
    "./lessons.html",
    "./manifest.json",

    "./css/style.css",

    "./js/app.js",
    "./js/lessons.js",
    "./js/quizzes.js",
    "./js/progress.js",
    "./js/teacher.js",
    "./js/storage.js",

    "./data/mathematics.json",
    "./data/physical-sciences.json",
    "./data/life-sciences.json"
];

// 1. Install the service worker and cache the app files.
self.addEventListener("install", function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function (cache) {
                return cache.addAll(APP_FILES);
            })
            .then(function () {
                return self.skipWaiting();
            })
            .catch(function (error) {
                console.error("Failed to cache app files:", error);
                throw error;
            })
    );
});

// 2. Activate the new service worker and remove old caches.
self.addEventListener("activate", function (event) {
    event.waitUntil(
        caches.keys()
            .then(function (cacheNames) {
                return Promise.all(
                    cacheNames
                        .filter(function (cacheName) {
                            return (
                                cacheName.startsWith("imfundo-quest-") &&
                                cacheName !== CACHE_NAME
                            );
                        })
                        .map(function (cacheName) {
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(function () {
                return self.clients.claim();
            })
    );
});

// 3. Serve cached files when offline.
self.addEventListener("fetch", function (event) {
    const request = event.request;

    // Only handle GET requests from the same origin.
    if (
        request.method !== "GET" ||
        new URL(request.url).origin !== self.location.origin
    ) {
        return;
    }

    // For HTML pages, try the network first so updates can be received.
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then(function (response) {
                    if (response.ok) {
                        const copy = response.clone();

                        caches.open(CACHE_NAME)
                            .then(function (cache) {
                                cache.put(request, copy);
                            });
                    }

                    return response;
                })
                .catch(async function () {
                    const cachedPage = await caches.match(request);

                    return cachedPage ||
                        await caches.match("./index.html");
                })
        );

        return;
    }

    // For CSS, JavaScript, JSON and other files, use the cache first.
    event.respondWith(
        caches.match(request)
            .then(function (cachedResponse) {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(request)
                    .then(function (response) {
                        if (
                            response.ok &&
                            response.type === "basic"
                        ) {
                            const copy = response.clone();

                            caches.open(CACHE_NAME)
                                .then(function (cache) {
                                    cache.put(request, copy);
                                });
                        }

                        return response;
                    });
            })
    );
});

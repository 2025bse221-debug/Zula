import { supabase } from "./supabaseClient.js";


// ==========================================
// ELEMENTS
// ==========================================

const eventsGrid = document.getElementById("eventsGrid");

const searchForm = document.getElementById("eventSearchForm");
const searchInput = document.getElementById("eventSearch");
const searchMessage = document.getElementById("searchMessage");
const clearSearchButton = document.getElementById("clearSearch");

const notificationButton = document.getElementById("notificationButton");
const notificationPanel = document.getElementById("notificationPanel");
const notificationBadge = document.getElementById("notificationBadge");
const notificationCount = document.getElementById("notificationCount");
const notificationList = document.getElementById("notificationList");
const markAllReadButton = document.getElementById("markAllReadButton");


// ==========================================
// VARIABLES
// ==========================================

let publishedEvents = [];

let currentUser = null;

let notifications = [];


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHTML(value = "") {

    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);

}


// ==========================================
// FORMAT EVENT DATE
// ==========================================

function formatDate(dateString) {

    if (!dateString) return "Date not available";

    const date = new Date(`${dateString}T00:00:00`);

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });

}


// ==========================================
// FORMAT EVENT TIME
// ==========================================

function formatTime(timeString) {

    if (!timeString) return "";

    const [hours, minutes] = timeString.split(":");

    const date = new Date();

    date.setHours(Number(hours), Number(minutes), 0, 0);

    return date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });

}


// ==========================================
// DISPLAY EVENTS
// ==========================================

function displayEvents(events) {

    if (events.length === 0) {

        eventsGrid.innerHTML = `
            <div class="no-events">
                <h3>No events found</h3>

                <p>
                    There are currently no published events
                    matching your search.
                </p>
            </div>
        `;

        searchMessage.textContent = publishedEvents.length === 0
            ? "No published events are available yet."
            : "No matching events found. Try another search.";

        return;

    }


    eventsGrid.innerHTML = events.map(event => {

        const title = escapeHTML(event.title);
        const description = escapeHTML(event.description);
        const category = escapeHTML(event.category);
        const venue = escapeHTML(event.venue);

        const date = escapeHTML(formatDate(event.event_date));

        const startTime = escapeHTML(formatTime(event.start_time));
        const endTime = escapeHTML(formatTime(event.end_time));


        const image = event.image_url
            ? `
                <img
                    class="event-poster"
                    src="${escapeHTML(event.image_url)}"
                    alt="${title} poster"
                    loading="lazy"
                    onerror="this.style.display='none'"
                >
            `
            : `<div class="event-image">🎓</div>`;


        return `
            <article class="event-card">

                ${image}

                <div class="event-content">

                    <span class="event-category">
                        ${category}
                    </span>

                    <h3>${title}</h3>

                    <p>${description}</p>

                    <div class="event-details">

                        <span>📅 Date: ${date}</span>

                        <span>
                            🕒 Time: ${startTime} - ${endTime}
                        </span>

                        <span>📍 Venue: ${venue}</span>

                    </div>

                </div>

            </article>
        `;

    }).join("");


    searchMessage.textContent =
        `Showing ${events.length} published event(s).`;

}


// ==========================================
// LOAD PUBLISHED EVENTS
// ==========================================

async function loadPublishedEvents() {

    eventsGrid.innerHTML = `
        <p class="loading-events">
            Loading published events...
        </p>
    `;


    const { data, error } = await supabase

        .from("events")

        .select(`
            id,
            title,
            description,
            category,
            event_date,
            start_time,
            end_time,
            venue,
            image_url,
            status
        `)

        .eq("status", "published")

        .order("event_date", {
            ascending: true
        });


    if (error) {

        console.error("Error loading published events:", error);

        eventsGrid.innerHTML = `
            <div class="no-events">
                <h3>Unable to load events</h3>

                <p>
                    Please refresh the page and try again.
                </p>
            </div>
        `;

        searchMessage.textContent =
            "Could not load events from the server.";

        return;

    }


    publishedEvents = data || [];

    displayEvents(publishedEvents);

}


// ==========================================
// SEARCH EVENTS
// ==========================================

function searchEvents() {

    const query = searchInput.value.trim().toLowerCase();


    const filteredEvents = publishedEvents.filter(event => {

        return [

            event.title,
            event.description,
            event.category,
            event.venue

        ].some(value =>

            String(value || "")
                .toLowerCase()
                .includes(query)

        );

    });


    displayEvents(filteredEvents);

}


// ==========================================
// SEARCH EVENT LISTENERS
// ==========================================

searchForm.addEventListener("submit", event => {

    event.preventDefault();

    searchEvents();

    document.getElementById("upcoming-events").scrollIntoView({
        behavior: "smooth"
    });

});


searchInput.addEventListener("input", searchEvents);


clearSearchButton.addEventListener("click", () => {

    searchInput.value = "";

    searchEvents();

    searchInput.focus();

});


// ==========================================
// GET SIGNED-IN STUDENT
// ==========================================

async function getCurrentStudent() {

    const { data, error } = await supabase.auth.getUser();

    if (error) {

        console.error("Unable to get signed-in student:", error);

        return null;

    }

    return data.user;

}


// ==========================================
// FORMAT NOTIFICATION DATE
// ==========================================

function formatNotificationDate(dateString) {

    if (!dateString) return "";

    const date = new Date(dateString);

    return date.toLocaleString("en-GB", {

        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"

    });

}


// ==========================================
// UPDATE UNREAD NOTIFICATION BADGE
// ==========================================

function updateNotificationBadge() {

    const unreadCount = notifications.filter(
        notification => !notification.is_read
    ).length;


    notificationBadge.textContent =
        unreadCount > 99 ? "99+" : unreadCount;


    notificationBadge.hidden = unreadCount === 0;


    notificationCount.textContent = unreadCount === 0
        ? "You are all caught up"
        : `${unreadCount} unread notification(s)`;


    markAllReadButton.hidden = unreadCount === 0;

}


// ==========================================
// DISPLAY NOTIFICATIONS
// ==========================================

function displayNotifications() {

    updateNotificationBadge();


    if (notifications.length === 0) {

        notificationList.innerHTML = `
            <div class="empty-notifications">

                <span>🔔</span>

                <h4>No notifications yet</h4>

                <p>
                    Notifications about published university
                    events will appear here.
                </p>

            </div>
        `;

        return;

    }


    notificationList.innerHTML = notifications.map(notification => {

        const title = escapeHTML(notification.title);

        const message = escapeHTML(notification.message);

        const date = escapeHTML(
            formatNotificationDate(notification.created_at)
        );


        return `

            <div
                class="notification-item ${notification.is_read ? "read" : "unread"}"
                data-id="${escapeHTML(notification.id)}"
            >

                <div class="notification-item-content">

                    <div class="notification-item-heading">

                        <h4>${title}</h4>

                        ${
                            notification.is_read
                                ? ""
                                : '<span class="unread-dot"></span>'
                        }

                    </div>

                    <p>${message}</p>

                    <small>${date}</small>

                </div>

                ${
                    notification.is_read
                        ? ""
                        : `
                            <button
                                type="button"
                                class="mark-read-button"
                                data-id="${escapeHTML(notification.id)}"
                            >
                                Mark as read
                            </button>
                        `
                }

            </div>

        `;

    }).join("");

}


// ==========================================
// LOAD STUDENT NOTIFICATIONS
// ==========================================

async function loadNotifications() {

    if (!currentUser) {

        notificationList.innerHTML = `
            <p class="notification-loading">
                Please sign in to view notifications.
            </p>
        `;

        return;

    }


    notificationList.innerHTML = `
        <p class="notification-loading">
            Loading notifications...
        </p>
    `;


    const { data, error } = await supabase

        .from("notifications")

        .select(`
            id,
            user_id,
            title,
            message,
            event_id,
            is_read,
            created_at
        `)

        .eq("user_id", currentUser.id)

        .order("created_at", {
            ascending: false
        });


    if (error) {

        console.error("Error loading notifications:", error);

        notificationList.innerHTML = `
            <p class="notification-error">
                Unable to load notifications.
                Please try again.
            </p>
        `;

        return;

    }


    notifications = data || [];

    displayNotifications();

}


// ==========================================
// OPEN AND CLOSE NOTIFICATION PANEL
// ==========================================

notificationButton.addEventListener("click", async () => {

    const isOpen = !notificationPanel.hidden;


    if (isOpen) {

        notificationPanel.hidden = true;

        notificationButton.setAttribute("aria-expanded", "false");

    } else {

        notificationPanel.hidden = false;

        notificationButton.setAttribute("aria-expanded", "true");

        await loadNotifications();

    }

});


// Close panel when clicking outside it.

document.addEventListener("click", event => {

    if (!event.target.closest(".notification-wrapper")) {

        notificationPanel.hidden = true;

        notificationButton.setAttribute("aria-expanded", "false");

    }

});


// Close panel using Escape key.

document.addEventListener("keydown", event => {

    if (event.key === "Escape") {

        notificationPanel.hidden = true;

        notificationButton.setAttribute("aria-expanded", "false");

    }

});


// ==========================================
// MARK INDIVIDUAL NOTIFICATION AS READ
// ==========================================

notificationList.addEventListener("click", async event => {

    const button = event.target.closest(".mark-read-button");

    if (!button) return;


    const notificationId = button.dataset.id;


    const { error } = await supabase

        .from("notifications")

        .update({
            is_read: true
        })

        .eq("id", notificationId)

        .eq("user_id", currentUser.id);


    if (error) {

        console.error("Unable to mark notification as read:", error);

        alert("Unable to update notification. Please try again.");

        return;

    }


    await loadNotifications();

});


// ==========================================
// MARK ALL NOTIFICATIONS AS READ
// ==========================================

markAllReadButton.addEventListener("click", async () => {

    if (!currentUser) return;


    const { error } = await supabase

        .from("notifications")

        .update({
            is_read: true
        })

        .eq("user_id", currentUser.id)

        .eq("is_read", false);


    if (error) {

        console.error("Unable to mark all notifications as read:", error);

        alert("Unable to update notifications. Please try again.");

        return;

    }


    await loadNotifications();

});


// ==========================================
// INITIALIZE STUDENT DASHBOARD
// ==========================================

async function initializeDashboard() {

    currentUser = await getCurrentStudent();


    // Load published events.

    await loadPublishedEvents();


    // Load notifications belonging to this student.

    await loadNotifications();

}


// Start dashboard.

initializeDashboard();
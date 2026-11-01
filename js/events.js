import { supabase } from "./supabaseClient.js";

// ==========================================
// 1. GET HTML ELEMENTS
// ==========================================

const eventsGrid = document.getElementById("eventsGrid");
const searchInput = document.getElementById("searchInput");
const noResults = document.getElementById("noResults");
const noResultsMessage = document.getElementById("noResultsMessage");

const categoryTitle = document.getElementById("categoryTitle");
const categoryDescription = document.getElementById("categoryDescription");
const categoryImage = document.getElementById("categoryImage");

const eventsHeading = document.getElementById("eventsHeading");
const searchDescription = document.getElementById("searchDescription");

const eventDialog = document.getElementById("eventDialog");

// ==========================================
// 2. VARIABLES
// ==========================================

let allEvents = [];
let selectedCategory = "all";

// ==========================================
// 3. CATEGORY INFORMATION
// ==========================================

const categories = {

    Association: {
        title: "Association Events",
        description: "Explore student association meetings, elections, celebrations, and activities.",
        image: "images/associations.jpg"
    },

    Administration: {
        title: "University Administration Events",
        description: "Discover official ceremonies, orientations, and university-wide meetings.",
        image: "images/administration.jpg"
    },

    Sports: {
        title: "Games & Sports",
        description: "Explore football, basketball, athletics, and other sporting activities.",
        image: "images/games.jpg"
    },

    Academic: {
        title: "Academic Events",
        description: "Discover workshops, guest lectures, research presentations, and conferences.",
        image: "images/academic.jpg"
    },

    CITT: {
        title: "CITT Events",
        description: "Explore technology workshops, exhibitions, and other CITT activities.",
        image: "images/citt.jpg"
    },

    Other: {
        title: "Other University Events",
        description: "Discover cultural festivals, entertainment, and other university activities.",
        image: "images/others.jpg"
    }

};

// ==========================================
// 4. DATABASE CATEGORY MAPPING
// ==========================================

const categoryAliases = {

    "association": [
        "association",
        "association events"
    ],

    "administration": [
        "administration",
        "administration events",
        "university administration events"
    ],

    "sports": [
        "sports",
        "games & sports",
        "games and sports"
    ],

    "academic": [
        "academic",
        "academic events"
    ],

    "citt": [
        "citt",
        "citt events"
    ],

    "other": [
        "other",
        "other events"
    ]

};

// ==========================================
// 5. NORMALIZE CATEGORY NAMES
// ==========================================

function normalizeCategory(category) {

    return String(category || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

}

// ==========================================
// 6. READ CATEGORY FROM URL
// ==========================================

function readCategoryFromURL() {

    const parameters = new URLSearchParams(window.location.search);

    const category = parameters.get("category");

    if (!category) {
        return "all";
    }

    const normalized = normalizeCategory(category);

    const matchingCategory = Object.keys(categories).find(key => {

        return normalizeCategory(key) === normalized;

    });

    return matchingCategory || "all";

}

selectedCategory = readCategoryFromURL();

// ==========================================
// 7. FORMAT DATE
// ==========================================

function formatDate(date) {

    if (!date) {
        return "To be announced";
    }

    const formatted = new Date(date + "T00:00:00");

    return formatted.toLocaleDateString("en-GB", {

        day: "numeric",
        month: "long",
        year: "numeric"

    });

}

// ==========================================
// 8. FORMAT TIME
// ==========================================

function formatTime(time) {

    if (!time) {
        return "To be announced";
    }

    const parts = time.split(":");

    const hours = Number(parts[0]);
    const minutes = parts[1];

    const period = hours >= 12 ? "PM" : "AM";

    const displayHours = hours % 12 || 12;

    return `${displayHours}:${minutes} ${period}`;

}

// ==========================================
// 9. CHECK REGISTRATION URL
// ==========================================

function isValidRegistrationUrl(value) {

    if (!value) {
        return false;
    }

    try {

        const url = new URL(value);

        return url.protocol === "https:" ||
               url.protocol === "http:";

    } catch {

        return false;

    }

}

// ==========================================
// 10. DISPLAY CATEGORY INFORMATION
// ==========================================

function displayCategory() {

    const category = categories[selectedCategory];

    if (category) {

        categoryTitle.textContent = category.title;

        categoryDescription.textContent = category.description;

        eventsHeading.textContent = category.title;

        categoryImage.src = category.image;

        categoryImage.alt = category.title;

        searchDescription.textContent =
            `Search for ${category.title.toLowerCase()} within this category.`;

        noResultsMessage.textContent =
            `There are currently no published ${category.title.toLowerCase()} available.`;

    } else {

        categoryTitle.textContent = "All University Events";

        categoryDescription.textContent =
            "Discover activities and events happening at MUST.";

        eventsHeading.textContent = "All University Events";

        categoryImage.src = "images/categories/events-hero.jpg";

        categoryImage.alt = "University activities";

        searchDescription.textContent =
            "Search all published university events.";

        noResultsMessage.textContent =
            "There are currently no published university events.";

    }

    displayEvents();

}

// ==========================================
// 11. LOAD PUBLISHED EVENTS FROM SUPABASE
// ==========================================

async function loadEvents() {

    eventsGrid.innerHTML = `
        <p class="loading-events">
            Loading university events...
        </p>
    `;

    noResults.hidden = true;

    try {

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
                registration_url,
                status
            `)

            .eq("status", "published")

            .order("event_date", { ascending: true });

        if (error) {
            throw error;
        }

        allEvents = data || [];

        console.log("Published events loaded:", allEvents);

        displayCategory();

    } catch (error) {

        console.error("Error loading events:", error);

        eventsGrid.innerHTML = `
            <div class="no-results">
                <h3>Unable to load events</h3>
                <p>
                    Please check your internet connection and try again.
                </p>
            </div>
        `;

    }

}

// ==========================================
// 12. CHECK CATEGORY MATCH
// ==========================================

function matchesSelectedCategory(eventCategory) {

    if (selectedCategory === "all") {
        return true;
    }

    const selected = normalizeCategory(selectedCategory);

    const actualCategory = normalizeCategory(eventCategory);

    const allowedCategories = categoryAliases[selected] || [selected];

    return allowedCategories.includes(actualCategory);

}

// ==========================================
// 13. CREATE REGISTRATION BUTTON
// ==========================================

function createRegistrationButton(registrationUrl) {

    if (!isValidRegistrationUrl(registrationUrl)) {
        return null;
    }

    const registerButton = document.createElement("a");

    registerButton.className = "primary-button register-button";

    registerButton.textContent = "Register for Event";

    registerButton.href = registrationUrl;

    registerButton.target = "_blank";

    registerButton.rel = "noopener noreferrer";

    return registerButton;

}

// ==========================================
// 14. DISPLAY EVENTS
// ==========================================

function displayEvents() {

    eventsGrid.innerHTML = "";

    noResults.hidden = true;

    const searchText = searchInput.value
        .toLowerCase()
        .trim();

    const filteredEvents = allEvents.filter(event => {

        const matchesCategory = matchesSelectedCategory(event.category);

        const matchesSearch = [

            event.title,
            event.description,
            event.category,
            event.venue

        ].some(value =>

            String(value || "")
                .toLowerCase()
                .includes(searchText)

        );

        return matchesCategory && matchesSearch;

    });

    console.log("Selected category:", selectedCategory);

    console.log("Filtered events:", filteredEvents);

    // ======================================
    // NO MATCHING EVENTS
    // ======================================

    if (filteredEvents.length === 0) {

        noResults.hidden = false;

        return;

    }

    // ======================================
    // CREATE EVENT CARDS
    // ======================================

    filteredEvents.forEach(event => {

        const card = document.createElement("article");

        card.className = "event-card";

        // EVENT IMAGE

        const banner = document.createElement("div");

        banner.className = "event-banner";

        if (event.image_url) {

            const image = document.createElement("img");

            image.src = event.image_url;

            image.alt = event.title || "University event";

            image.loading = "lazy";

            image.onerror = function () {

                this.style.display = "none";

            };

            banner.appendChild(image);

        }

        card.appendChild(banner);

        // EVENT CONTENT

        const content = document.createElement("div");

        content.className = "event-content";

        const tag = document.createElement("span");

        tag.className = "event-tag";

        tag.textContent = event.category;

        const title = document.createElement("h3");

        title.textContent = event.title;

        const description = document.createElement("p");

        description.textContent =
            event.description || "No description available.";

        // EVENT DETAILS

        const meta = document.createElement("div");

        meta.className = "event-meta";

        const date = document.createElement("p");

        date.textContent =
            "Date: " + formatDate(event.event_date);

        const time = document.createElement("p");

        let timeText = formatTime(event.start_time);

        if (event.end_time) {

            timeText += " - " + formatTime(event.end_time);

        }

        time.textContent = "Time: " + timeText;

        const venue = document.createElement("p");

        venue.textContent =
            "Venue: " + (event.venue || "To be announced");

        meta.append(date, time, venue);

        // VIEW DETAILS BUTTON

        const button = document.createElement("button");

        button.className = "primary-button";

        button.type = "button";

        button.textContent = "View Details";

        button.addEventListener("click", function () {

            showDetails(event);

        });

        content.append(

            tag,
            title,
            description,
            meta,
            button

        );

        // OPTIONAL REGISTRATION BUTTON

        const registerButton = createRegistrationButton(
            event.registration_url
        );

        if (registerButton) {

            content.appendChild(registerButton);

        }

        card.appendChild(content);

        eventsGrid.appendChild(card);

    });

}

// ==========================================
// 15. SHOW EVENT DETAILS
// ==========================================

function showDetails(event) {

    document.getElementById("detailCategory").textContent =
        event.category;

    document.getElementById("detailTitle").textContent =
        event.title;

    document.getElementById("detailDescription").textContent =
        event.description || "No description available.";

    document.getElementById("detailDate").textContent =
        "Date: " + formatDate(event.event_date);

    let timeText = formatTime(event.start_time);

    if (event.end_time) {

        timeText += " - " + formatTime(event.end_time);

    }

    document.getElementById("detailTime").textContent =
        "Time: " + timeText;

    document.getElementById("detailVenue").textContent =
        "Venue: " + (event.venue || "To be announced");

    document.getElementById("detailOrganizer").textContent =
        "Event ID: " + event.id;

    // OPTIONAL REGISTRATION BUTTON IN DETAILS POPUP

    let detailRegisterButton = document.getElementById(
        "detailRegistrationLink"
    );

    // Create the button if it does not already exist.
    if (!detailRegisterButton) {

        detailRegisterButton = document.createElement("a");

        detailRegisterButton.id = "detailRegistrationLink";

        detailRegisterButton.className =
            "primary-button register-button";

        detailRegisterButton.textContent = "Register for Event";

        detailRegisterButton.target = "_blank";

        detailRegisterButton.rel = "noopener noreferrer";

        eventDialog.appendChild(detailRegisterButton);

    }

    if (isValidRegistrationUrl(event.registration_url)) {

        detailRegisterButton.href = event.registration_url;

        detailRegisterButton.hidden = false;

    } else {

        detailRegisterButton.removeAttribute("href");

        detailRegisterButton.hidden = true;

    }

    eventDialog.showModal();

}

// ==========================================
// 16. CLOSE EVENT DETAILS
// ==========================================

function closeDetails() {

    eventDialog.close();

}

// ==========================================
// 17. SEARCH EVENTS
// ==========================================

searchInput.addEventListener("input", function () {

    displayEvents();

});

// ==========================================
// 18. BROWSER BACK AND FORWARD BUTTONS
// ==========================================

window.addEventListener("popstate", function () {

    selectedCategory = readCategoryFromURL();

    searchInput.value = "";

    displayCategory();

});

// ==========================================
// 19. EXPOSE CLOSE FUNCTION TO HTML
// ==========================================

window.closeDetails = closeDetails;

// ==========================================
// 20. START THE PAGE
// ==========================================

loadEvents();
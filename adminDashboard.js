import { supabase } from "./supabaseClient.js";


// ==========================================
// ELEMENTS AND VARIABLES
// ==========================================

const eventTableBody = document.getElementById("eventTableBody");

const eventDialog = document.getElementById("eventDialog");
const eventForm = document.getElementById("eventForm");

const messageDialog = document.getElementById("messageDialog");

let events = [];
let currentAdmin = null;
let editingEventId = null;


const categories = [
    "Association Events",
    "University Administration Events",
    "Games & Sports",
    "Academic Events",
    "CITT Events",
    "Other University Events"
];


// ==========================================
// INITIALIZE DASHBOARD
// ==========================================

async function initializeDashboard() {

    try {

        const {
            data: { user },
            error: authError
        } = await supabase.auth.getUser();

        if (authError || !user) {
            window.location.href = "signin.html";
            return;
        }

        currentAdmin = user;

        const { data: profile, error } = await supabase
            .from("profiles")
            .select("full_name, role")
            .eq("id", user.id)
            .single();

        if (error) throw error;

        if (profile.role !== "admin") {

            alert("You are not authorized to access this dashboard.");

            window.location.href = "signin.html";
            return;
        }

        document.getElementById("adminName").textContent =
            profile.full_name || "Admin";

        await loadDashboardData();

    } catch (error) {

        console.error("Dashboard initialization error:", error);

        alert("Unable to load administrator dashboard: " + error.message);

    }

}


// ==========================================
// LOAD DASHBOARD DATA
// ==========================================

async function loadDashboardData() {

    await Promise.all([
        loadEvents(),
        loadUserStatistics(),
        loadManagerRequests()
    ]);

}


// ==========================================
// LOAD EVENTS
// ==========================================

async function loadEvents() {

    eventTableBody.innerHTML = `
        <tr><td colspan="5">Loading events...</td></tr>
    `;

    try {

        const { data, error } = await supabase
            .from("events")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        events = data || [];

        renderEvents();
        updateEventStatistics();

    } catch (error) {

        console.error("Error loading events:", error);

        eventTableBody.innerHTML = `
            <tr><td colspan="5">Failed to load events.</td></tr>
        `;

    }

}


// ==========================================
// FORMAT DATE
// ==========================================

function formatDate(dateString) {

    if (!dateString) return "";

    const date = new Date(dateString);

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });

}


// ==========================================
// CATEGORY DISPLAY
// ==========================================

function displayCategory(category) {

    const names = {
        "Association Events": "Association",
        "University Administration Events": "Administration",
        "Games & Sports": "Sports",
        "Academic Events": "Academic",
        "CITT Events": "CITT",
        "Other University Events": "Other"
    };

    return names[category] || category;

}


// ==========================================
// RENDER EVENTS
// ==========================================

function renderEvents() {

    eventTableBody.innerHTML = "";

    if (events.length === 0) {

        eventTableBody.innerHTML = `
            <tr><td colspan="5">No events found.</td></tr>
        `;

        return;
    }

    events.forEach(event => {

        const row = document.createElement("tr");

        const title = document.createElement("td");
        const category = document.createElement("td");
        const date = document.createElement("td");
        const status = document.createElement("td");
        const actions = document.createElement("td");

        title.textContent = event.title;

        const categoryTag = document.createElement("span");
        categoryTag.className = "category-tag";
        categoryTag.textContent = displayCategory(event.category);
        category.appendChild(categoryTag);

        date.textContent = formatDate(event.event_date);

        const statusTag = document.createElement("span");
        statusTag.className = `status-tag ${event.status}`;
        statusTag.textContent = event.status;
        status.appendChild(statusTag);

        const actionBox = document.createElement("div");
        actionBox.className = "action-buttons";

        actionBox.append(
            makeActionButton("eye", "View event", () => viewEvent(event)),
            makeActionButton("pencil", "Edit event", () => openEventDialog(event.id))
        );

        if (event.status === "pending") {

            const approveButton = makeActionButton(
                "check",
                "Publish event",
                () => approveEvent(event.id)
            );

            approveButton.classList.add("approve");
            actionBox.appendChild(approveButton);

        }

        const deleteButton = makeActionButton(
            "trash-2",
            "Delete event",
            () => deleteEvent(event.id)
        );

        deleteButton.classList.add("delete");

        actionBox.appendChild(deleteButton);

        actions.appendChild(actionBox);

        row.append(title, category, date, status, actions);

        eventTableBody.appendChild(row);

    });

    if (window.lucide) lucide.createIcons();

}


// ==========================================
// ACTION BUTTON
// ==========================================

function makeActionButton(iconName, label, onClick) {

    const button = document.createElement("button");

    button.type = "button";
    button.className = "icon-button";
    button.title = label;
    button.setAttribute("aria-label", label);

    button.innerHTML = `<i data-lucide="${iconName}"></i>`;

    button.addEventListener("click", onClick);

    return button;

}


// ==========================================
// VIEW EVENT
// ==========================================

function viewEvent(event) {

    showMessage(
        event.title,
        `Description: ${event.description}

Category: ${event.category}

Date: ${formatDate(event.event_date)}

Start time: ${event.start_time}

End time: ${event.end_time}

Venue: ${event.venue}

Status: ${event.status}`
    );

}


// ==========================================
// CREATE / EDIT EVENT
// ==========================================

function openEventDialog(eventId = null) {

    editingEventId = eventId;

    eventForm.reset();

    if (eventId !== null) {

        const event = events.find(item => item.id === eventId);

        if (!event) return;

        document.getElementById("eventDialogTitle").textContent = "Edit Event";

        document.getElementById("eventTitle").value = event.title;
        document.getElementById("eventDescription").value = event.description;
        document.getElementById("eventCategory").value = event.category;
        document.getElementById("eventDate").value = event.event_date;
        document.getElementById("eventStart").value = event.start_time;
        document.getElementById("eventEnd").value = event.end_time;
        document.getElementById("eventVenue").value = event.venue;
        document.getElementById("eventStatus").value = event.status;

    } else {

        document.getElementById("eventDialogTitle").textContent = "Create New Event";

        document.getElementById("eventStatus").value = "pending";

    }

    eventDialog.showModal();

}


// ==========================================
// SAVE EVENT
// ==========================================

eventForm.addEventListener("submit", async event => {

    event.preventDefault();

    const eventDetails = {

        title: document.getElementById("eventTitle").value.trim(),

        description: document.getElementById("eventDescription").value.trim(),

        category: document.getElementById("eventCategory").value,

        event_date: document.getElementById("eventDate").value,

        start_time: document.getElementById("eventStart").value,

        end_time: document.getElementById("eventEnd").value,

        venue: document.getElementById("eventVenue").value.trim(),

        status: document.getElementById("eventStatus").value

    };

    if (eventDetails.end_time <= eventDetails.start_time) {

        alert("End time must be after start time.");
        return;

    }

    const saveButton = document.getElementById("saveEventButton");

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {

        let result;

        if (editingEventId !== null) {

            result = await supabase
                .from("events")
                .update(eventDetails)
                .eq("id", editingEventId);

        } else {

            result = await supabase
                .from("events")
                .insert({
                    ...eventDetails,
                    manager_id: currentAdmin.id
                });

        }

        if (result.error) throw result.error;

        eventDialog.close();

        editingEventId = null;

        await loadDashboardData();

        alert("Event saved successfully.");

    } catch (error) {

        console.error(error);

        alert("Unable to save event: " + error.message);

    } finally {

        saveButton.disabled = false;
        saveButton.textContent = "Save Event";

    }

});


// ==========================================
// PUBLISH EVENT
// ==========================================

async function approveEvent(eventId) {

    if (!confirm("Publish this event?")) return;

    try {

        const { error } = await supabase
            .from("events")
            .update({ status: "published" })
            .eq("id", eventId);

        if (error) throw error;

        alert("Event published successfully.");

        await loadDashboardData();

    } catch (error) {

        alert("Unable to publish event: " + error.message);

    }

}


// ==========================================
// DELETE EVENT
// ==========================================

async function deleteEvent(eventId) {

    const selectedEvent = events.find(item => item.id === eventId);

    if (!selectedEvent) return;

    if (!confirm(`Delete "${selectedEvent.title}"?`)) return;

    try {

        const { error } = await supabase
            .from("events")
            .delete()
            .eq("id", eventId);

        if (error) throw error;

        alert("Event deleted successfully.");

        await loadDashboardData();

    } catch (error) {

        alert("Unable to delete event: " + error.message);

    }

}


// ==========================================
// EVENT STATISTICS
// ==========================================

function updateEventStatistics() {

    const total = events.length;

    const pending = events.filter(
        event => event.status === "pending"
    ).length;

    const published = events.filter(
        event => event.status === "published"
    ).length;

    const rejected = events.filter(
        event => event.status === "rejected"
    ).length;

    document.getElementById("totalEvents").textContent = total;

    document.getElementById("pendingEvents").textContent = pending;

    document.getElementById("publishedEvents").textContent = published;

    document.getElementById("categoryTotal").textContent = total;

    document.getElementById("statusSummary").innerHTML = `
        <p>Published: <strong>${published}</strong></p>
        <p>Pending: <strong>${pending}</strong></p>
        <p>Rejected: <strong>${rejected}</strong></p>
    `;

    renderCategoryStatistics();

}


// ==========================================
// CATEGORY STATISTICS
// ==========================================

function renderCategoryStatistics() {

    const legend = document.getElementById("categoryLegend");

    legend.innerHTML = "";

    const classes = [
        "association",
        "administration",
        "sports",
        "academic",
        "citt",
        "other"
    ];

    categories.forEach((category, index) => {

        const count = events.filter(
            event => event.category === category
        ).length;

        const item = document.createElement("li");

        const dot = document.createElement("span");
        dot.className = `legend-dot ${classes[index]}`;

        const name = document.createElement("span");
        name.textContent = displayCategory(category);

        const number = document.createElement("b");
        number.textContent = count;

        item.append(dot, name, number);

        legend.appendChild(item);

    });

}


// ==========================================
// USER STATISTICS
// ==========================================

async function loadUserStatistics() {

    try {

        const { data, error } = await supabase
            .from("profiles")
            .select("role");

        if (error) throw error;

        const users = data || [];

        const students = users.filter(user => user.role === "student").length;

        const managers = users.filter(user => user.role === "event_manager").length;

        const admins = users.filter(user => user.role === "admin").length;

        document.getElementById("registeredUsers").textContent = users.length;

        document.getElementById("usersTotal").textContent = users.length;

        document.getElementById("studentsTotal").textContent = students;

        document.getElementById("managersTotal").textContent = managers;

        document.getElementById("adminsTotal").textContent = admins;

    } catch (error) {

        console.error("Error loading user statistics:", error);

    }

}


// ==========================================
// EVENT MANAGER REQUESTS
// ==========================================

async function loadManagerRequests() {

    const tableBody = document.getElementById("managerRequestTableBody");

    tableBody.innerHTML = `
        <tr><td colspan="5">Loading requests...</td></tr>
    `;

    try {

        const { data, error } = await supabase
            .from("event_manager_requests")
            .select(`
                id,
                user_id,
                status,
                requested_at,
                profiles!event_manager_requests_user_id_fkey (
                    full_name,
                    email
                )
            `)
            .order("requested_at", { ascending: false });

        if (error) throw error;

        tableBody.innerHTML = "";

        if (!data || data.length === 0) {

            tableBody.innerHTML = `
                <tr><td colspan="5">No event manager requests found.</td></tr>
            `;

            return;

        }

        data.forEach(request => {

            const row = document.createElement("tr");

            const applicant = document.createElement("td");
            const email = document.createElement("td");
            const date = document.createElement("td");
            const status = document.createElement("td");
            const actions = document.createElement("td");

            applicant.textContent =
                request.profiles?.full_name || "Unknown";

            email.textContent =
                request.profiles?.email || "Unavailable";

            date.textContent = formatDate(
                request.requested_at.split("T")[0]
            );

            const statusTag = document.createElement("span");

            statusTag.className = `status-tag ${request.status}`;
            statusTag.textContent = request.status;

            status.appendChild(statusTag);

            const actionBox = document.createElement("div");

            actionBox.className = "action-buttons";

            if (request.status === "pending") {

                const approveButton = makeActionButton(
                    "check",
                    "Approve request",
                    () => reviewManagerRequest(request, "approved")
                );

                approveButton.classList.add("approve");

                const rejectButton = makeActionButton(
                    "x",
                    "Reject request",
                    () => reviewManagerRequest(request, "rejected")
                );

                rejectButton.classList.add("delete");

                actionBox.append(approveButton, rejectButton);

            } else {

                actionBox.textContent = "Reviewed";

            }

            actions.appendChild(actionBox);

            row.append(applicant, email, date, status, actions);

            tableBody.appendChild(row);

        });

        if (window.lucide) lucide.createIcons();

    } catch (error) {

        console.error("Error loading manager requests:", error);

        tableBody.innerHTML = `
            <tr><td colspan="5">Failed to load requests: ${error.message}</td></tr>
        `;

    }

}


// ==========================================
// APPROVE OR REJECT MANAGER REQUEST
// ==========================================

async function reviewManagerRequest(request, decision) {

    const action = decision === "approved" ? "approve" : "reject";

    if (!confirm(`Are you sure you want to ${action} this request?`)) {
        return;
    }

    try {

        // Update the request record.

        const { data: updatedRequest, error: requestError } = await supabase
            .from("event_manager_requests")
            .update({
                status: decision,
                reviewed_at: new Date().toISOString(),
                reviewed_by: currentAdmin.id
            })
            .eq("id", request.id)
            .eq("status", "pending")
            .select("id");

        if (requestError) throw requestError;

        if (!updatedRequest || updatedRequest.length === 0) {
            throw new Error("This request has already been reviewed or cannot be updated.");
        }

        // Promote the applicant only when approved.

        if (decision === "approved") {

            const { error: profileError } = await supabase
                .from("profiles")
                .update({ role: "event_manager" })
                .eq("id", request.user_id);

            if (profileError) throw profileError;

        }

        alert(`Request ${decision} successfully.`);

        await loadManagerRequests();

        await loadUserStatistics();

    } catch (error) {

        console.error("Request review error:", error);

        alert("Unable to review request: " + error.message);

    }

}


// ==========================================
// MESSAGE DIALOG
// ==========================================

function showMessage(title, message) {

    document.getElementById("messageTitle").textContent = title;

    document.getElementById("messageText").textContent = message;

    messageDialog.showModal();

}


// ==========================================
// CLOSE DIALOGS
// ==========================================

document.getElementById("closeEventDialog")
    .addEventListener("click", () => eventDialog.close());

document.getElementById("cancelEventDialog")
    .addEventListener("click", () => eventDialog.close());

document.getElementById("closeMessageDialog")
    .addEventListener("click", () => messageDialog.close());


// ==========================================
// CREATE EVENT BUTTONS
// ==========================================

document.getElementById("createEventBtn")
    .addEventListener("click", () => openEventDialog());

document.getElementById("createEventTop")
    .addEventListener("click", () => openEventDialog());


// ==========================================
// REFRESH BUTTONS
// ==========================================

document.getElementById("refreshEvents")
    .addEventListener("click", loadEvents);

document.getElementById("refreshRequests")
    .addEventListener("click", loadManagerRequests);


// ==========================================
// MANAGE USERS
// ==========================================

document.getElementById("manageUsersBtn")
    .addEventListener("click", () => {

        document.getElementById("users").scrollIntoView({
            behavior: "smooth"
        });

    });


// ==========================================
// SIDEBAR
// ==========================================

document.getElementById("menuButton")
    .addEventListener("click", () => {

        document.getElementById("sidebar").classList.toggle("open");

    });


document.querySelectorAll(".nav-link").forEach(link => {

    link.addEventListener("click", () => {

        document.querySelectorAll(".nav-link").forEach(item => {
            item.classList.remove("active");
        });

        link.classList.add("active");

        if (window.innerWidth <= 900) {
            document.getElementById("sidebar").classList.remove("open");
        }

    });

});


// ==========================================
// LOGOUT
// ==========================================

document.getElementById("logoutBtn")
    .addEventListener("click", async event => {

        event.preventDefault();

        if (!confirm("Do you want to log out?")) return;

        const { error } = await supabase.auth.signOut();

        if (error) {
            alert("Unable to log out: " + error.message);
            return;
        }

        window.location.href = "signin.html";

    });


// ==========================================
// START DASHBOARD
// ==========================================

initializeDashboard();
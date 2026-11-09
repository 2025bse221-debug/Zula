// Zula Event Manager Dashboard connected to Supabase and Cloudinary
import { supabase } from "./supabaseClient.js";

let currentUser = null;
let events = [];
let editingId = null;
let selectedImageFile = null;
let selectedImageUrl = "";
let removeExistingImage = false;

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = "b1lfkics";
const CLOUDINARY_UPLOAD_PRESET = "zula_events";

const form = document.getElementById("eventForm");
const imageInput = document.getElementById("eventImage");
const previewWrap = document.getElementById("imagePreviewWrap");
const previewImage = document.getElementById("imagePreview");
const eventsList = document.getElementById("eventsList");
const emptyState = document.getElementById("emptyState");

const byId = (id) => document.getElementById(id);


// Format event dates for display.
function formatDate(value) {
  if (!value) return "Date not set";

  return new Date(`${value}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}


// Prevent event text from being interpreted as HTML.
function safeText(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}


// Convert short form category values into database category values.
function categoryLabel(value) {
  return ({
    Association: "Association Events",
    Administration: "University Administration Events",
    Sports: "Games & Sports",
    Academic: "Academic Events",
    CITT: "CITT Events",
    Other: "Other University Events"
  })[value] || value || "";
}


// Convert database category values into form values when editing.
function toFormCategory(value) {
  return ({
    "Association Events": "Association",
    "University Administration Events": "Administration",
    "Games & Sports": "Sports",
    "Academic Events": "Academic",
    "CITT Events": "CITT",
    "Other University Events": "Other"
  })[value] || value;
}


// Convert a Supabase event row into the dashboard format.
function mapDatabaseEvent(row) {
  return {
    id: row.id,
    title: row.title || "",
    category: row.category || "",
    date: row.event_date || "",
    startTime: String(row.start_time || "").slice(0, 5),
    endTime: String(row.end_time || "").slice(0, 5),
    venue: row.venue || "",
    description: row.description || "",
    image: row.image_url || "",
    registrationUrl: row.registration_url || "",
    status: row.status || "published",
    managerId: row.manager_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}


function showMessage(message) {
  alert(message);
}


function setBusy(isBusy) {
  const button = byId("saveEventButton");

  button.disabled = isBusy;
  button.style.opacity = isBusy ? "0.7" : "";
  button.style.cursor = isBusy ? "wait" : "";
}


// Validate an optional registration link.
function validateRegistrationUrl(value) {
  if (!value) return true;

  try {
    const url = new URL(value);

    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}


// Check that the user is signed in and is an event manager.
async function requireEventManager() {
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError) throw authError;

  if (!user) {
    window.location.href = "signin.html";
    return false;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  if (!profile) {
    throw new Error(
      "Your profile was not found. Please contact the Zula administrator."
    );
  }

  if (profile.role !== "event_manager") {
    if (profile.role === "student") {
      window.location.href = "studentDashboard.html";
    } else if (profile.role === "admin") {
      window.location.href = "adminDashboard.html";
    } else {
      window.location.href = "signin.html";
    }

    return false;
  }

  currentUser = user;
  return true;
}


// Load this manager's events from Supabase.
async function loadEvents() {
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
      status,
      manager_id,
      created_at,
      updated_at
    `)
    .eq("manager_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  events = (data || []).map(mapDatabaseEvent);

  renderEvents();
}


// Display events and update statistics.
function renderEvents() {
  const search = (
    byId("searchEvents").value || ""
  ).trim().toLowerCase();

  const filtered = events.filter((item) =>
    `${item.title} ${item.category} ${item.venue} ${item.description}`
      .toLowerCase()
      .includes(search)
  );

  byId("totalCount").textContent = events.length;

  byId("publishedCount").textContent =
    events.filter((item) => item.status === "published").length;

  byId("pendingCount").textContent =
    events.filter((item) => item.status === "pending").length;

  byId("pictureCount").textContent =
    events.filter((item) => Boolean(item.image)).length;

  eventsList.innerHTML = filtered.map((item) => `
    <article class="event-card">
      <div class="event-image">
        ${
          item.image
            ? `<img src="${safeText(item.image)}"
                    alt="Poster for ${safeText(item.title)}"
                    loading="lazy">`
            : '<i data-lucide="image"></i>'
        }
      </div>

      <div class="event-details">
        <h3>${safeText(item.title)}</h3>

        <div class="event-meta">
          <span>
            <i data-lucide="calendar-days"></i>
            ${formatDate(item.date)}
          </span>

          <span>
            <i data-lucide="map-pin"></i>
            ${safeText(item.venue)}
          </span>

          ${
            item.startTime
              ? `<span>
                  <i data-lucide="clock"></i>
                  ${safeText(item.startTime)}
                  ${item.endTime ? "–" + safeText(item.endTime) : ""}
                </span>`
              : ""
          }
        </div>

        <p>${safeText(item.description)}</p>

        <div class="event-tags">
          <span class="category-tag">
            ${safeText(item.category)}
          </span>

          <span class="status-tag ${safeText(item.status)}">
            ${safeText(item.status)}
          </span>
        </div>

        ${
          item.registrationUrl
            ? `<p class="registration-info">
                <i data-lucide="external-link"></i>
                Registration link added
              </p>`
            : ""
        }
      </div>

      <div class="event-actions">
        <button
          class="small-button"
          type="button"
          data-edit="${safeText(item.id)}">
          <i data-lucide="pencil"></i>
          Edit
        </button>

        <button
          class="small-button remove"
          type="button"
          data-remove="${safeText(item.id)}">
          <i data-lucide="trash-2"></i>
          Remove
        </button>
      </div>
    </article>
  `).join("");

  emptyState.classList.toggle("hidden", filtered.length > 0);

  if (window.lucide) {
    window.lucide.createIcons();
  }
}


// Show or hide the selected event image preview.
function showImagePreview(url) {
  if (url) {
    previewImage.src = url;
    previewWrap.classList.remove("hidden");
  } else {
    previewImage.removeAttribute("src");
    previewWrap.classList.add("hidden");
  }
}


// Reset the event form.
function resetForm() {
  form.reset();

  editingId = null;
  selectedImageFile = null;
  selectedImageUrl = "";
  removeExistingImage = false;

  showImagePreview("");

  byId("formHeading").textContent = "Create an Event";

  byId("saveEventButton").innerHTML =
    '<i data-lucide="send"></i>Publish Event';

  byId("cancelEditButton").classList.add("hidden");

  if (window.lucide) {
    window.lucide.createIcons();
  }
}


function scrollToForm() {
  byId("event-form-section").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  byId("eventTitle").focus({
    preventScroll: true
  });
}


// Fill the form with an existing event for editing.
function startEdit(id) {
  const item = events.find(
    (event) => String(event.id) === String(id)
  );

  if (!item) return;

  editingId = item.id;
  selectedImageFile = null;
  selectedImageUrl = item.image || "";
  removeExistingImage = false;

  byId("eventTitle").value = item.title;
  byId("eventCategory").value = toFormCategory(item.category);
  byId("eventDate").value = item.date;
  byId("eventStart").value = item.startTime;
  byId("eventEnd").value = item.endTime;
  byId("eventVenue").value = item.venue;
  byId("eventDescription").value = item.description;

  // Load the existing registration link into the form.
  byId("registrationUrl").value = item.registrationUrl || "";

  imageInput.value = "";

  showImagePreview(selectedImageUrl);

  byId("formHeading").textContent = "Edit Event";

  byId("saveEventButton").innerHTML =
    '<i data-lucide="save"></i>Save Changes';

  byId("cancelEditButton").classList.remove("hidden");

  if (window.lucide) {
    window.lucide.createIcons();
  }

  scrollToForm();
}


// Validate and preview a selected image.
imageInput.addEventListener("change", () => {
  const file = imageInput.files && imageInput.files[0];

  if (!file) return;

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!allowedTypes.includes(file.type)) {
    showMessage("Please choose a JPG, PNG, or WEBP image.");
    imageInput.value = "";
    selectedImageFile = null;
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    showMessage(
      "Please choose an image smaller than 2 MB."
    );

    imageInput.value = "";
    selectedImageFile = null;
    return;
  }

  selectedImageFile = file;
  removeExistingImage = false;

  showImagePreview(URL.createObjectURL(file));
});


// Remove the selected or existing image from the form.
byId("removeImageButton").addEventListener("click", () => {
  selectedImageFile = null;
  selectedImageUrl = "";
  removeExistingImage = true;

  imageInput.value = "";

  showImagePreview("");
});


byId("cancelEditButton").addEventListener("click", resetForm);

byId("newEventButton").addEventListener("click", () => {
  resetForm();
  scrollToForm();
});


// Upload an event image to Cloudinary.
async function uploadEventImage(file) {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error(
      "Please upload a JPG, PNG, or WEBP image."
    );
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error(
      "Please choose an image smaller than 2 MB."
    );
  }

  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error?.message || "Cloudinary image upload failed."
    );
  }

  if (!result.secure_url) {
    throw new Error(
      "Cloudinary did not return an image URL."
    );
  }

  return result.secure_url;
}


// Delete old images from Supabase Storage only.
// Cloudinary deletion requires a secure backend operation.
async function deleteImageIfOwnedByManager(publicUrl) {
  if (!publicUrl) return;

  const marker =
    "/storage/v1/object/public/event-images/";

  const index = publicUrl.indexOf(marker);

  // Do not attempt to delete Cloudinary images through Supabase.
  if (index === -1) return;

  const path = decodeURIComponent(
    publicUrl.slice(index + marker.length)
  );

  if (!path.startsWith(`${currentUser.id}/`)) return;

  const { error } = await supabase.storage
    .from("event-images")
    .remove([path]);

  if (error) {
    console.warn(
      "Could not remove the old Supabase image:",
      error.message
    );
  }
}


// Create or update an event in Supabase.
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    showMessage("Your session is not ready. Please sign in again.");
    return;
  }

  const title = byId("eventTitle").value.trim();

  const category = categoryLabel(
    byId("eventCategory").value
  );

  const date = byId("eventDate").value;
  const startTime = byId("eventStart").value;
  const endTime = byId("eventEnd").value;
  const venue = byId("eventVenue").value.trim();
  const description = byId("eventDescription").value.trim();

  // Get the optional registration link.
  const registrationUrl = byId("registrationUrl").value.trim();

  if (
    !title ||
    !category ||
    !date ||
    !startTime ||
    !endTime ||
    !venue ||
    !description
  ) {
    showMessage("Please complete all required event fields.");
    return;
  }

  if (endTime <= startTime) {
    showMessage(
      "The event end time must be later than its start time."
    );
    return;
  }

  // Validate the registration link only if the manager entered one.
  if (!validateRegistrationUrl(registrationUrl)) {
    showMessage(
      "Please enter a valid registration link starting with http:// or https://."
    );
    byId("registrationUrl").focus();
    return;
  }

  const saveButton = byId("saveEventButton");
  const originalButtonHtml = saveButton.innerHTML;

  setBusy(true);

  let uploadedImageUrl = "";
  let oldImageUrl = "";
  let shouldDeleteOldImage = false;

  const wasEditing = Boolean(editingId);

  try {
    const existing = wasEditing
      ? events.find(
          (item) => String(item.id) === String(editingId)
        )
      : null;

    if (wasEditing && !existing) {
      throw new Error(
        "This event could not be found. Refresh the page and try again."
      );
    }

    oldImageUrl = existing?.image || "";

    let imageUrl = oldImageUrl;

    if (selectedImageFile) {
      // Upload the new image to Cloudinary.
      uploadedImageUrl = await uploadEventImage(selectedImageFile);

      imageUrl = uploadedImageUrl;

      shouldDeleteOldImage =
        Boolean(oldImageUrl && oldImageUrl !== imageUrl);

    } else if (removeExistingImage) {
      imageUrl = "";
      shouldDeleteOldImage = Boolean(oldImageUrl);
    }

    const payload = {
      title,
      description,
      category,
      event_date: date,
      start_time: startTime,
      end_time: endTime,
      venue,
      image_url: imageUrl || null,

      // Save the registration link in Supabase.
      // If empty, save NULL.
      registration_url: registrationUrl || null,

      updated_at: new Date().toISOString()
    };

    if (!wasEditing) {
      // Publish new events immediately.
      payload.manager_id = currentUser.id;
      payload.status = "published";

      const { error } = await supabase
        .from("events")
        .insert(payload);

      if (error) throw error;

    } else {
      // Keep edited events published.
      payload.status = "published";

      const { error } = await supabase
        .from("events")
        .update(payload)
        .eq("id", editingId)
        .eq("manager_id", currentUser.id);

      if (error) throw error;
    }

    await loadEvents();
    resetForm();

    // Remove an old Supabase image if it is safe to do so.
    // Cloudinary images are not deleted by this function.
    if (shouldDeleteOldImage) {
      await deleteImageIfOwnedByManager(oldImageUrl);
    }

    showMessage(
      wasEditing
        ? "Event updated successfully."
        : "Event published successfully! It is now available to users."
    );

    byId("my-events").scrollIntoView({
      behavior: "smooth"
    });

  } catch (error) {
    console.error("Error saving event:", error);

    // Avoid deleting Cloudinary images automatically here.
    // The upload may have succeeded even if saving the event failed.
    showMessage(
      `Could not save the event: ${error.message || "Unknown error"}`
    );

  } finally {
    saveButton.innerHTML = originalButtonHtml;
    setBusy(false);

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }
});


// Edit or delete an event.
eventsList.addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit]");
  const removeButton = event.target.closest("[data-remove]");

  if (editButton) {
    startEdit(editButton.dataset.edit);
    return;
  }

  if (!removeButton) return;

  const id = removeButton.dataset.remove;

  const item = events.find(
    (entry) => String(entry.id) === String(id)
  );

  if (!item) return;

  if (!confirm(
    `Remove "${item.title}" from Zula? This will delete it from the database.`
  )) {
    return;
  }

  try {
    const { data, error } = await supabase
      .from("events")
      .delete()
      .eq("id", id)
      .eq("manager_id", currentUser.id)
      .select("id, image_url");

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error(
        "No event was deleted. Check your Supabase Row Level Security policies."
      );
    }

    // Deletes an old Supabase image if applicable.
    // Cloudinary images remain in Cloudinary.
    await deleteImageIfOwnedByManager(data[0].image_url);

    events = events.filter(
      (entry) => String(entry.id) !== String(id)
    );

    renderEvents();

    showMessage("Event deleted successfully.");

  } catch (error) {
    console.error("Error deleting event:", error);

    showMessage(
      `Could not delete the event: ${error.message || "Unknown error"}`
    );
  }
});


// Search events.
byId("searchEvents").addEventListener("input", renderEvents);


// Mobile sidebar menu.
byId("menuButton").addEventListener("click", () => {
  byId("sidebar").classList.toggle("open");
});


// Sidebar navigation.
document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach((item) => {
      item.classList.remove("active");
    });

    link.classList.add("active");

    if (window.innerWidth <= 900) {
      byId("sidebar").classList.remove("open");
    }
  });
});


// Start the dashboard.
async function initialiseDashboard() {
  try {
    const allowed = await requireEventManager();

    if (!allowed) return;

    await loadEvents();

  } catch (error) {
    console.error(
      "Could not initialise event manager dashboard:",
      error
    );

    showMessage(
      `Could not load the event manager dashboard: ${error.message || "Unknown error"}`
    );
  }
}

initialiseDashboard();

"use strict";

// Your Spring Boot backend.
const API_BASE = "http://localhost:8080/api";

// ==================================================
// COMMON HELPERS
// ==================================================

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("frnUser") || "null");
  } catch {
    return null;
  }
}

function currentUserId(user = readStoredUser()) {
  return user?.userId ?? user?.id ?? null;
}

function currentRole(user = readStoredUser()) {
  return String(user?.userType ?? user?.role ?? "").toUpperCase();
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function showMessage(id, message, type = "error") {
  const element = document.getElementById(id);
  if (!element) return;

  element.textContent = message;
  element.className = message ? `message ${type}` : "message";
}

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("frnToken");

  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  let response;

  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });
  } catch {
    throw new Error(
      "Cannot connect to the backend. Check that Spring Boot is running on port 8080 and CORS is configured."
    );
  }

  const contentType = response.headers.get("content-type") || "";
  let data = null;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = text || null;
  }

  if (!response.ok) {
    const serverMessage =
      typeof data === "string"
        ? data
        : data?.message ?? data?.error ?? "";

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        serverMessage || "You are not authorized to perform this action."
      );
    }

    if (response.status === 404) {
      throw new Error(
        serverMessage || "The requested API endpoint was not found."
      );
    }

    throw new Error(
      serverMessage || `Request failed with HTTP ${response.status}.`
    );
  }

  return data;
}

function setLoading(button, loading, originalText) {
  if (!button) return;

  button.disabled = loading;
  button.textContent = loading ? "Please wait..." : originalText;
}

function getArray(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.content)) return result.content;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.items)) return result.items;
  return [];
}

function getRoleLabel(role) {
  const labels = {
    PROVIDER: "Food Provider",
    FOOD_PROVIDER: "Food Provider",
    NGO: "NGO",
    VOLUNTEER: "Volunteer"
  };

  return labels[role] || role || "User";
}

// ==================================================
// REGISTRATION
// ==================================================

const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", async event => {
    event.preventDefault();

    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;
    const userType = document.getElementById("registerRole").value;

    const button = registerForm.querySelector('button[type="submit"]');

    if (!name || !email || !password || !userType) {
      showMessage("registerMessage", "Please complete every field.");
      return;
    }

    if (password.length < 8) {
      showMessage(
        "registerMessage",
        "Please use a password with at least 8 characters."
      );
      return;
    }

    setLoading(button, true, "Create Account");
    showMessage("registerMessage", "");

    try {
      // These request fields must match your Spring Boot
      // User entity and POST /api/users/register controller.
      await apiRequest("/users/register", {
             method: "POST",
             body: JSON.stringify({
             userName: name,
             email,
            password,
            userType
        })
   });

      showMessage(
        "registerMessage",
        "Account created successfully. Please sign in.",
        "success"
      );

      registerForm.reset();

      // Redirect only after the server confirms registration.
      window.setTimeout(() => {
        window.location.href = "login.html";
      }, 900);
    } catch (error) {
      showMessage("registerMessage", error.message);
    } finally {
      setLoading(button, false, "Create Account");
    }
  });
}

// ==================================================
// LOGIN
// ==================================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const button = loginForm.querySelector('button[type="submit"]');

    if (!email || !password) {
      showMessage("loginMessage", "Enter your email and password.");
      return;
    }

    setLoading(button, true, "Sign In");
    showMessage("loginMessage", "");

    try {
      // This route must verify the password on the server.
      // Example expected response:
      // {
      //   "token": "server-issued-token",
      //   "user": {
      //     "userId": 1,
      //     "name": "Example User",
      //     "email": "user@example.com",
      //     "userType": "PROVIDER"
      //   }
      // }
      const result = await apiRequest("/users/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      const user = result?.user ?? result;
      const token = result?.token ?? result?.accessToken;

      if (!user || currentUserId(user) == null) {
        throw new Error(
          "The login API did not return a user ID. Check the response from your Spring Boot login controller."
        );
      }

      // Never store the password in localStorage.
      localStorage.removeItem("frnUser");
      localStorage.removeItem("frnToken");

      localStorage.setItem("frnUser", JSON.stringify(user));

      if (token) {
        localStorage.setItem("frnToken", token);
      }

      window.location.href = "index.html";
    } catch (error) {
      showMessage("loginMessage", error.message);
    } finally {
      setLoading(button, false, "Sign In");
    }
  });
}

// ==================================================
// DASHBOARD ACCESS AND ROLE-BASED DISPLAY
// ==================================================

const dashboard = document.getElementById("donationGrid");
let dashboardUser = null;

function isProvider(role) {
  return ["PROVIDER", "FOOD_PROVIDER"].includes(role);
}

function isRequester(role) {
  return ["NGO", "VOLUNTEER"].includes(role);
}

function initializeDashboard() {
  const user = readStoredUser();

  if (!user || currentUserId(user) == null) {
    window.location.replace("login.html");
    return null;
  }

  const role = currentRole(user);
  const welcome = document.getElementById("welcomeUser");

  if (welcome) {
    const name = user.name ?? user.userName ?? user.email ?? "User";
    welcome.textContent = `Hi, ${name}`;
    welcome.title = getRoleLabel(role);
  }

  // Hide role-specific links and sections.
  document.querySelectorAll("[data-role]").forEach(element => {
    const requiredRole = element.dataset.role;

    let allowed = false;

    if (requiredRole === "provider") {
      allowed = isProvider(role);
    } else if (requiredRole === "requester") {
      allowed = isRequester(role);
    } else if (requiredRole === "pickup-manager") {
      // Providers review requests; requesters view their requests.
      allowed = isProvider(role) || isRequester(role);
    }

    element.hidden = !allowed;
  });

  document.querySelectorAll("[data-role-section]").forEach(section => {
    const requiredRole = section.dataset.roleSection;

    if (requiredRole === "provider") {
      section.hidden = !isProvider(role);
    } else if (requiredRole === "requester") {
      section.hidden = !isRequester(role);
    } else if (requiredRole === "pickup-manager") {
      section.hidden = !(isProvider(role) || isRequester(role));
    }
  });

  return user;
}

if (dashboard) {
  dashboardUser = initializeDashboard();

  if (dashboardUser) {
    loadDonations();

    if (isProvider(currentRole(dashboardUser)) ||
        isRequester(currentRole(dashboardUser))) {
      loadPickups();
    }

    setDefaultDonationTimes();
  }
}

// ==================================================
// LOGOUT
// ==================================================

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("frnUser");
  localStorage.removeItem("frnToken");
  window.location.href = "login.html";
});

// ==================================================
// AVAILABLE DONATIONS
// ==================================================

async function loadDonations() {
  const grid = document.getElementById("donationGrid");
  if (!grid) return;

  grid.innerHTML =
    '<p class="loading-text">Loading available donations...</p>';

  try {
    const result = await apiRequest("/donations");
    const donations = getArray(result);

    const available = donations.filter(donation =>
      String(donation.status ?? "").toUpperCase() === "AVAILABLE"
    );

    if (available.length === 0) {
      grid.innerHTML =
        '<p class="empty-state">No available donations at the moment. Please check again later.</p>';
      return;
    }

    const role = currentRole();

    grid.innerHTML = available.map(donation => {
      const id = donation.donationId ?? donation.id;
      const category = donation.foodCategory ?? "OTHER";
      const emojiByCategory = {
        VEGETARIAN: "🥗",
        NON_VEGETARIAN: "🍲",
        BAKERY: "🥖",
        FRUITS: "🍎",
        PACKAGED: "🥫",
        OTHER: "🍱"
      };

      const provider = donation.provider ?? {};
      const providerName =
        provider.name ?? provider.userName ?? "Food provider";

      const requestButton =
        isRequester(role) && id != null
          ? `<button class="btn btn-primary request-food-btn"
                    type="button" data-id="${escapeHTML(id)}">
               Request Pickup
             </button>`
          : "";

      return `
        <article class="donation-card">
          <div class="food-emoji">
            ${emojiByCategory[String(category).toUpperCase()] || "🍱"}
          </div>

          <span class="category-tag">${escapeHTML(category)}</span>
          <h3>${escapeHTML(donation.foodName ?? "Food donation")}</h3>
          <p>📦 Quantity: ${escapeHTML(donation.quantity)}</p>
          <p>📍 ${escapeHTML(donation.pickupLocation)}</p>
          <p>👤 ${escapeHTML(providerName)}</p>
          <p>🕒 Available: ${escapeHTML(donation.availableFrom ?? "Not specified")}</p>
          <p>⏰ Deadline: ${escapeHTML(donation.pickupDeadline ?? "Not specified")}</p>
          ${requestButton}
        </article>
      `;
    }).join("");

    grid.querySelectorAll(".request-food-btn").forEach(button => {
      button.addEventListener("click", () => {
        const donationIdInput =
          document.getElementById("pickupDonationId");

        if (donationIdInput) {
          donationIdInput.value = button.dataset.id;
        }

        document.getElementById("request")?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      });
    });
  } catch (error) {
    grid.innerHTML =
      `<p class="empty-state">${escapeHTML(error.message)}</p>`;
  }
}

document.getElementById("refreshDonationsBtn")?.addEventListener(
  "click",
  loadDonations
);

// ==================================================
// DEFAULT DONATION TIMES
// ==================================================

function formatLocalDateTime(date) {
  const pad = number => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function setDefaultDonationTimes() {
  const available = document.getElementById("availableFrom");
  const deadline = document.getElementById("pickupDeadline");

  if (!available || !deadline) return;

  const now = new Date();
  const fourHoursLater = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  available.value = formatLocalDateTime(now);
  deadline.value = formatLocalDateTime(fourHoursLater);

  available.min = formatLocalDateTime(now);
  deadline.min = available.value;

  available.addEventListener("change", () => {
    deadline.min = available.value;

    if (deadline.value && deadline.value <= available.value) {
      const start = new Date(available.value);
      start.setHours(start.getHours() + 1);
      deadline.value = formatLocalDateTime(start);
    }
  });
}

// ==================================================
// PUBLISH DONATION
// ==================================================

const donationForm = document.getElementById("donationForm");

if (donationForm) {
  donationForm.addEventListener("submit", async event => {
    event.preventDefault();

    const user = readStoredUser();
    const role = currentRole(user);

    if (!user || currentUserId(user) == null) {
      showMessage("publishMessage", "Please sign in again.");
      return;
    }

    if (!isProvider(role)) {
      showMessage(
        "publishMessage",
        "Only food providers can publish donations."
      );
      return;
    }

    const availableFrom =
      document.getElementById("availableFrom").value;
    const pickupDeadline =
      document.getElementById("pickupDeadline").value;

    if (!availableFrom || !pickupDeadline ||
        pickupDeadline <= availableFrom) {
      showMessage(
        "publishMessage",
        "The pickup deadline must be later than the availability time."
      );
      return;
    }

    const quantity = Number(
      document.getElementById("quantity").value
    );

    if (!Number.isInteger(quantity) || quantity <= 0) {
      showMessage(
        "publishMessage",
        "Enter a positive whole number for the quantity."
      );
      return;
    }

    const button = donationForm.querySelector('button[type="submit"]');
    setLoading(button, true, "Publish Donation");
    showMessage("publishMessage", "");

    try {
      const payload = {
        foodName: document.getElementById("foodName").value.trim(),
        foodCategory: document.getElementById("foodCategory").value,
        quantity,
        pickupLocation:
          document.getElementById("pickupLocation").value.trim(),
        availableFrom,
        pickupDeadline,
        provider: {
          userId: currentUserId(user)
        }
      };

      await apiRequest("/donations", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      showMessage(
        "publishMessage",
        "Donation published successfully!",
        "success"
      );

      donationForm.reset();
      setDefaultDonationTimes();
      await loadDonations();
    } catch (error) {
      showMessage("publishMessage", error.message);
    } finally {
      setLoading(button, false, "Publish Donation");
    }
  });
}

// ==================================================
// CREATE PICKUP REQUEST
// ==================================================

const pickupForm = document.getElementById("pickupForm");

if (pickupForm) {
  pickupForm.addEventListener("submit", async event => {
    event.preventDefault();

    const user = readStoredUser();
    const role = currentRole(user);

    if (!user || currentUserId(user) == null) {
      showMessage("pickupCreateMessage", "Please sign in again.");
      return;
    }

    if (!isRequester(role)) {
      showMessage(
        "pickupCreateMessage",
        "Only NGOs and volunteers can request pickups."
      );
      return;
    }

    const donationId = Number(
      document.getElementById("pickupDonationId").value
    );

    const requestedQuantity = Number(
      document.getElementById("requestedQuantity").value
    );

    if (!Number.isInteger(donationId) || donationId <= 0) {
      showMessage(
        "pickupCreateMessage",
        "Enter a valid donation ID."
      );
      return;
    }

    if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
      showMessage(
        "pickupCreateMessage",
        "Enter a positive whole number for the requested quantity."
      );
      return;
    }

    const button = pickupForm.querySelector('button[type="submit"]');
    setLoading(button, true, "Submit Pickup Request");
    showMessage("pickupCreateMessage", "");

    try {
      const payload = {
        donation: { donationId },
        requester: { userId: currentUserId(user) },
        requestedQuantity
      };

      await apiRequest("/pickups", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      showMessage(
        "pickupCreateMessage",
        "Pickup request submitted successfully!",
        "success"
      );

      pickupForm.reset();

      await Promise.all([
        loadPickups(),
        loadDonations()
      ]);
    } catch (error) {
      showMessage("pickupCreateMessage", error.message);
    } finally {
      setLoading(button, false, "Submit Pickup Request");
    }
  });
}

// ==================================================
// LOAD PICKUP REQUESTS
// ==================================================

async function loadPickups() {
  const list = document.getElementById("pickupList");
  if (!list) return;

  const user = readStoredUser();
  const role = currentRole(user);

  if (!isProvider(role) && !isRequester(role)) {
    list.innerHTML =
      '<p class="empty-state">Your account does not have pickup access.</p>';
    return;
  }

  list.innerHTML =
    '<p class="loading-text">Loading pickup requests...</p>';

  try {
    const result = await apiRequest("/pickups");
    const allPickups = getArray(result);

    // Requesters see their own requests. Providers see requests
    // to review, subject to authorization in the backend.
    const pickups = isRequester(role)
      ? allPickups.filter(pickup =>
          String(
            pickup.requester?.userId ??
            pickup.requester?.id ??
            ""
          ) === String(currentUserId(user))
        )
      : allPickups;

    if (!pickups.length) {
      list.innerHTML =
        '<p class="empty-state">No pickup requests to display.</p>';
      return;
    }

    list.innerHTML = pickups.map(pickup => {
      const id = pickup.requestId ?? pickup.id;
      const status = String(pickup.status ?? "UNKNOWN").toUpperCase();
      const donation = pickup.donation ?? {};
      const requester = pickup.requester ?? {};

      let actions = "";

      if (isProvider(role) && status === "PENDING") {
        actions = `
          <button class="btn btn-primary"
                  type="button" data-action="approve"
                  data-id="${escapeHTML(id)}">Approve</button>
          <button class="btn btn-outline"
                  type="button" data-action="reject"
                  data-id="${escapeHTML(id)}">Reject</button>
        `;
      } else if (isProvider(role) && status === "APPROVED") {
        actions = `
          <button class="btn btn-primary"
                  type="button" data-action="complete"
                  data-id="${escapeHTML(id)}">Mark Completed</button>
        `;
      } else if (isRequester(role) &&
                 status === "PENDING" &&
                 String(
                   requester.userId ?? requester.id ?? ""
                 ) === String(currentUserId(user))) {
        actions = `
          <button class="btn btn-outline"
                  type="button" data-action="cancel"
                  data-id="${escapeHTML(id)}">Cancel Request</button>
        `;
      }

      const statusClass = {
        PENDING: "pending",
        APPROVED: "approved",
        COMPLETED: "completed",
        COLLECTED: "completed",
        REJECTED: "rejected",
        CANCELLED: "cancelled"
      }[status] || "";

      return `
        <article class="pickup-card">
          <h3>Pickup Request #${escapeHTML(id)}</h3>
          <span class="status ${statusClass}">
            ${escapeHTML(status)}
          </span>
          <p>🍱 Food: ${escapeHTML(
            donation.foodName ?? `Donation #${donation.donationId ?? ""}`
          )}</p>
          <p>📦 Requested quantity: ${escapeHTML(pickup.requestedQuantity)}</p>
          <p>👤 Requester: ${escapeHTML(
            requester.name ?? requester.userName ?? requester.email ?? "User"
          )}</p>
          <p>🕒 Request time: ${escapeHTML(pickup.requestTime ?? "Not specified")}</p>
          <div class="actions">${actions}</div>
        </article>
      `;
    }).join("");

    list.querySelectorAll("[data-action]").forEach(button => {
      button.addEventListener("click", async () => {
        await updatePickup(button.dataset.id, button.dataset.action);
      });
    });
  } catch (error) {
    list.innerHTML =
      `<p class="empty-state">${escapeHTML(error.message)}</p>`;
  }
}

document.getElementById("refreshPickupsBtn")?.addEventListener(
  "click",
  loadPickups
);

// ==================================================
// UPDATE PICKUP STATUS
// ==================================================

async function updatePickup(requestId, action) {
  const actionText = {
    approve: "approve this pickup request",
    reject: "reject this pickup request",
    complete: "mark this pickup as completed",
    cancel: "cancel this pickup request"
  };

  if (!Object.prototype.hasOwnProperty.call(actionText, action)) {
    return;
  }

  if (!window.confirm(`Are you sure you want to ${actionText[action]}?`)) {
    return;
  }

  try {
    await apiRequest(
      `/pickups/${encodeURIComponent(requestId)}/${action}`,
      { method: "PATCH" }
    );

    showMessage(
      "pickupMessage",
      "Pickup status updated successfully.",
      "success"
    );

    await Promise.all([
      loadPickups(),
      loadDonations()
    ]);
  } catch (error) {
    showMessage("pickupMessage", error.message);
  }
}

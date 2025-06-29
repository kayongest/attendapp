// app.js - Client-side only implementation
document.addEventListener("DOMContentLoaded", function () {
  // ======================
  // 1. Data Initialization
  // ======================
  let currentUser = null;
  let allKeys = [];

  // Initialize sample data if none exists
  if (!localStorage.getItem("users")) {
    const initialUsers = [
      {
        id: generateId(),
        username: "admin",
        password: "admin123", // In real apps, NEVER store plain text passwords
        role: "admin",
        createdAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem("users", JSON.stringify(initialUsers));
  }

  if (!localStorage.getItem("keys")) {
    localStorage.setItem("keys", JSON.stringify([]));
  }

  // ======================
  // 2. Core Functions
  // ======================
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  function init() {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        currentUser = {
          username: payload.username,
          role: payload.role,
        };
        showAppPage();
        loadKeys();

        if (currentUser.role === "admin") {
          document.getElementById("adminControls").style.display = "grid"; // Changed to grid
          document.getElementById("userControls").style.display = "none";
        } else {
          document.getElementById("adminControls").style.display = "none";
          document.getElementById("userControls").style.display = "block";
        }
      } catch (e) {
        localStorage.removeItem("token");
        showLoginPage();
      }
    } else {
      showLoginPage();
    }
    document.getElementById("year").textContent = new Date().getFullYear();
  }

  function showLoginPage() {
    document.getElementById("loginPage").style.display = "flex";
    document.getElementById("appPage").style.display = "none";
  }

  function showAppPage() {
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("appPage").style.display = "block";
    document.getElementById("currentUser").textContent = currentUser.username;
    document.getElementById("footerUser").textContent = currentUser.username;
  }

  // ======================
  // 3. User Authentication
  // ======================
  async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const users = JSON.parse(localStorage.getItem("users"));
      const user = users.find(
        (u) => u.username === username && u.password === password
      );

      if (!user) {
        throw new Error("Invalid username or password");
      }

      // Create a simple "token" (insecure for production)
      const token = btoa(
        JSON.stringify({
          username: user.username,
          role: user.role,
          exp: Date.now() + 3600000, // 1 hour expiration
        })
      );

      localStorage.setItem("token", token);
      currentUser = {
        username: user.username,
        role: user.role,
      };

      showAppPage();
      loadKeys();

      // Update UI based on role
      if (currentUser.role === "admin") {
        document.getElementById("adminControls").style.display = "grid";
        document.getElementById("userControls").style.display = "none";
      } else {
        document.getElementById("adminControls").style.display = "none";
        document.getElementById("userControls").style.display = "block";
      }
    } catch (error) {
      document.getElementById("loginError").textContent = error.message;
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    currentUser = null;
    showLoginPage();
  }

  // ======================
  // 4. User Management (Admin Only)
  // ======================
  function toggleUsersSection() {
    const usersSection = document.getElementById("usersSection");
    usersSection.style.display =
      usersSection.style.display === "none" ? "block" : "none";
    if (usersSection.style.display === "block") {
      loadUsers();
    }
  }

  function loadUsers() {
    const users = JSON.parse(localStorage.getItem("users"));
    const usersTableBody = document.getElementById("usersTableBody");
    usersTableBody.innerHTML = "";

    users.forEach((user) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${user.username}</td>
        <td>${user.role}</td>
        <td>${new Date(user.createdAt).toLocaleDateString()}</td>
      `;
      usersTableBody.appendChild(row);
    });
  }

  function handleAddUser(e) {
    e.preventDefault();
    const username = document.getElementById("newUsername").value;
    const password = document.getElementById("newPassword").value;
    const role = document.getElementById("newUserRole").value;

    try {
      const users = JSON.parse(localStorage.getItem("users"));

      if (users.some((u) => u.username === username)) {
        throw new Error("Username already exists");
      }

      const newUser = {
        id: generateId(),
        username,
        password, // In real apps, hash this password
        role,
        createdAt: new Date().toISOString(),
      };

      users.push(newUser);
      localStorage.setItem("users", JSON.stringify(users));

      loadUsers();
      document.getElementById("addUserForm").reset();
      alert(`User ${username} added successfully`);
    } catch (error) {
      alert(error.message);
    }
  }

  function handlePasswordReset(e) {
    e.preventDefault();
    const username = document.getElementById("resetUsername").value;
    const newPassword = document.getElementById("newPassword").value;

    try {
      const users = JSON.parse(localStorage.getItem("users"));
      const userIndex = users.findIndex((u) => u.username === username);

      if (userIndex === -1) {
        throw new Error("User not found");
      }

      users[userIndex].password = newPassword; // In real apps, hash this
      localStorage.setItem("users", JSON.stringify(users));

      document.getElementById("passwordResetForm").reset();
      alert(`Password for ${username} has been reset`);
    } catch (error) {
      alert(error.message);
    }
  }

  // ======================
  // 5. Key Management
  // ======================
  function loadKeys() {
    allKeys = JSON.parse(localStorage.getItem("keys")) || [];
    renderKeys(allKeys);
  }

  function renderKeys(keys) {
    const keyTableBody = document.getElementById("keyTableBody");
    const keyCardsContainer = document.getElementById("keyCardsContainer");

    keyTableBody.innerHTML = "";
    keyCardsContainer.innerHTML = "";

    if (keys.length === 0) {
      keyTableBody.innerHTML = `
        <tr>
          <td colspan="9" class="empty-message">No key assignments found</td>
        </tr>
      `;
      return;
    }

    // Desktop table view
    keys.forEach((key) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${key.event}</td>
        <td>${key.room}</td>
        <td>${key.device}</td>
        <td class="key-cell">${key.vMixKey}</td>
        <td>${key.user}</td>
        <td>${new Date(key.startDate).toLocaleDateString()}</td>
        <td>${new Date(key.endDate).toLocaleDateString()}</td>
        <td><span class="status-badge ${key.status}">${key.status}</span></td>
        <td class="actions">
          ${
            currentUser?.role === "admin"
              ? `
            <button class="btn-edit" data-id="${key.id}">Edit</button>
            <button class="btn-delete" data-id="${key.id}">Delete</button>
          `
              : '<span class="view-only">View only</span>'
          }
        </td>
      `;
      keyTableBody.appendChild(row);
    });

    // Mobile card view
    if (window.innerWidth <= 768) {
      keys.forEach((key) => {
        const card = document.createElement("div");
        card.className = "key-card";
        card.innerHTML = `
          <div class="card-header">
            <h3>${key.event}</h3>
            <span class="status-badge ${key.status}">${key.status}</span>
          </div>
          <div class="card-body">
            <p><strong>Room:</strong> ${key.room}</p>
            <p><strong>Device:</strong> ${key.device}</p>
            <p><strong>vMix Key:</strong> <span class="key-cell">${
              key.vMixKey
            }</span></p>
            <p><strong>User:</strong> ${key.user}</p>
            <p><strong>Dates:</strong> ${new Date(
              key.startDate
            ).toLocaleDateString()} - ${new Date(
          key.endDate
        ).toLocaleDateString()}</p>
          </div>
          ${
            currentUser?.role === "admin"
              ? `
            <div class="card-actions">
              <button class="btn-edit" data-id="${key.id}">Edit</button>
              <button class="btn-delete" data-id="${key.id}">Delete</button>
            </div>
          `
              : ""
          }
        `;
        keyCardsContainer.appendChild(card);
      });
    }

    // Add event listeners for admin actions
    if (currentUser?.role === "admin") {
      document.querySelectorAll(".btn-edit").forEach((btn) => {
        btn.addEventListener("click", () => editKey(btn.dataset.id));
      });

      document.querySelectorAll(".btn-delete").forEach((btn) => {
        btn.addEventListener("click", () => deleteKey(btn.dataset.id));
      });
    }
  }

  function handleAddKey(e) {
    e.preventDefault();

    if (!currentUser) {
      alert("Please login to add key assignments");
      return;
    }

    const formData = {
      id: generateId(),
      event: document.getElementById("event").value,
      room: document.getElementById("room").value,
      device: document.getElementById("device").value,
      vMixKey: document.getElementById("vMixKey").value,
      user: document.getElementById("user").value,
      status: document.getElementById("status").value,
      startDate: document.getElementById("startDate").value,
      endDate: document.getElementById("endDate").value,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.username,
    };

    try {
      const keys = JSON.parse(localStorage.getItem("keys"));
      keys.push(formData);
      localStorage.setItem("keys", JSON.stringify(keys));

      allKeys.push(formData);
      renderKeys(allKeys);
      document.getElementById("keyForm").reset();
      alert("Key assignment added successfully!");
    } catch (error) {
      alert("Failed to add key: " + error.message);
    }
  }

  function editKey(keyId) {
    const key = allKeys.find((k) => k.id === keyId);
    if (!key) return;

    // Fill the form
    document.getElementById("event").value = key.event;
    document.getElementById("room").value = key.room;
    document.getElementById("device").value = key.device;
    document.getElementById("vMixKey").value = key.vMixKey;
    document.getElementById("user").value = key.user;
    document.getElementById("status").value = key.status;
    document.getElementById("startDate").value = key.startDate.split("T")[0];
    document.getElementById("endDate").value = key.endDate.split("T")[0];

    // Change form to update mode
    const form = document.getElementById("keyForm");
    form.onsubmit = function (e) {
      e.preventDefault();

      const updatedKey = {
        ...key,
        event: document.getElementById("event").value,
        room: document.getElementById("room").value,
        device: document.getElementById("device").value,
        vMixKey: document.getElementById("vMixKey").value,
        user: document.getElementById("user").value,
        status: document.getElementById("status").value,
        startDate: document.getElementById("startDate").value,
        endDate: document.getElementById("endDate").value,
      };

      try {
        const keys = JSON.parse(localStorage.getItem("keys"));
        const index = keys.findIndex((k) => k.id === keyId);
        keys[index] = updatedKey;
        localStorage.setItem("keys", JSON.stringify(keys));

        allKeys = keys;
        renderKeys(allKeys);
        form.reset();
        form.onsubmit = handleAddKey;
        document.querySelector('#keyForm button[type="submit"]').textContent =
          "Add Key Assignment";
        alert("Key updated successfully!");
      } catch (error) {
        alert("Failed to update key: " + error.message);
      }
    };

    document.querySelector('#keyForm button[type="submit"]').textContent =
      "Update Key Assignment";
    document.getElementById("keyForm").scrollIntoView({ behavior: "smooth" });
  }

  function deleteKey(keyId) {
    if (!confirm("Are you sure you want to delete this key assignment?"))
      return;

    try {
      const keys = JSON.parse(localStorage.getItem("keys"));
      const updatedKeys = keys.filter((k) => k.id !== keyId);
      localStorage.setItem("keys", JSON.stringify(updatedKeys));

      allKeys = updatedKeys;
      renderKeys(allKeys);
      alert("Key deleted successfully!");
    } catch (error) {
      alert("Failed to delete key: " + error.message);
    }
  }

  function handleSearch() {
    const searchTerm = document
      .getElementById("searchInput")
      .value.toLowerCase();
    const filteredKeys = allKeys.filter(
      (key) =>
        key.event.toLowerCase().includes(searchTerm) ||
        key.room.toLowerCase().includes(searchTerm) ||
        key.device.toLowerCase().includes(searchTerm) ||
        key.user.toLowerCase().includes(searchTerm) ||
        key.vMixKey.toLowerCase().includes(searchTerm) ||
        key.status.toLowerCase().includes(searchTerm)
    );
    renderKeys(filteredKeys);
  }

  // ======================
  // 6. Event Listeners
  // ======================
  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
  document
    .getElementById("showUsersBtn")
    .addEventListener("click", toggleUsersSection);
  document
    .getElementById("addUserForm")
    .addEventListener("submit", handleAddUser);
  document
    .getElementById("passwordResetForm")
    .addEventListener("submit", handlePasswordReset);
  document.getElementById("keyForm").addEventListener("submit", handleAddKey);
  document
    .getElementById("searchInput")
    .addEventListener("input", handleSearch);

  // Responsive handling
  window.addEventListener("resize", () => renderKeys(allKeys));

  // Initialize the app
  init();
});

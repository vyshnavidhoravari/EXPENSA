
const db = window.expensaSupabase;

// DOM elements
const accountForm = document.getElementById("accountForm");
const accountModal = document.getElementById("accountModal");
const accountsList = document.getElementById("accountsList");
const addAccountButton = document.getElementById("addAccountButton");
const cancelAccountButton = document.getElementById("cancelAccount");
const closeModalButton = document.getElementById("closeModal");
const logoutButton = document.getElementById("logoutButton");

const totalAccounts = document.getElementById("totalAccounts");
const totalBalance = document.getElementById("totalBalance");
const activeAccounts = document.getElementById("activeAccounts");

const accountNameInput = document.getElementById("accountName");
const accountTypeInput = document.getElementById("accountType");
const accountCurrencyInput = document.getElementById("accountCurrency");
const openingBalanceInput = document.getElementById("openingBalance");

const modalTitle = document.getElementById("modalTitle");
const formMessage = document.getElementById("formMessage");
const notification = document.getElementById("notification");

let currentUser = null;
let workspaceId = null;
let accounts = [];
let editingAccountId = null;

const allowedTypes = [
    "cash",
    "bank",
    "savings",
    "credit_card",
    "investment",
    "other"
];

const typeLabels = {
    cash: "Cash",
    bank: "Bank Account",
    savings: "Savings Account",
    credit_card: "Credit Card",
    investment: "Investment",
    other: "Other"
};

const typeIcons = {
    cash: "💵",
    bank: "🏦",
    savings: "🌱",
    credit_card: "💳",
    investment: "📈",
    other: "📁"
};

// Show notification
function showNotification(message) {
    notification.textContent = message;
    notification.classList.add("show");

    setTimeout(() => {
        notification.classList.remove("show");
    }, 3000);
}

// Format currency
function formatCurrency(amount, currency) {
    try {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: currency
        }).format(Number(amount) || 0);
    } catch {
        return `${currency} ${Number(amount || 0).toFixed(2)}`;
    }
}

// Load logged-in user and workspace
async function initializeAccounts() {
    if (!db) {
        showNotification("Supabase connection is missing.");
        return;
    }

    const { data: sessionData, error: sessionError } =
        await db.auth.getSession();

    if (sessionError || !sessionData.session) {
        window.location.replace("auth.html");
        return;
    }

    currentUser = sessionData.session.user;

    await loadProfile();
    await loadWorkspace();
}

// Load profile
async function loadProfile() {
    const { data, error } = await db
        .from("profiles")
        .select("full_name, email")
        .eq("id", currentUser.id)
        .maybeSingle();

    if (error) {
        console.error("Profile error:", error.message);
        return;
    }

    const userName = document.getElementById("userName");
    const userAvatar = document.getElementById("userAvatar");

    const name = data?.full_name || currentUser.email;

    if (userName) userName.textContent = name;
    if (userAvatar) userAvatar.textContent = name.charAt(0).toUpperCase();
}

// Get user's workspace
async function loadWorkspace() {
    const { data, error } = await db
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", currentUser.id)
        .order("joined_at", { ascending: true })
        .limit(1);

    if (error || !data || data.length === 0) {
        showNotification("Your personal workspace could not be found.");
        console.error(error);
        return;
    }

    workspaceId = data[0].workspace_id;

    await loadAccounts();
}

// Fetch accounts
async function loadAccounts() {
    const { data, error } = await db
        .from("accounts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Accounts error:", error.message);
        showNotification("Unable to load accounts.");
        return;
    }

    accounts = data || [];

    renderAccounts();
    updateSummary();
}

// Render account cards
function renderAccounts() {
    accountsList.innerHTML = "";

    if (accounts.length === 0) {
        accountsList.innerHTML = `
            <div class="empty-state">
                <h3>No accounts added yet</h3>
                <p>Add your first financial account to get started.</p>
            </div>
        `;
        return;
    }

    accounts.forEach(account => {
        const card = document.createElement("div");
        card.className = "account-card";

        const heading = document.createElement("div");
        heading.className = "account-card-header";

        const icon = document.createElement("span");
        icon.className = "account-icon";
        icon.textContent = typeIcons[account.account_type] || "📁";

        const details = document.createElement("div");
        details.className = "account-details";

        const name = document.createElement("h3");
        name.textContent = account.account_name;

        const type = document.createElement("p");
        type.textContent = typeLabels[account.account_type] || "Other";

        details.append(name, type);
        heading.append(icon, details);

        const balance = document.createElement("h2");
        balance.className = "account-balance";
        balance.textContent = formatCurrency(
            account.opening_balance,
            account.currency
        );

        const status = document.createElement("p");
        status.className = "account-status";
        status.textContent = account.is_active ? "Active" : "Inactive";

        const actions = document.createElement("div");
        actions.className = "account-actions";

        const editButton = createActionButton("Edit", "edit", account.id);
        const toggleButton = createActionButton(
            account.is_active ? "Deactivate" : "Activate",
            "toggle",
            account.id
        );
        const deleteButton = createActionButton("Delete", "delete", account.id);

        actions.append(editButton, toggleButton, deleteButton);

        card.append(heading, balance, status, actions);
        accountsList.appendChild(card);
    });
}

// Create action buttons safely
function createActionButton(label, action, id) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.action = action;
    button.dataset.id = id;
    return button;
}

// Update summary cards
function updateSummary() {
    const active = accounts.filter(account => account.is_active);

    totalAccounts.textContent = accounts.length;
    activeAccounts.textContent = active.length;

    // Never add different currencies together.
    const totals = {};

    active.forEach(account => {
        const currency = account.currency;
        totals[currency] = (totals[currency] || 0) +
            Number(account.opening_balance || 0);
    });

    const summary = Object.entries(totals)
        .map(([currency, amount]) => formatCurrency(amount, currency))
        .join(" · ");

    totalBalance.textContent = summary || "—";
}

// Open modal for new account
function openAddModal() {
    editingAccountId = null;
    accountForm.reset();

    modalTitle.textContent = "Add New Account";
    formMessage.textContent = "";

    accountModal.classList.remove("hidden");
}

// Close modal
function closeModal() {
    accountModal.classList.add("hidden");
    accountForm.reset();
    formMessage.textContent = "";
    editingAccountId = null;
}

// Edit account
function openEditModal(id) {
    const account = accounts.find(item => item.id === id);

    if (!account) return;

    editingAccountId = id;

    modalTitle.textContent = "Edit Account";
    accountNameInput.value = account.account_name;
    accountTypeInput.value = account.account_type;
    accountCurrencyInput.value = account.currency;
    openingBalanceInput.value = account.opening_balance;

    formMessage.textContent = "";
    accountModal.classList.remove("hidden");
}

// Add or update account
accountForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const accountName = accountNameInput.value.trim();
    const accountType = accountTypeInput.value;
    const currency = accountCurrencyInput.value;
    const balance = Number(openingBalanceInput.value);

    if (!accountName || !allowedTypes.includes(accountType)) {
        formMessage.textContent = "Please enter valid account details.";
        return;
    }

    if (!Number.isFinite(balance) || balance < 0) {
        formMessage.textContent = "Enter a valid opening balance.";
        return;
    }

    const accountData = {
        account_name: accountName,
        account_type: accountType,
        currency: currency,
        opening_balance: balance
    };

    const saveButton = document.getElementById("saveAccount");
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    let result;

    if (editingAccountId) {
        result = await db
            .from("accounts")
            .update(accountData)
            .eq("id", editingAccountId)
            .eq("workspace_id", workspaceId)
            .select()
            .single();
    } else {
        result = await db
            .from("accounts")
            .insert({
                ...accountData,
                workspace_id: workspaceId,
                is_active: true
            })
            .select()
            .single();
    }

    saveButton.disabled = false;
    saveButton.textContent = "Save Account";

    if (result.error) {
        console.error(result.error);
        formMessage.textContent = result.error.message;
        return;
    }

    closeModal();

    showNotification(
        editingAccountId
            ? "Account updated successfully."
            : "Account added successfully."
    );

    editingAccountId = null;
    await loadAccounts();
});

// Handle account actions
accountsList.addEventListener("click", async function(event) {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    if (action === "edit") {
        openEditModal(id);
        return;
    }

    if (action === "toggle") {
        const account = accounts.find(item => item.id === id);

        if (!account) return;

        const { error } = await db
            .from("accounts")
            .update({ is_active: !account.is_active })
            .eq("id", id)
            .eq("workspace_id", workspaceId);

        if (error) {
            showNotification(error.message);
            return;
        }

        showNotification(
            account.is_active
                ? "Account deactivated."
                : "Account activated."
        );

        await loadAccounts();
    }

    if (action === "delete") {
        const confirmed = confirm(
            "Are you sure you want to delete this account?"
        );

        if (!confirmed) return;

        const { error } = await db
            .from("accounts")
            .delete()
            .eq("id", id)
            .eq("workspace_id", workspaceId);

        if (error) {
            console.error(error);
            showNotification(
                "This account may contain transactions. Deactivate it instead."
            );
            return;
        }

        showNotification("Account deleted successfully.");
        await loadAccounts();
    }
});

// Button events
addAccountButton.addEventListener("click", openAddModal);
cancelAccountButton.addEventListener("click", closeModal);
closeModalButton.addEventListener("click", closeModal);

// Logout
logoutButton.addEventListener("click", async function() {
    const { error } = await db.auth.signOut();

    if (error) {
        showNotification("Unable to log out.");
        return;
    }

    window.location.replace("auth.html");
});

// Start application
initializeAccounts();

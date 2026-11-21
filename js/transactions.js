
// ============================================
// EXPENSA - TRANSACTIONS MODULE
// Supabase + Vanilla JavaScript
// ============================================

const db = window.expensaSupabase;

// DOM elements
const transactionForm = document.getElementById("transactionForm");
const transactionModal = document.getElementById("transactionModal");
const transactionsList = document.getElementById("transactionsList");

const addTransactionButton = document.getElementById("addTransactionButton");
const closeModalButton = document.getElementById("closeModal");
const cancelTransactionButton = document.getElementById("cancelTransaction");
const logoutButton = document.getElementById("logoutButton");

const transactionType = document.getElementById("transactionType");
const transactionAmount = document.getElementById("transactionAmount");
const transactionCategory = document.getElementById("transactionCategory");
const transactionAccount = document.getElementById("transactionAccount");
const transactionDate = document.getElementById("transactionDate");
const transactionDescription = document.getElementById("transactionDescription");

const searchInput = document.getElementById("searchTransaction");
const typeFilter = document.getElementById("typeFilter");
const categoryFilter = document.getElementById("categoryFilter");
const dateFilter = document.getElementById("dateFilter");
const clearFiltersButton = document.getElementById("clearFilters");

const totalIncomeElement = document.getElementById("totalIncome");
const totalExpensesElement = document.getElementById("totalExpenses");
const netCashFlowElement = document.getElementById("netCashFlow");
const transactionCountElement = document.getElementById("transactionCount");

const modalTitle = document.getElementById("modalTitle");
const formMessage = document.getElementById("formMessage");
const saveButton = document.getElementById("saveTransaction");
const notification = document.getElementById("notification");

// Application state
let currentUser = null;
let workspaceId = null;
let transactions = [];
let accounts = [];
let editingTransactionId = null;

// ============================================
// NOTIFICATIONS
// ============================================

function showNotification(message) {
    notification.textContent = message;
    notification.classList.add("show");

    setTimeout(() => {
        notification.classList.remove("show");
    }, 3000);
}

// ============================================
// CURRENCY FORMAT
// ============================================

function formatCurrency(amount, currency) {
    try {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: currency
        }).format(Number(amount) || 0);
    } catch {
        return `${currency} ${(Number(amount) || 0).toFixed(2)}`;
    }
}

// ============================================
// INITIALIZATION
// ============================================

async function initializeTransactions() {
    if (!db) {
        showNotification("Supabase connection is missing.");
        return;
    }

    const { data, error } = await db.auth.getSession();

    if (error || !data.session) {
        window.location.replace("auth.html");
        return;
    }

    currentUser = data.session.user;

    await loadProfile();
    await loadWorkspace();
}

async function loadProfile() {
    const { data, error } = await db
        .from("profiles")
        .select("full_name")
        .eq("id", currentUser.id)
        .maybeSingle();

    if (error) {
        console.error("Profile error:", error.message);
        return;
    }

    const userName = document.getElementById("userName");

    if (userName) {
        userName.textContent = data?.full_name || currentUser.email;
    }
}

// ============================================
// LOAD WORKSPACE
// ============================================

async function loadWorkspace() {
    const { data, error } = await db
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", currentUser.id)
        .order("joined_at", { ascending: true })
        .limit(1);

    if (error || !data || data.length === 0) {
        console.error("Workspace error:", error);
        showNotification("Personal workspace not found.");
        return;
    }

    workspaceId = data[0].workspace_id;

    await loadAccounts();
    await loadTransactions();
}

// ============================================
// LOAD ACCOUNTS
// ============================================

async function loadAccounts() {
    const { data, error } = await db
        .from("accounts")
        .select("id, account_name, currency, is_active")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("account_name");

    if (error) {
        console.error("Account loading error:", error.message);
        showNotification("Unable to load accounts.");
        return;
    }

    accounts = data || [];
    populateAccountDropdown();
}

function populateAccountDropdown(selectedId = "") {
    transactionAccount.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = accounts.length
        ? "Select Financial Account"
        : "No active accounts available";

    transactionAccount.appendChild(defaultOption);

    accounts.forEach(account => {
        const option = document.createElement("option");
        option.value = account.id;
        option.textContent =
            `${account.account_name} (${account.currency})`;

        transactionAccount.appendChild(option);
    });

    transactionAccount.value = selectedId;
}

// ============================================
// LOAD TRANSACTIONS
// ============================================

async function loadTransactions() {
    const { data, error } = await db
        .from("transactions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Transaction loading error:", error.message);
        showNotification("Unable to load transactions.");
        return;
    }

    transactions = data || [];

    renderTransactions();
    updateSummary();
    populateCategoryFilter();
}

// ============================================
// RENDER TRANSACTIONS
// ============================================

function renderTransactions() {
    transactionsList.innerHTML = "";

    const filtered = getFilteredTransactions();

    if (filtered.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 7;
        cell.className = "empty-message";
        cell.textContent = "No transactions found.";

        row.appendChild(cell);
        transactionsList.appendChild(row);
        return;
    }

    filtered.forEach(transaction => {
        const row = document.createElement("tr");

        const account = accounts.find(
            item => item.id === transaction.account_id
        );

        const descriptionCell = document.createElement("td");
        descriptionCell.textContent =
            transaction.description || "No description";

        const categoryCell = document.createElement("td");
        categoryCell.textContent = transaction.category;

        const accountCell = document.createElement("td");
        accountCell.textContent = account
            ? account.account_name
            : "Unavailable account";

        const dateCell = document.createElement("td");
        dateCell.textContent = transaction.transaction_date;

        const typeCell = document.createElement("td");
        const badge = document.createElement("span");

        badge.className = transaction.transaction_type === "income"
            ? "type-badge type-income"
            : "type-badge type-expense";

        badge.textContent =
            transaction.transaction_type === "income"
                ? "Income"
                : "Expense";

        typeCell.appendChild(badge);

        const amountCell = document.createElement("td");

        const sign = transaction.transaction_type === "income"
            ? "+"
            : "-";

        amountCell.textContent =
            sign + formatCurrency(
                transaction.amount,
                account?.currency || "INR"
            );

        const actionsCell = document.createElement("td");
        const actions = document.createElement("div");

        actions.className = "table-actions";

        const editButton = createActionButton(
            "Edit",
            "edit",
            transaction.id
        );

        const deleteButton = createActionButton(
            "Delete",
            "delete",
            transaction.id
        );

        deleteButton.classList.add("delete-button");

        actions.append(editButton, deleteButton);
        actionsCell.appendChild(actions);

        row.append(
            descriptionCell,
            categoryCell,
            accountCell,
            dateCell,
            typeCell,
            amountCell,
            actionsCell
        );

        transactionsList.appendChild(row);
    });
}

function createActionButton(label, action, id) {
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = label;
    button.dataset.action = action;
    button.dataset.id = id;

    return button;
}

// ============================================
// FILTER TRANSACTIONS
// ============================================

function getFilteredTransactions() {
    const search = searchInput.value.toLowerCase().trim();
    const selectedType = typeFilter.value;
    const selectedCategory = categoryFilter.value;
    const selectedDate = dateFilter.value;

    return transactions.filter(transaction => {
        const account = accounts.find(
            item => item.id === transaction.account_id
        );

        const matchesSearch =
            (transaction.description || "").toLowerCase().includes(search) ||
            (transaction.category || "").toLowerCase().includes(search) ||
            (account?.account_name || "").toLowerCase().includes(search);

        const matchesType =
            selectedType === "all" ||
            transaction.transaction_type === selectedType;

        const matchesCategory =
            selectedCategory === "all" ||
            transaction.category === selectedCategory;

        const matchesDate =
            !selectedDate ||
            transaction.transaction_date === selectedDate;

        return (
            matchesSearch &&
            matchesType &&
            matchesCategory &&
            matchesDate
        );
    });
}

function populateCategoryFilter() {
    const currentValue = categoryFilter.value;

    const categories = [
        ...new Set(
            transactions.map(item => item.category).filter(Boolean)
        )
    ].sort();

    categoryFilter.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All Categories";

    categoryFilter.appendChild(allOption);

    categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;

        categoryFilter.appendChild(option);
    });

    categoryFilter.value = categories.includes(currentValue)
        ? currentValue
        : "all";
}

function applyFilters() {
    renderTransactions();
}

// ============================================
// SUMMARY CALCULATIONS
// ============================================

function updateSummary() {
    const totals = {};

    transactions.forEach(transaction => {
        const account = accounts.find(
            item => item.id === transaction.account_id
        );

        const currency = account?.currency || "INR";

        if (!totals[currency]) {
            totals[currency] = {
                income: 0,
                expenses: 0
            };
        }

        if (transaction.transaction_type === "income") {
            totals[currency].income += Number(transaction.amount);
        } else {
            totals[currency].expenses += Number(transaction.amount);
        }
    });

    totalIncomeElement.textContent = formatGroupedTotals(
        totals,
        "income"
    );

    totalExpensesElement.textContent = formatGroupedTotals(
        totals,
        "expenses"
    );

    netCashFlowElement.textContent = formatGroupedNet(totals);

    transactionCountElement.textContent = transactions.length;
}

function formatGroupedTotals(totals, key) {
    const values = Object.entries(totals)
        .map(([currency, amounts]) =>
            formatCurrency(amounts[key], currency)
        );

    return values.length ? values.join(" · ") : "—";
}

function formatGroupedNet(totals) {
    const values = Object.entries(totals).map(
        ([currency, amounts]) => {
            const net = amounts.income - amounts.expenses;
            return formatCurrency(net, currency);
        }
    );

    return values.length ? values.join(" · ") : "—";
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function openAddModal() {
    if (accounts.length === 0) {
        showNotification("Add an active account before recording a transaction.");
        return;
    }

    editingTransactionId = null;

    transactionForm.reset();

    modalTitle.textContent = "Add Transaction";
    saveButton.textContent = "Save Transaction";
    formMessage.textContent = "";

    populateAccountDropdown();

    transactionDate.value =
        new Date().toLocaleDateString("en-CA");

    transactionModal.classList.remove("hidden");
}

function closeModal() {
    transactionModal.classList.add("hidden");
    transactionForm.reset();
    formMessage.textContent = "";
    editingTransactionId = null;
}

function openEditModal(id) {
    const transaction = transactions.find(
        item => item.id === id
    );

    if (!transaction) return;

    const account = accounts.find(
        item => item.id === transaction.account_id
    );

    if (!account) {
        showNotification("The original account is unavailable or inactive.");
        return;
    }

    editingTransactionId = id;

    modalTitle.textContent = "Edit Transaction";
    saveButton.textContent = "Update Transaction";

    transactionType.value = transaction.transaction_type;
    transactionAmount.value = transaction.amount;
    transactionCategory.value = transaction.category;
    transactionDate.value = transaction.transaction_date;
    transactionDescription.value = transaction.description || "";

    populateAccountDropdown(transaction.account_id);

    formMessage.textContent = "";
    transactionModal.classList.remove("hidden");
}

// ============================================
// ADD OR UPDATE TRANSACTION
// ============================================

transactionForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const amount = Number(transactionAmount.value);
    const selectedAccount = accounts.find(
        item => item.id === transactionAccount.value
    );

    if (!selectedAccount) {
        formMessage.textContent = "Please select an active financial account.";
        return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        formMessage.textContent = "Please enter an amount greater than zero.";
        return;
    }

    const transactionData = {
        workspace_id: workspaceId,
        account_id: selectedAccount.id,
        transaction_type: transactionType.value,
        amount: amount,
        category: transactionCategory.value,
        description: transactionDescription.value.trim(),
        transaction_date: transactionDate.value
    };

    if (
        !["income", "expense"].includes(transactionData.transaction_type) ||
        !transactionData.category ||
        !transactionData.transaction_date
    ) {
        formMessage.textContent = "Please complete all required fields.";
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    let result;

    if (editingTransactionId) {
        result = await db
            .from("transactions")
            .update(transactionData)
            .eq("id", editingTransactionId)
            .eq("workspace_id", workspaceId)
            .select()
            .single();
    } else {
        result = await db
            .from("transactions")
            .insert(transactionData)
            .select()
            .single();
    }

    saveButton.disabled = false;
    saveButton.textContent = editingTransactionId
        ? "Update Transaction"
        : "Save Transaction";

    if (result.error) {
        console.error("Save error:", result.error);
        formMessage.textContent = result.error.message;
        return;
    }

    const wasEditing = Boolean(editingTransactionId);

    closeModal();

    showNotification(
        wasEditing
            ? "Transaction updated successfully."
            : "Transaction added successfully."
    );

    await loadTransactions();
});

// ============================================
// EDIT AND DELETE ACTIONS
// ============================================

transactionsList.addEventListener("click", async function(event) {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    if (action === "edit") {
        openEditModal(id);
        return;
    }

    if (action === "delete") {
        const confirmed = confirm(
            "Are you sure you want to delete this transaction?"
        );

        if (!confirmed) return;

        const { error } = await db
            .from("transactions")
            .delete()
            .eq("id", id)
            .eq("workspace_id", workspaceId);

        if (error) {
            console.error("Delete error:", error.message);
            showNotification("Unable to delete transaction.");
            return;
        }

        showNotification("Transaction deleted successfully.");

        await loadTransactions();
    }
});

// ============================================
// FILTER EVENTS
// ============================================

searchInput.addEventListener("input", applyFilters);
typeFilter.addEventListener("change", applyFilters);
categoryFilter.addEventListener("change", applyFilters);
dateFilter.addEventListener("change", applyFilters);

clearFiltersButton.addEventListener("click", function() {
    searchInput.value = "";
    typeFilter.value = "all";
    categoryFilter.value = "all";
    dateFilter.value = "";

    renderTransactions();
});

// ============================================
// BUTTON EVENTS
// ============================================

addTransactionButton.addEventListener("click", openAddModal);

closeModalButton.addEventListener("click", closeModal);

cancelTransactionButton.addEventListener("click", closeModal);

logoutButton.addEventListener("click", async function() {
    const { error } = await db.auth.signOut();

    if (error) {
        showNotification("Unable to sign out.");
        return;
    }

    window.location.replace("auth.html");
});

// ============================================
// START APPLICATION
// ============================================

initializeTransactions();

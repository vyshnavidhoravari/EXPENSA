
// ============================================
// EXPENSA - BUDGET MANAGEMENT
// Supabase + Vanilla JavaScript
// ============================================

const db = window.expensaSupabase;

// DOM elements
const budgetForm = document.getElementById("budgetForm");
const budgetModal = document.getElementById("budgetModal");
const budgetsList = document.getElementById("budgetsList");

const addBudgetButton = document.getElementById("addBudgetButton");
const closeModalButton = document.getElementById("closeModal");
const cancelBudgetButton = document.getElementById("cancelBudget");
const logoutButton = document.getElementById("logoutButton");

const budgetCategory = document.getElementById("budgetCategory");
const budgetAmount = document.getElementById("budgetAmount");
const budgetCurrency = document.getElementById("budgetCurrency");
const budgetStartDate = document.getElementById("budgetStartDate");
const budgetEndDate = document.getElementById("budgetEndDate");
const budgetMonth = document.getElementById("budgetMonth");

const totalBudgetElement = document.getElementById("totalBudget");
const totalSpentElement = document.getElementById("totalSpent");
const remainingBudgetElement = document.getElementById("remainingBudget");
const activeBudgetsElement = document.getElementById("activeBudgets");

const modalTitle = document.getElementById("modalTitle");
const formMessage = document.getElementById("formMessage");
const saveButton = document.getElementById("saveBudget");
const notification = document.getElementById("notification");

// Application state
let currentUser = null;
let workspaceId = null;
let budgets = [];
let transactions = [];
let accounts = [];
let editingBudgetId = null;

const categoryIcons = {
    Food: "🍽️",
    Transport: "🚗",
    Shopping: "🛍️",
    Education: "📚",
    Healthcare: "🏥",
    Bills: "💡",
    Entertainment: "🎬",
    Other: "📁"
};

// ============================================
// DATE HELPERS
// ============================================

function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getCurrentMonth() {
    return getLocalDateString().slice(0, 7);
}

function getMonthRange(month) {
    const [year, monthNumber] = month.split("-").map(Number);

    const start = `${year}-${String(monthNumber).padStart(2, "0")}-01`;

    const lastDay = new Date(year, monthNumber, 0).getDate();

    const end =
        `${year}-${String(monthNumber).padStart(2, "0")}-${lastDay}`;

    return { start, end };
}

// ============================================
// NOTIFICATIONS AND FORMATTING
// ============================================

function showNotification(message) {
    notification.textContent = message;
    notification.classList.add("show");

    setTimeout(() => {
        notification.classList.remove("show");
    }, 3000);
}

function formatCurrency(amount, currency) {
    try {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency
        }).format(Number(amount) || 0);
    } catch {
        return `${currency} ${(Number(amount) || 0).toFixed(2)}`;
    }
}

// ============================================
// INITIALIZATION
// ============================================

async function initializeBudgets() {
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

    budgetMonth.value = getCurrentMonth();

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
// WORKSPACE
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
    await loadBudgets();
}

// ============================================
// LOAD ACCOUNTS AND TRANSACTIONS
// ============================================

async function loadAccounts() {
    const { data, error } = await db
        .from("accounts")
        .select("id, currency")
        .eq("workspace_id", workspaceId);

    if (error) {
        console.error("Accounts error:", error.message);
        showNotification("Unable to load accounts.");
        return;
    }

    accounts = data || [];
}

async function loadBudgets() {
    const { data, error } = await db
        .from("budgets")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("start_date", { ascending: false });

    if (error) {
        console.error("Budgets error:", error.message);
        showNotification("Unable to load budgets.");
        return;
    }

    budgets = data || [];

    await loadTransactions();
}

async function loadTransactions() {
    const { data, error } = await db
        .from("transactions")
        .select("id, account_id, transaction_type, amount, category, transaction_date")
        .eq("workspace_id", workspaceId)
        .eq("transaction_type", "expense");

    if (error) {
        console.error("Transactions error:", error.message);
        showNotification("Unable to load expense records.");
        return;
    }

    transactions = data || [];

    renderBudgets();
    updateSummary();
}

// ============================================
// BUDGET SPENDING CALCULATION
// ============================================

function getBudgetSpending(budget) {
    return transactions.reduce((total, transaction) => {
        const account = accounts.find(
            item => item.id === transaction.account_id
        );

        const matchesCategory =
            transaction.category === budget.category;

        const matchesCurrency =
            account && account.currency === budget.currency;

        const matchesDate =
            transaction.transaction_date >= budget.start_date &&
            transaction.transaction_date <= budget.end_date;

        if (matchesCategory && matchesCurrency && matchesDate) {
            return total + Number(transaction.amount);
        }

        return total;
    }, 0);
}

// ============================================
// FILTER BUDGETS BY SELECTED MONTH
// ============================================

function getVisibleBudgets() {
    const month = budgetMonth.value;

    if (!month) return [];

    const range = getMonthRange(month);

    return budgets.filter(budget =>
        budget.start_date <= range.end &&
        budget.end_date >= range.start
    );
}

// ============================================
// RENDER BUDGET CARDS
// ============================================

function renderBudgets() {
    budgetsList.innerHTML = "";

    const visibleBudgets = getVisibleBudgets();

    if (visibleBudgets.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";

        const heading = document.createElement("h3");
        heading.textContent = "No budgets for this month";

        const description = document.createElement("p");
        description.textContent =
            "Create your first category budget to start tracking spending.";

        empty.append(heading, description);
        budgetsList.appendChild(empty);
        return;
    }

    visibleBudgets.forEach(budget => {
        const spent = getBudgetSpending(budget);
        const limit = Number(budget.budget_amount);
        const remaining = limit - spent;

        const percentage = limit > 0
            ? (spent / limit) * 100
            : 0;

        const progressWidth = Math.min(percentage, 100);

        const card = document.createElement("article");
        card.className = "budget-card";

        const header = document.createElement("div");
        header.className = "budget-card-header";

        const headingDetails = document.createElement("div");

        const heading = document.createElement("h3");
        heading.textContent = budget.category;

        const dates = document.createElement("p");
        dates.textContent =
            `${budget.start_date} to ${budget.end_date}`;

        headingDetails.append(heading, dates);

        const icon = document.createElement("span");
        icon.className = "budget-icon";
        icon.textContent = categoryIcons[budget.category] || "📁";

        header.append(headingDetails, icon);

        const amounts = document.createElement("div");
        amounts.className = "budget-amounts";

        const spentDetails = document.createElement("div");

        const spentHeading = document.createElement("p");
        spentHeading.textContent = "Spent";

        const spentValue = document.createElement("h2");
        spentValue.textContent =
            formatCurrency(spent, budget.currency);

        spentDetails.append(spentHeading, spentValue);

        const limitDetails = document.createElement("div");

        const limitHeading = document.createElement("p");
        limitHeading.textContent = "Budget limit";

        const limitValue = document.createElement("h2");
        limitValue.textContent =
            formatCurrency(limit, budget.currency);

        limitDetails.append(limitHeading, limitValue);

        amounts.append(spentDetails, limitDetails);

        const progress = document.createElement("div");
        progress.className = "budget-progress";

        const progressFill = document.createElement("div");
        progressFill.className = "budget-progress-fill";

        if (percentage >= 100) {
            progressFill.classList.add("danger");
        } else if (percentage >= 80) {
            progressFill.classList.add("warning");
        }

        progressFill.style.width = `${progressWidth}%`;

        progress.appendChild(progressFill);

        const footer = document.createElement("div");
        footer.className = "budget-footer";

        const remainingText = document.createElement("p");

        remainingText.textContent = remaining >= 0
            ? `${formatCurrency(remaining, budget.currency)} remaining`
            : `${formatCurrency(Math.abs(remaining), budget.currency)} over budget`;

        const percentageText = document.createElement("p");
        percentageText.textContent =
            `${percentage.toFixed(1)}% used`;

        const actions = document.createElement("div");
        actions.className = "budget-actions";

        const editButton = createActionButton(
            "Edit",
            "edit",
            budget.id
        );

        const deleteButton = createActionButton(
            "Delete",
            "delete",
            budget.id
        );

        deleteButton.classList.add("delete-button");

        actions.append(editButton, deleteButton);
        footer.append(remainingText, percentageText, actions);

        card.append(header, amounts, progress, footer);
        budgetsList.appendChild(card);
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
// SUMMARY CARDS
// ============================================

function updateSummary() {
    const visibleBudgets = getVisibleBudgets();

    const totals = {};

    visibleBudgets.forEach(budget => {
        if (!totals[budget.currency]) {
            totals[budget.currency] = {
                budget: 0,
                spent: 0
            };
        }

        totals[budget.currency].budget +=
            Number(budget.budget_amount);

        totals[budget.currency].spent +=
            getBudgetSpending(budget);
    });

    totalBudgetElement.textContent =
        formatGroupedTotals(totals, "budget");

    totalSpentElement.textContent =
        formatGroupedTotals(totals, "spent");

    const remainingTotals = Object.entries(totals).map(
        ([currency, values]) => ({
            currency,
            remaining: values.budget - values.spent
        })
    );

    remainingBudgetElement.textContent =
        remainingTotals.length
            ? remainingTotals.map(item =>
                formatCurrency(item.remaining, item.currency)
            ).join(" · ")
            : "—";

    activeBudgetsElement.textContent = visibleBudgets.length;
}

function formatGroupedTotals(totals, key) {
    const values = Object.entries(totals).map(
        ([currency, amounts]) =>
            formatCurrency(amounts[key], currency)
    );

    return values.length ? values.join(" · ") : "—";
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function openAddModal() {
    editingBudgetId = null;

    budgetForm.reset();

    modalTitle.textContent = "Create Budget";
    saveButton.textContent = "Save Budget";
    formMessage.textContent = "";

    const month = budgetMonth.value || getCurrentMonth();
    const range = getMonthRange(month);

    budgetStartDate.value = range.start;
    budgetEndDate.value = range.end;

    budgetModal.classList.remove("hidden");
}

function closeModal() {
    budgetModal.classList.add("hidden");
    budgetForm.reset();
    formMessage.textContent = "";
    editingBudgetId = null;
}

function openEditModal(id) {
    const budget = budgets.find(item => item.id === id);

    if (!budget) return;

    editingBudgetId = id;

    modalTitle.textContent = "Edit Budget";
    saveButton.textContent = "Update Budget";

    budgetCategory.value = budget.category;
    budgetAmount.value = budget.budget_amount;
    budgetCurrency.value = budget.currency;
    budgetStartDate.value = budget.start_date;
    budgetEndDate.value = budget.end_date;

    formMessage.textContent = "";
    budgetModal.classList.remove("hidden");
}

// ============================================
// ADD OR UPDATE BUDGET
// ============================================

budgetForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const amount = Number(budgetAmount.value);
    const startDate = budgetStartDate.value;
    const endDate = budgetEndDate.value;

    if (!Number.isFinite(amount) || amount <= 0) {
        formMessage.textContent =
            "Enter a budget amount greater than zero.";
        return;
    }

    if (!startDate || !endDate || endDate < startDate) {
        formMessage.textContent =
            "Please select a valid budget date range.";
        return;
    }

    const budgetData = {
        workspace_id: workspaceId,
        category: budgetCategory.value,
        budget_amount: amount,
        currency: budgetCurrency.value,
        start_date: startDate,
        end_date: endDate
    };

    if (!budgetData.category) {
        formMessage.textContent = "Please select a category.";
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    let result;

    if (editingBudgetId) {
        result = await db
            .from("budgets")
            .update({
                ...budgetData,
                updated_at: new Date().toISOString()
            })
            .eq("id", editingBudgetId)
            .eq("workspace_id", workspaceId)
            .select()
            .single();
    } else {
        result = await db
            .from("budgets")
            .insert(budgetData)
            .select()
            .single();
    }

    saveButton.disabled = false;
    saveButton.textContent = editingBudgetId
        ? "Update Budget"
        : "Save Budget";

    if (result.error) {
        console.error("Budget save error:", result.error);
        formMessage.textContent = result.error.message;
        return;
    }

    const wasEditing = Boolean(editingBudgetId);

    closeModal();

    showNotification(
        wasEditing
            ? "Budget updated successfully."
            : "Budget created successfully."
    );

    await loadBudgets();
});

// ============================================
// EDIT AND DELETE ACTIONS
// ============================================

budgetsList.addEventListener("click", async function(event) {
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
            "Are you sure you want to delete this budget?"
        );

        if (!confirmed) return;

        const { error } = await db
            .from("budgets")
            .delete()
            .eq("id", id)
            .eq("workspace_id", workspaceId);

        if (error) {
            console.error("Budget delete error:", error);
            showNotification("Unable to delete this budget.");
            return;
        }

        showNotification("Budget deleted successfully.");

        await loadBudgets();
    }
});

// ============================================
// EVENT LISTENERS
// ============================================

addBudgetButton.addEventListener("click", openAddModal);

closeModalButton.addEventListener("click", closeModal);

cancelBudgetButton.addEventListener("click", closeModal);

budgetMonth.addEventListener("change", function() {
    renderBudgets();
    updateSummary();
});

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

initializeBudgets();

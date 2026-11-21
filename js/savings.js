
const db = window.expensaSupabase;

let currentUser = null;
let workspaceId = null;
let goals = [];
let contributions = [];
let editingGoalId = null;

const $ = (id) => document.getElementById(id);

function showNotification(message, type = "success") {
    const notification = $("notification");
    notification.textContent = message;
    notification.className = `notification show ${type}`;

    setTimeout(() => {
        notification.classList.remove("show");
    }, 3000);
}

function formatMoney(amount, currency = "INR") {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 2
    }).format(Number(amount) || 0);
}

function getToday() {
    const date = new Date();
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000)
        .toISOString()
        .split("T")[0];
}

function getSavedAmount(goalId) {
    return contributions
        .filter(item => item.goal_id === goalId)
        .reduce((total, item) => total + Number(item.amount), 0);
}

async function initializePage() {
    if (!db) {
        showNotification("Supabase connection not found.", "error");
        return;
    }

    const { data: sessionData, error: sessionError } =
        await db.auth.getSession();

    if (sessionError || !sessionData.session) {
        window.location.href = "auth.html";
        return;
    }

    currentUser = sessionData.session.user;

    await loadProfile();
    await loadWorkspace();
    await loadSavingsData();

    $("goalDeadline").min = getToday();
    $("contributionDate").value = getToday();
}

async function loadProfile() {
    const { data, error } = await db
        .from("profiles")
        .select("full_name")
        .eq("id", currentUser.id)
        .single();

    if (error) {
        console.error("Profile error:", error);
        return;
    }

    $("userName").textContent = data.full_name || "User";
}

async function loadWorkspace() {
    const { data, error } = await db
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", currentUser.id)
        .order("joined_at", { ascending: true })
        .limit(1)
        .single();

    if (error) {
        console.error("Workspace error:", error);
        showNotification("Unable to load your workspace.", "error");
        return;
    }

    workspaceId = data.workspace_id;
}

async function loadSavingsData() {
    if (!workspaceId) return;

    const [goalResult, contributionResult] = await Promise.all([
        db.from("savings_goals")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("target_date", { ascending: true }),

        db.from("savings_contributions")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("contribution_date", { ascending: false })
    ]);

    if (goalResult.error || contributionResult.error) {
        console.error(goalResult.error || contributionResult.error);
        showNotification("Unable to load savings data.", "error");
        return;
    }

    goals = goalResult.data || [];
    contributions = contributionResult.data || [];

    renderSummary();
    renderGoals();
}

function renderSummary() {
    const totals = {};

    goals.forEach(goal => {
        const currency = goal.currency;
        if (!totals[currency]) {
            totals[currency] = { target: 0, saved: 0 };
        }

        totals[currency].target += Number(goal.target_amount);
        totals[currency].saved += getSavedAmount(goal.id);
    });

    const targetText = Object.entries(totals)
        .map(([currency, values]) =>
            formatMoney(values.target, currency))
        .join(" · ");

    const savedText = Object.entries(totals)
        .map(([currency, values]) =>
            formatMoney(values.saved, currency))
        .join(" · ");

    const remainingText = Object.entries(totals)
        .map(([currency, values]) =>
            formatMoney(Math.max(values.target - values.saved, 0), currency))
        .join(" · ");

    $("totalTarget").textContent = targetText || "₹0.00";
    $("totalSaved").textContent = savedText || "₹0.00";
    $("totalRemaining").textContent = remainingText || "₹0.00";

    $("activeGoals").textContent = goals.filter(goal =>
        getSavedAmount(goal.id) < Number(goal.target_amount)
    ).length;
}

function renderGoals() {
    const container = $("goalsList");
    const filter = $("goalFilter").value;

    let filteredGoals = [...goals];

    if (filter === "active") {
        filteredGoals = filteredGoals.filter(goal =>
            getSavedAmount(goal.id) < Number(goal.target_amount)
        );
    } else if (filter === "completed") {
        filteredGoals = filteredGoals.filter(goal =>
            getSavedAmount(goal.id) >= Number(goal.target_amount)
        );
    }

    if (!filteredGoals.length) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No savings goals found</h3>
                <p>Create a goal and start building your savings.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredGoals.map(goal => {
        const saved = getSavedAmount(goal.id);
        const target = Number(goal.target_amount);
        const remaining = Math.max(target - saved, 0);
        const percentage = target > 0 ? (saved / target) * 100 : 0;
        const progress = Math.min(percentage, 100);
        const completed = saved >= target;

        return `
            <article class="goal-card">
                <div class="goal-header">
                    <div>
                        <h3>${escapeHTML(goal.goal_name)}</h3>
                        <span class="goal-status ${completed ? "completed" : "active"}">
                            ${completed ? "Completed" : "In Progress"}
                        </span>
                    </div>
                    <div class="goal-actions">
                        <button class="edit-goal" data-id="${goal.id}">Edit</button>
                        <button class="delete-goal" data-id="${goal.id}">Delete</button>
                    </div>
                </div>

                <p class="goal-description">
                    ${escapeHTML(goal.description || "No description added")}
                </p>

                <div class="goal-amounts">
                    <div>
                        <small>Saved</small>
                        <strong>${formatMoney(saved, goal.currency)}</strong>
                    </div>
                    <div>
                        <small>Target</small>
                        <strong>${formatMoney(target, goal.currency)}</strong>
                    </div>
                </div>

                <div class="goal-progress">
                    <div class="goal-progress-fill"
                         style="width: ${progress}%"></div>
                </div>

                <div class="goal-footer">
                    <span>${percentage.toFixed(1)}% saved</span>
                    <span>${formatMoney(remaining, goal.currency)} remaining</span>
                </div>

                <p class="goal-deadline">
                    Target date: ${escapeHTML(goal.target_date)}
                </p>

                ${!completed ? `
                    <button class="contribute-goal" data-id="${goal.id}">
                        + Add Savings
                    </button>
                ` : ""}
            </article>
        `;
    }).join("");

    attachGoalEvents();
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}


function openGoalModal(goal = null) {
    $("goalForm").reset();
    $("formMessage").textContent = "";

    editingGoalId = goal ? goal.id : null;
    $("modalTitle").textContent = goal
        ? "Edit Savings Goal"
        : "Create Savings Goal";

    if (goal) {
        $("goalName").value = goal.goal_name;
        $("goalDescription").value = goal.description || "";
        $("goalTarget").value = goal.target_amount;
        $("goalCurrency").value = goal.currency;
        $("goalDeadline").value = goal.target_date;
    } else {
        $("goalCurrency").value = "INR";
        $("goalDeadline").min = getToday();
    }

    $("goalModal").classList.remove("hidden");
    $("goalModal").classList.add("active");
}



function closeGoalModal() {
    $("goalModal").classList.remove("active");
    $("goalModal").classList.add("hidden");
    editingGoalId = null;
}



async function saveGoal(event) {
    event.preventDefault();

    const wasEditing = Boolean(editingGoalId);

    const goalData = {
        workspace_id: workspaceId,
        goal_name: $("goalName").value.trim(),
        description: $("goalDescription").value.trim(),
        target_amount: Number($("goalTarget").value),
        currency: $("goalCurrency").value,
        target_date: $("goalDeadline").value,
        updated_at: new Date().toISOString()
    };

    if (
        !goalData.goal_name ||
        goalData.target_amount <= 0 ||
        !goalData.target_date ||
        goalData.target_date < getToday()
    ) {
        $("formMessage").textContent =
            "Enter valid details and choose today or a future target date.";
        return;
    }

    let result;

    if (wasEditing) {
        result = await db.from("savings_goals")
            .update(goalData)
            .eq("id", editingGoalId)
            .eq("workspace_id", workspaceId);
    } else {
        result = await db.from("savings_goals").insert(goalData);
    }

    if (result.error) {
        console.error(result.error);
        $("formMessage").textContent = result.error.message;
        return;
    }

    closeGoalModal();
    await loadSavingsData();

    showNotification(
        wasEditing ? "Goal updated!" : "Goal created!"
    );
}



function openContributionModal(goal) {
    $("contributionForm").reset();
    $("contributionMessage").textContent = "";

    $("contributionGoalName").textContent = goal.goal_name;
    $("contributionDate").value = getToday();
    $("contributionModal").dataset.goalId = goal.id;

    $("contributionModal").classList.remove("hidden");
    $("contributionModal").classList.add("active");
}


function closeContributionModal() {
    $("contributionModal").classList.remove("active");
}

async function saveContribution(event) {
    event.preventDefault();

    const goalId = $("contributionModal").dataset.goalId;
    const goal = goals.find(item => item.id === goalId);

    if (!goal) return;

    const amount = Number($("contributionAmount").value);

    if (!amount || amount <= 0) {
        $("contributionMessage").textContent =
            "Enter a valid contribution amount.";
        return;
    }

    const result = await db.from("savings_contributions").insert({
        workspace_id: workspaceId,
        goal_id: goalId,
        amount,
        contribution_date: $("contributionDate").value,
        note: $("contributionNote").value.trim()
    });

    if (result.error) {
        console.error(result.error);
        $("contributionMessage").textContent = result.error.message;
        return;
    }

    closeContributionModal();
    await loadSavingsData();
    showNotification("Savings contribution added!");
}

async function deleteGoal(goalId) {
    const confirmed = confirm(
        "Delete this savings goal? All contributions linked to it will also be deleted."
    );

    if (!confirmed) return;

    const { error } = await db.from("savings_goals")
        .delete()
        .eq("id", goalId)
        .eq("workspace_id", workspaceId);

    if (error) {
        console.error(error);
        showNotification("Unable to delete goal.", "error");
        return;
    }

    await loadSavingsData();
    showNotification("Savings goal deleted.");
}

function attachGoalEvents() {
    document.querySelectorAll(".edit-goal").forEach(button => {
        button.addEventListener("click", () => {
            const goal = goals.find(item => item.id === button.dataset.id);
            if (goal) openGoalModal(goal);
        });
    });

    document.querySelectorAll(".delete-goal").forEach(button => {
        button.addEventListener("click", () =>
            deleteGoal(button.dataset.id)
        );
    });

    document.querySelectorAll(".contribute-goal").forEach(button => {
        button.addEventListener("click", () => {
            const goal = goals.find(item => item.id === button.dataset.id);
            if (goal) openContributionModal(goal);
        });
    });
}

$("addGoalButton").addEventListener("click", () => openGoalModal());
$("closeModal").addEventListener("click", closeGoalModal);
$("cancelGoal").addEventListener("click", closeGoalModal);
$("goalForm").addEventListener("submit", saveGoal);

$("closeContributionModal").addEventListener("click", closeContributionModal);
$("cancelContribution").addEventListener("click", closeContributionModal);
$("contributionForm").addEventListener("submit", saveContribution);

$("goalFilter").addEventListener("change", renderGoals);

$("logoutButton").addEventListener("click", async () => {
    await db.auth.signOut();
    window.location.href = "auth.html";
});

initializePage();

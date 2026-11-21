
const db = window.expensaSupabase;

let currentUser = null;
let workspaceId = null;
let transactions = [];
let accounts = [];

let incomeExpenseChart = null;
let categoryChart = null;
let monthlyChart = null;

const $ = (id) => document.getElementById(id);

function formatMoney(amount, currency = "INR") {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 2
    }).format(Number(amount) || 0);
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

function getDateRange(period) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    let start = null;
    let end = null;

    if (period === "month") {
        start = new Date(year, month, 1);
        end = new Date(year, month + 1, 0);
    } else if (period === "lastMonth") {
        start = new Date(year, month - 1, 1);
        end = new Date(year, month, 0);
    } else if (period === "year") {
        start = new Date(year, 0, 1);
        end = new Date(year, 11, 31);
    }

    const toDateString = date => {
        if (!date) return null;

        const localDate = new Date(
            date.getTime() - date.getTimezoneOffset() * 60000
        );

        return localDate.toISOString().split("T")[0];
    };

    return {
        start: toDateString(start),
        end: toDateString(end)
    };
}

async function initializeReports() {
    if (!db) {
        $("reportMessage").textContent =
            "Supabase connection not found.";
        return;
    }

    const { data, error } = await db.auth.getSession();

    if (error || !data.session) {
        window.location.href = "auth.html";
        return;
    }

    currentUser = data.session.user;

    await loadProfile();
    await loadWorkspace();
    await loadAccounts();
    await loadTransactions();

    await renderReports();
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
        $("reportMessage").textContent =
            "Unable to load your personal workspace.";
        return;
    }

    workspaceId = data.workspace_id;
}

async function loadAccounts() {
    if (!workspaceId) return;

    const { data, error } = await db
        .from("accounts")
        .select("id, currency")
        .eq("workspace_id", workspaceId);

    if (error) {
        console.error("Accounts error:", error);
        $("reportMessage").textContent =
            "Unable to load account currencies.";
        return;
    }

    accounts = data || [];
}

async function loadTransactions() {
    if (!workspaceId) return;

    const { data, error } = await db
        .from("transactions")
        .select(`
            id,
            account_id,
            transaction_type,
            amount,
            category,
            description,
            transaction_date
        `)
        .eq("workspace_id", workspaceId)
        .order("transaction_date", { ascending: true });

    if (error) {
        console.error("Transactions error:", error);
        $("reportMessage").textContent =
            "Unable to load transactions.";
        return;
    }

    transactions = (data || []).map(transaction => {
        const account = accounts.find(
            item => item.id === transaction.account_id
        );

        return {
            ...transaction,
            currency: account?.currency || "INR"
        };
    });
}

function getSelectedTransactions() {
    const period = $("reportPeriod").value;
    const currency = $("reportCurrency").value;
    const range = getDateRange(period);

    return transactions.filter(transaction => {
        const matchesCurrency = transaction.currency === currency;

        const matchesStart = !range.start ||
            transaction.transaction_date >= range.start;

        const matchesEnd = !range.end ||
            transaction.transaction_date <= range.end;

        return matchesCurrency && matchesStart && matchesEnd;
    });
}

function calculateSummary(data) {
    const income = data
        .filter(item => item.transaction_type === "income")
        .reduce((sum, item) => sum + Number(item.amount), 0);

    const expenses = data
        .filter(item => item.transaction_type === "expense")
        .reduce((sum, item) => sum + Number(item.amount), 0);

    const savings = income - expenses;

    const savingsRate = income > 0
        ? (savings / income) * 100
        : 0;

    return { income, expenses, savings, savingsRate };
}

function renderSummary(data) {
    const summary = calculateSummary(data);
    const currency = $("reportCurrency").value;

    $("reportIncome").textContent =
        formatMoney(summary.income, currency);

    $("reportExpenses").textContent =
        formatMoney(summary.expenses, currency);

    $("reportSavings").textContent =
        formatMoney(summary.savings, currency);

    $("savingsRate").textContent =
        `${summary.savingsRate.toFixed(1)}%`;
}

function destroyCharts() {
    [incomeExpenseChart, categoryChart, monthlyChart]
        .forEach(chart => {
            if (chart) chart.destroy();
        });

    incomeExpenseChart = null;
    categoryChart = null;
    monthlyChart = null;
}

function renderIncomeExpenseChart(data) {
    const summary = calculateSummary(data);

    incomeExpenseChart = new Chart(
        $("incomeExpenseChart"),
        {
            type: "bar",
            data: {
                labels: ["Income", "Expenses"],
                datasets: [{
                    label: "Amount",
                    data: [summary.income, summary.expenses],
                    backgroundColor: ["#48A783", "#D7E98A"],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        }
    );
}

function renderCategoryChart(data) {
    const categoryTotals = {};

    data
        .filter(item => item.transaction_type === "expense")
        .forEach(item => {
            const category = item.category || "Other";

            categoryTotals[category] =
                (categoryTotals[category] || 0) +
                Number(item.amount);
        });

    const labels = Object.keys(categoryTotals);
    const values = Object.values(categoryTotals);

    categoryChart = new Chart(
        $("categoryChart"),
        {
            type: "doughnut",
            data: {
                labels: labels.length ? labels : ["No expenses"],
                datasets: [{
                    data: values.length ? values : [1],
                    backgroundColor: [
                        "#26765B",
                        "#48A783",
                        "#A9D9BD",
                        "#D7E98A",
                        "#7D9C78",
                        "#B5C9A8",
                        "#536F61",
                        "#C8D6BD"
                    ],
                    borderWidth: 2,
                    borderColor: "#FFFFFF"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "bottom"
                    }
                }
            }
        }
    );
}

function renderMonthlyChart(data) {
    const monthlyTotals = {};

    data.forEach(item => {
        const month = item.transaction_date.substring(0, 7);

        if (!monthlyTotals[month]) {
            monthlyTotals[month] = {
                income: 0,
                expenses: 0
            };
        }

        if (item.transaction_type === "income") {
            monthlyTotals[month].income += Number(item.amount);
        } else {
            monthlyTotals[month].expenses += Number(item.amount);
        }
    });

    const months = Object.keys(monthlyTotals).sort();

    monthlyChart = new Chart(
        $("monthlyChart"),
        {
            type: "line",
            data: {
                labels: months.length ? months : ["No data"],
                datasets: [
                    {
                        label: "Income",
                        data: months.map(month =>
                            monthlyTotals[month].income
                        ),
                        borderColor: "#26765B",
                        backgroundColor: "rgba(38,118,91,0.12)",
                        tension: 0.35,
                        fill: true
                    },
                    {
                        label: "Expenses",
                        data: months.map(month =>
                            monthlyTotals[month].expenses
                        ),
                        borderColor: "#B3C96B",
                        backgroundColor: "rgba(215,233,138,0.15)",
                        tension: 0.35,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "bottom"
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        }
    );
}

function renderExpenseBreakdown(data) {
    const body = $("expenseBreakdown");

    const expenseTransactions = data.filter(
        item => item.transaction_type === "expense"
    );

    const totalExpenses = expenseTransactions.reduce(
        (sum, item) => sum + Number(item.amount),
        0
    );

    const categories = {};

    expenseTransactions.forEach(item => {
        const name = item.category || "Other";

        if (!categories[name]) {
            categories[name] = {
                amount: 0,
                count: 0
            };
        }

        categories[name].amount += Number(item.amount);
        categories[name].count++;
    });

    const sortedCategories = Object.entries(categories)
        .sort((a, b) => b[1].amount - a[1].amount);

    if (!sortedCategories.length) {
        body.innerHTML = `
            <tr>
                <td colspan="4">No expense transactions found.</td>
            </tr>
        `;
        return;
    }

    body.innerHTML = sortedCategories.map(([name, values]) => {
        const percentage = totalExpenses > 0
            ? (values.amount / totalExpenses) * 100
            : 0;

        return `
            <tr>
                <td>${escapeHTML(name)}</td>
                <td>${formatMoney(values.amount, $("reportCurrency").value)}</td>
                <td>${values.count}</td>
                <td>${percentage.toFixed(1)}%</td>
            </tr>
        `;
    }).join("");
}

async function renderReports() {
    $("reportMessage").textContent = "";

    const data = getSelectedTransactions();

    renderSummary(data);
    destroyCharts();

    renderIncomeExpenseChart(data);
    renderCategoryChart(data);
    renderMonthlyChart(data);
    renderExpenseBreakdown(data);
}

function exportCSV() {
    const data = getSelectedTransactions();

    if (!data.length) {
        $("reportMessage").textContent =
            "There is no transaction data to export for this selection.";
        return;
    }

    const headers = [
        "Date",
        "Type",
        "Category",
        "Description",
        "Amount",
        "Currency"
    ];

    const rows = data.map(item => [
        item.transaction_date,
        item.transaction_type,
        item.category || "",
        item.description || "",
        item.amount,
        item.currency
    ]);

    const csv = [headers, ...rows]
        .map(row => row.map(value =>
            `"${String(value).replace(/"/g, '""')}"`
        ).join(","))
        .join("\n");

    const blob = new Blob(
        ["\uFEFF" + csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "expensa-financial-report.csv";
    link.click();

    URL.revokeObjectURL(url);
}

$("refreshReports").addEventListener("click", async () => {
    await loadAccounts();
    await loadTransactions();
    await renderReports();
});

$("reportPeriod").addEventListener("change", renderReports);
$("reportCurrency").addEventListener("change", renderReports);
$("exportReport").addEventListener("click", exportCSV);

$("logoutButton").addEventListener("click", async () => {
    await db.auth.signOut();
    window.location.href = "auth.html";
});

initializeReports();

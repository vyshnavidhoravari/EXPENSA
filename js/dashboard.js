
const supabase = window.expensaSupabase;

const elements = {
  workspaceName: document.getElementById("workspaceName"),
  workspaceType: document.getElementById("workspaceType"),
  welcomeTitle: document.getElementById("welcomeTitle"),
  userAvatar: document.getElementById("userAvatar"),
  totalBalance: document.getElementById("totalBalance"),
  totalIncome: document.getElementById("totalIncome"),
  totalExpenses: document.getElementById("totalExpenses"),
  netSavings: document.getElementById("netSavings"),
  accountList: document.getElementById("accountList"),
  transactionList: document.getElementById("transactionList"),
  todayDate: document.getElementById("todayDate"),
  toast: document.getElementById("toast")
};

let currentUser = null;
let currentWorkspace = null;
let currentProfile = null;

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");

  setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 2800);
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

function money(value, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toLocaleDateString("en-CA");
}

function setEmpty(container, icon, heading, message) {
  container.className = "empty-state";
  container.innerHTML = `
    <div class="empty-icon">${icon}</div>
    <strong>${escapeHTML(heading)}</strong>
    <p>${escapeHTML(message)}</p>
  `;
}

async function loadDashboard() {
  if (!supabase) {
    throw new Error("Supabase client is unavailable. Check supabase-client.js.");
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) throw sessionError;

  const session = sessionData.session;

  if (!session) {
    window.location.replace("auth.html");
    return;
  }

  currentUser = session.user;

  // Load the user's profile.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, preferred_currency")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (profileError) throw profileError;

  currentProfile = profile;

  // Find a workspace the signed-in user belongs to.
  const { data: memberships, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, joined_at")
    .eq("user_id", currentUser.id)
    .order("joined_at", { ascending: true })
    .limit(1);

  if (membershipError) throw membershipError;

  if (!memberships || memberships.length === 0) {
    throw new Error("No workspace membership was found for this account.");
  }

  const workspaceId = memberships[0].workspace_id;

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, name, workspace_type")
    .eq("id", workspaceId)
    .single();

  if (workspaceError) throw workspaceError;

  currentWorkspace = workspace;

  updateProfileDisplay();
  await loadFinancialData(workspaceId);
}

function updateProfileDisplay() {
  const name = currentProfile?.full_name || "there";
  const currency = currentProfile?.preferred_currency || "INR";

  elements.welcomeTitle.textContent = `Welcome back, ${name}!`;
  elements.workspaceName.textContent = currentWorkspace.name;
  elements.workspaceType.textContent =
    currentWorkspace.workspace_type === "personal"
      ? "Personal workspace"
      : "Shared workspace";

  elements.userAvatar.textContent =
    name.trim().charAt(0).toUpperCase() || "U";

  elements.todayDate.textContent =
    new Intl.DateTimeFormat("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(new Date());

  document.title = "Dashboard | EXPENSA";
}

async function loadFinancialData(workspaceId) {
  const currency = currentProfile?.preferred_currency || "INR";

  const { data: accounts, error: accountError } = await supabase
    .from("accounts")
    .select("id, account_name, account_type, currency, opening_balance, is_active")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (accountError) throw accountError;

  const { data: transactions, error: transactionError } = await supabase
    .from("transactions")
    .select("id, account_id, transaction_type, amount, category, description, transaction_date")
    .eq("workspace_id", workspaceId)
    .order("transaction_date", { ascending: false })
    .limit(1000);

  if (transactionError) throw transactionError;

  renderAccounts(accounts || [], transactions || [], currency);
  renderTransactions(transactions || [], currency);
  updateSummary(accounts || [], transactions || [], currency);
}

function updateSummary(accounts, transactions, currency) {
  const monthStart = getMonthStart();

  const monthlyTransactions = transactions.filter(
    transaction => transaction.transaction_date >= monthStart
  );

  const income = monthlyTransactions
    .filter(transaction => transaction.transaction_type === "income")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  const expenses = monthlyTransactions
    .filter(transaction => transaction.transaction_type === "expense")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  const balance = accounts.reduce((total, account) => {
    const accountTransactions = transactions.filter(
      transaction => transaction.account_id === account.id
    );

    const accountIncome = accountTransactions
      .filter(item => item.transaction_type === "income")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const accountExpenses = accountTransactions
      .filter(item => item.transaction_type === "expense")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    return total +
      Number(account.opening_balance) +
      accountIncome -
      accountExpenses;
  }, 0);

  elements.totalBalance.textContent = money(balance, currency);
  elements.totalIncome.textContent = money(income, currency);
  elements.totalExpenses.textContent = money(expenses, currency);
  elements.netSavings.textContent = money(income - expenses, currency);
}

function renderAccounts(accounts, transactions, currency) {
  if (!accounts.length) {
    setEmpty(
      elements.accountList,
      "▣",
      "No accounts added yet",
      "Your accounts will appear here when you add them."
    );
    return;
  }

  elements.accountList.className = "";

  elements.accountList.innerHTML = accounts.map(account => {
    const related = transactions.filter(
      transaction => transaction.account_id === account.id
    );

    const income = related
      .filter(item => item.transaction_type === "income")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const expenses = related
      .filter(item => item.transaction_type === "expense")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const balance =
      Number(account.opening_balance) + income - expenses;

    return `
      <div class="account-item">
        <div>
          <div class="item-title">${escapeHTML(account.account_name)}</div>
          <div class="item-subtitle">
            ${escapeHTML(account.account_type.replace("_", " "))}
          </div>
        </div>
        <div class="item-amount">
          ${money(balance, account.currency || currency)}
        </div>
      </div>
    `;
  }).join("");
}

function renderTransactions(transactions, currency) {
  if (!transactions.length) {
    setEmpty(
      elements.transactionList,
      "↔",
      "No transactions yet",
      "Your income and expenses will appear here."
    );
    return;
  }

  elements.transactionList.className = "";

  elements.transactionList.innerHTML = transactions
    .slice(0, 8)
    .map(transaction => {
      const isIncome = transaction.transaction_type === "income";
      const sign = isIncome ? "+" : "−";
      const amountColor = isIncome ? "#26765b" : "#d66d60";

      return `
        <div class="transaction-item">
          <div>
            <div class="item-title">
              ${escapeHTML(transaction.description || transaction.category)}
            </div>
            <div class="item-subtitle">
              ${escapeHTML(transaction.category)} ·
              ${escapeHTML(transaction.transaction_date)}
            </div>
          </div>
          <div class="item-amount" style="color:${amountColor}">
            ${sign}${money(transaction.amount, currency)}
          </div>
        </div>
      `;
    })
    .join("");
}

async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    showToast(error.message);
    return;
  }

  window.location.replace("auth.html");
}

// Initial page actions.
document.getElementById("logoutButton").addEventListener("click", logout);

document.getElementById("addAccountButton").addEventListener("click", () => {
  showToast("Account creation form is coming in the next step.");
});

document.getElementById("addTransactionButton").addEventListener("click", () => {
  showToast("Transaction form is coming in the next step.");
});

document.getElementById("menuButton").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
});

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT" || !session) {
    window.location.replace("auth.html");
  }
});

loadDashboard().catch(error => {
  console.error("EXPENSA dashboard error:", error);

  showToast(error.message || "Unable to load your dashboard.");
});

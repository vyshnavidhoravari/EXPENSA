/* =========================================================
   EXPENSA — INTERACTIVE FRONTEND
   Navigation, Savings Lab, Transactions and Budget Planner
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* -----------------------------------------------------
       1. HELPER FUNCTIONS
    ----------------------------------------------------- */

    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => document.querySelectorAll(selector);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(amount);
    };

    let toastTimer;

    function showToast(message) {
        const toast = $("#expensaToast");

        if (!toast) return;

        toast.textContent = message;
        toast.classList.add("show");

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            toast.classList.remove("show");
        }, 2800);
    }


    /* -----------------------------------------------------
       2. MOBILE NAVIGATION
    ----------------------------------------------------- */

    const menuToggle = $("#menuToggle");
    const navLinks = $("#navLinks");

    if (menuToggle && navLinks) {

        menuToggle.addEventListener("click", () => {

            const isOpen = navLinks.classList.toggle("open");

            menuToggle.setAttribute("aria-expanded", String(isOpen));

        });

        $$("#navLinks a").forEach(link => {

            link.addEventListener("click", () => {

                navLinks.classList.remove("open");

                menuToggle.setAttribute("aria-expanded", "false");

            });

        });

    }


    /* -----------------------------------------------------
       3. COLOR PALETTE SWITCHER
    ----------------------------------------------------- */

    const paletteToggle = $("#paletteToggle");

    if (paletteToggle) {

        paletteToggle.addEventListener("click", () => {

            document.body.classList.toggle("alternate-theme");

            const isAlternate =
                document.body.classList.contains("alternate-theme");

            showToast(
                isAlternate
                    ? "Midnight and lavender mood activated."
                    : "Forest and jade mood activated."
            );

        });

    }


    /* -----------------------------------------------------
       4. SCROLL REVEAL ANIMATIONS
    ----------------------------------------------------- */

    const revealElements = $$(".reveal");

    if ("IntersectionObserver" in window) {

        const revealObserver = new IntersectionObserver(
            (entries, observer) => {

                entries.forEach(entry => {

                    if (entry.isIntersecting) {

                        entry.target.classList.add("visible");

                        observer.unobserve(entry.target);

                    }

                });

            },
            {
                threshold: 0.12
            }
        );

        revealElements.forEach(element => {
            revealObserver.observe(element);
        });

    } else {

        revealElements.forEach(element => {
            element.classList.add("visible");
        });

    }


    /* -----------------------------------------------------
       5. FEATURE SLIDER
    ----------------------------------------------------- */

    const featureTrack = $("#featureTrack");
    const nextFeature = $("#nextFeature");
    const prevFeature = $("#prevFeature");
    const sliderProgress = $("#sliderProgress");
    const sliderStatus = $("#sliderStatus");

    if (featureTrack) {

        const cards = Array.from(
            featureTrack.querySelectorAll(".feature-card")
        );

        let currentFeature = 0;

        function updateFeatureSlider() {

            if (!cards.length) return;

            const cardWidth =
                cards[0].getBoundingClientRect().width + 18;

            const visibleWidth = featureTrack.clientWidth;

            const maxScroll = Math.max(
                0,
                featureTrack.scrollWidth - visibleWidth
            );

            const maxIndex = Math.max(
                0,
                cards.length - Math.max(
                    1,
                    Math.floor(visibleWidth / cardWidth)
                )
            );

            currentFeature = Math.min(
                currentFeature,
                maxIndex
            );

            featureTrack.scrollTo({
                left: Math.min(
                    currentFeature * cardWidth,
                    maxScroll
                ),
                behavior: "smooth"
            });

            const progress = cards.length
                ? ((currentFeature + 1) / cards.length) * 100
                : 0;

            if (sliderProgress) {
                sliderProgress.style.width = `${progress}%`;
            }

            if (sliderStatus) {
                sliderStatus.textContent =
                    `${String(currentFeature + 1).padStart(2, "0")} / ${String(cards.length).padStart(2, "0")}`;
            }

        }

        nextFeature?.addEventListener("click", () => {

            currentFeature = Math.min(
                currentFeature + 1,
                cards.length - 1
            );

            updateFeatureSlider();

        });

        prevFeature?.addEventListener("click", () => {

            currentFeature = Math.max(
                currentFeature - 1,
                0
            );

            updateFeatureSlider();

        });

        featureTrack.addEventListener("scroll", () => {

            if (!cards.length) return;

            const cardWidth =
                cards[0].getBoundingClientRect().width + 18;

            currentFeature = Math.round(
                featureTrack.scrollLeft / cardWidth
            );

            if (sliderProgress) {

                sliderProgress.style.width =
                    `${((currentFeature + 1) / cards.length) * 100}%`;

            }

            if (sliderStatus) {

                sliderStatus.textContent =
                    `${String(currentFeature + 1).padStart(2, "0")} / ${String(cards.length).padStart(2, "0")}`;

            }

        });

    }


    /* -----------------------------------------------------
       6. SAVINGS CALCULATOR
    ----------------------------------------------------- */

    const dailySaving = $("#dailySaving");
    const savingSlider = $("#savingSlider");

    const monthlySaving = $("#monthlySaving");
    const yearlySaving = $("#yearlySaving");

    const plantStatus = $("#plantStatus");
    const plantTitle = $("#plantTitle");
    const plantMessage = $("#plantMessage");
    const plantPercent = $("#plantPercent");
    const plantIllustration = $("#plantIllustration");

    function updateSavings() {

        if (!dailySaving || !savingSlider) return;

        const amount = Number(dailySaving.value);

        const safeAmount = Number.isFinite(amount)
            ? Math.max(0, amount)
            : 0;

        const monthly = safeAmount * 30;
        const yearly = safeAmount * 365;

        if (monthlySaving) {
            monthlySaving.textContent = formatCurrency(monthly);
        }

        if (yearlySaving) {
            yearlySaving.textContent = formatCurrency(yearly);
        }

        if (plantStatus && plantTitle && plantMessage) {

            if (safeAmount < 100) {

                plantStatus.textContent = "SEEDLING";

                plantTitle.textContent =
                    "Every journey starts small.";

                plantMessage.textContent =
                    "Small and consistent steps matter.";

            } else if (safeAmount < 300) {

                plantStatus.textContent = "GROWING";

                plantTitle.textContent =
                    "Your habits are taking root.";

                plantMessage.textContent =
                    "Keep nurturing your financial discipline.";

            } else if (safeAmount < 600) {

                plantStatus.textContent = "BLOOMING";

                plantTitle.textContent =
                    "Your commitment is growing.";

                plantMessage.textContent =
                    "Consistency is creating possibilities.";

            } else {

                plantStatus.textContent = "THRIVING";

                plantTitle.textContent =
                    "Look how far consistency can take you.";

                plantMessage.textContent =
                    "You are building a powerful saving habit.";

            }

        }

        if (plantPercent) {

            const progress = Math.min(
                100,
                Math.round((safeAmount / 1000) * 100)
            );

            plantPercent.textContent =
                String(progress).padStart(2, "0");

        }

        if (plantIllustration) {

            const scale = 0.75 + Math.min(
                safeAmount / 1000,
                1
            ) * 0.35;

            plantIllustration.style.transform =
                `scale(${scale})`;

        }

    }

    if (dailySaving && savingSlider) {

        dailySaving.addEventListener("input", () => {

            let amount = Number(dailySaving.value);

            if (!Number.isFinite(amount)) amount = 0;

            amount = Math.max(
                0,
                Math.min(100000, amount)
            );

            savingSlider.value = Math.max(
                10,
                Math.min(1000, amount)
            );

            updateSavings();

        });

        savingSlider.addEventListener("input", () => {

            dailySaving.value = savingSlider.value;

            updateSavings();

        });

        dailySaving.addEventListener("change", () => {

            let amount = Number(dailySaving.value);

            if (!Number.isFinite(amount)) amount = 0;

            amount = Math.max(
                0,
                Math.min(100000, amount)
            );

            dailySaving.value = amount;

            savingSlider.value = Math.max(
                10,
                Math.min(1000, amount)
            );

            updateSavings();

        });

        updateSavings();

    }


    /* -----------------------------------------------------
       7. FINANCE STUDIO SAMPLE DATA
    ----------------------------------------------------- */

    const transactions = [

        {
            id: 1,
            name: "Monthly salary",
            category: "Salary",
            amount: 32000,
            type: "income",
            date: "Today",
            icon: "↗"
        },

        {
            id: 2,
            name: "Grocery shopping",
            category: "Food",
            amount: 2400,
            type: "expense",
            date: "Today",
            icon: "◈"
        },

        {
            id: 3,
            name: "Travel expenses",
            category: "Travel",
            amount: 1850,
            type: "expense",
            date: "Yesterday",
            icon: "↗"
        },

        {
            id: 4,
            name: "Internet bill",
            category: "Bills",
            amount: 1500,
            type: "expense",
            date: "Yesterday",
            icon: "⌁"
        },

        {
            id: 5,
            name: "Other expenses",
            category: "Other",
            amount: 1400,
            type: "expense",
            date: "This week",
            icon: "✳"
        }

    ];

    let monthlyBudget = 15000;

    let nextTransactionId = 6;


    /* -----------------------------------------------------
       8. TRANSACTION CALCULATIONS
    ----------------------------------------------------- */

    function getIncome() {

        return transactions

            .filter(item => item.type === "income")

            .reduce((total, item) => total + item.amount, 0);

    }

    function getExpenses() {

        return transactions

            .filter(item => item.type === "expense")

            .reduce((total, item) => total + item.amount, 0);

    }

    function getBalance() {

        return getIncome() - getExpenses();

    }


    /* -----------------------------------------------------
       9. TRANSACTION DISPLAY
    ----------------------------------------------------- */

    function createTransactionElement(item) {

        const row = document.createElement("div");

        row.className = "transaction-row";

        const symbol = document.createElement("div");

        symbol.className =
            `transaction-symbol ${item.type}`;

        symbol.textContent = item.icon || "₹";

        const info = document.createElement("div");

        info.className = "transaction-info";

        const name = document.createElement("strong");

        name.textContent = item.name;

        const category = document.createElement("small");

        category.textContent =
            `${item.category} · ${item.date}`;

        info.append(name, category);

        const amount = document.createElement("span");

        amount.className =
            `transaction-amount ${item.type}`;

        const sign = item.type === "income" ? "+" : "−";

        amount.textContent =
            `${sign}${formatCurrency(item.amount)}`;

        row.append(symbol, info, amount);

        return row;

    }


    function renderTransactions() {

        const recentContainer = $("#demoRecent");

        const allContainer = $("#demoAllTransactions");

        const recent = transactions.slice(-5).reverse();

        if (recentContainer) {

            recentContainer.replaceChildren();

            recent.forEach(item => {

                recentContainer.append(
                    createTransactionElement(item)
                );

            });

        }

        if (allContainer) {

            allContainer.replaceChildren();

            [...transactions].reverse().forEach(item => {

                allContainer.append(
                    createTransactionElement(item)
                );

            });

        }

        const count = $("#transactionCount");

        if (count) {

            count.textContent =
                `${transactions.length} ENTRIES`;

        }

    }


    /* -----------------------------------------------------
       10. UPDATE DASHBOARD
    ----------------------------------------------------- */

    function updateDashboard() {

        const income = getIncome();

        const expenses = getExpenses();

        const balance = getBalance();

        const balanceElement = $("#demoBalance");

        const incomeElement = $("#demoIncome");

        const expenseElement = $("#demoExpense");

        if (balanceElement) {
            balanceElement.textContent = formatCurrency(balance);
        }

        if (incomeElement) {
            incomeElement.textContent = formatCurrency(income);
        }

        if (expenseElement) {
            expenseElement.textContent = formatCurrency(expenses);
        }

        const donutTotal = $("#donutTotal");

        if (donutTotal) {

            donutTotal.textContent =
                formatCurrency(expenses);

        }

        updateBudget();

        updateDonut();

        renderTransactions();

    }


    /* -----------------------------------------------------
       11. CATEGORY DONUT CHART
    ----------------------------------------------------- */

    function updateDonut() {

        const donut = $("#demoDonut");

        const legend = $("#categoryLegend");

        if (!donut || !legend) return;

        const categoryTotals = {};

        transactions

            .filter(item => item.type === "expense")

            .forEach(item => {

                categoryTotals[item.category] =
                    (categoryTotals[item.category] || 0)
                    + item.amount;

            });

        const colors = [
            "#48a783",
            "#dfc17c",
            "#ef9278",
            "#b9b0e5",
            "#8cb7d9",
            "#d18aab",
            "#91b66d"
        ];

        const categories = Object.entries(categoryTotals)

            .sort((a, b) => b[1] - a[1]);

        const total = categories.reduce(
            (sum, item) => sum + item[1],
            0
        );

        let current = 0;

        const segments = [];

        categories.forEach(([name, amount], index) => {

            const percentage = total > 0
                ? (amount / total) * 100
                : 0;

            const start = current;

            current += percentage;

            segments.push(
                `${colors[index % colors.length]} ${start}% ${current}%`
            );

        });

        donut.style.background = total > 0

            ? `conic-gradient(${segments.join(", ")})`

            : "#e8eee6";

        legend.replaceChildren();

        categories.forEach(([name, amount], index) => {

            const line = document.createElement("div");

            const dot = document.createElement("span");

            dot.className = "legend-dot";

            dot.style.background =
                colors[index % colors.length];

            const label = document.createElement("span");

            label.textContent = name;

            const value = document.createElement("strong");

            value.textContent = formatCurrency(amount);

            line.append(dot, label, value);

            legend.append(line);

        });

        if (categories.length === 0) {

            const message = document.createElement("p");

            message.textContent = "No expenses recorded yet.";

            message.style.fontSize = "11px";

            message.style.color = "#89998d";

            legend.append(message);

        }

    }


    /* -----------------------------------------------------
       12. BUDGET PLANNER
    ----------------------------------------------------- */

    const budgetRange = $("#budgetRange");

    function updateBudget() {

        const spent = getExpenses();

        const remaining = monthlyBudget - spent;

        const percentage = monthlyBudget > 0
            ? (spent / monthlyBudget) * 100
            : 0;

        const safePercentage = Math.min(
            percentage,
            100
        );

        const spentElement = $("#budgetSpent");

        const limitLabel = $("#budgetLimitLabel");

        const percentElement = $("#budgetPercent");

        const remainingElement = $("#budgetRemaining");

        const fill = $("#budgetFill");

        const labValue = $("#budgetLabValue");

        const labSpent = $("#budgetLabSpent");

        const labRemaining = $("#budgetLabRemaining");

        const labPercent = $("#budgetLabPercent");

        const labFill = $("#budgetLabFill");

        const guidance = $("#budgetGuidance");

        if (spentElement) {
            spentElement.textContent = formatCurrency(spent);
        }

        if (limitLabel) {
            limitLabel.textContent = formatCurrency(monthlyBudget);
        }

        if (percentElement) {
            percentElement.textContent =
                `${Math.round(percentage)}% used`;
        }

        if (remainingElement) {
            remainingElement.textContent =
                remaining >= 0
                    ? `${formatCurrency(remaining)} left`
                    : `${formatCurrency(Math.abs(remaining))} over budget`;
        }

        if (fill) {
            fill.style.width = `${safePercentage}%`;
        }

        if (labValue) {
            labValue.textContent = formatCurrency(monthlyBudget);
        }

        if (labSpent) {
            labSpent.textContent = formatCurrency(spent);
        }

        if (labRemaining) {
            labRemaining.textContent =
                formatCurrency(Math.abs(remaining));
        }

        if (labPercent) {
            labPercent.textContent =
                `${Math.round(percentage)}%`;
        }

        if (labFill) {
            labFill.style.width = `${safePercentage}%`;
        }

        if (guidance) {

            guidance.classList.remove("warning");

            if (percentage >= 100) {

                guidance.textContent =
                    "You have exceeded your sample budget. Review your spending.";

                guidance.classList.add("warning");

            } else if (percentage >= 80) {

                guidance.textContent =
                    "You are approaching your spending limit. Plan carefully.";

                guidance.classList.add("warning");

            } else {

                guidance.textContent =
                    "You are within your sample budget. Keep your spending intentional.";

            }

        }

        if (budgetRange) {

            budgetRange.value = monthlyBudget;

        }

    }

    if (budgetRange) {

        budgetRange.addEventListener("input", () => {

            monthlyBudget = Number(budgetRange.value);

            updateBudget();

        });

    }


    /* -----------------------------------------------------
       13. ADD TRANSACTION
    ----------------------------------------------------- */

    const transactionForm = $("#demoTransactionForm");

    const feedback = $("#demoFeedback");

    if (transactionForm) {

        transactionForm.addEventListener("submit", event => {

            event.preventDefault();

            const type = $("#demoType").value;

            const description =
                $("#demoDescription").value.trim();

            const category =
                $("#demoCategory").value;

            const amount =
                Number($("#demoAmount").value);

            if (!description) {

                feedback.textContent =
                    "Please enter a transaction description.";

                feedback.className =
                    "demo-form-feedback error";

                return;

            }

            if (
                !Number.isFinite(amount) ||
                amount <= 0 ||
                amount > 1000000
            ) {

                feedback.textContent =
                    "Enter a valid amount between ₹1 and ₹10,00,000.";

                feedback.className =
                    "demo-form-feedback error";

                return;

            }

            const icons = {

                Food: "◈",
                Travel: "↗",
                Bills: "⌁",
                Shopping: "◇",
                Education: "▤",
                Salary: "↗",
                Other: "✳"

            };

            transactions.push({

                id: nextTransactionId++,

                name: description,

                category: category,

                amount: amount,

                type: type,

                date: "Just now",

                icon: icons[category] || "✳"

            });

            updateDashboard();

            transactionForm.reset();

            feedback.textContent =
                "Transaction added successfully to this local preview.";

            feedback.className =
                "demo-form-feedback success";

            showToast("Your transaction has been added!");

        });

    }


    /* -----------------------------------------------------
       14. DASHBOARD VIEW NAVIGATION
    ----------------------------------------------------- */

    const navButtons = $$(".studio-nav");

    const views = $$(".studio-view");

    const studioTitle = $("#studioTitle");

    const viewTitles = {

        overview: "Good afternoon, Komali ✦",

        transactions: "Your transaction journal",

        budget: "Your budget, your control"

    };

    function switchView(viewName) {

        views.forEach(view => {

            view.classList.toggle(
                "active",
                view.id === `view-${viewName}`
            );

        });

        navButtons.forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.view === viewName
            );

        });

        if (studioTitle) {

            studioTitle.textContent =
                viewTitles[viewName] || "EXPENSA Workspace";

        }

    }

    navButtons.forEach(button => {

        button.addEventListener("click", () => {

            switchView(button.dataset.view);

        });

    });

    $$("[data-jump]").forEach(button => {

        button.addEventListener("click", () => {

            switchView(button.dataset.jump);

        });

    });


    /* -----------------------------------------------------
       15. INITIALIZE DASHBOARD
    ----------------------------------------------------- */

    updateDashboard();

    switchView("overview");


    /* -----------------------------------------------------
       16. FOOTER YEAR
    ----------------------------------------------------- */

    const footerYear = $(".footer > span");

    if (footerYear) {

        footerYear.textContent =
            `© ${new Date().getFullYear()} EXPENSA. All rights reserved.`;

    }


    console.log("EXPENSA frontend initialized successfully.");

});
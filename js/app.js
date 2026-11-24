
/* =========================================================
   EXPENSA — HOMEPAGE JAVASCRIPT
   Navigation, animations, feature slider and Savings Lab
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => document.querySelectorAll(selector);

    /* 1. CURRENCY FORMATTER */

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(amount);
    };

    /* 2. TOAST MESSAGE */

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

    /* 3. MOBILE NAVIGATION */

    const menuToggle = $("#menuToggle");
    const navLinks = $("#navLinks");

    if (menuToggle && navLinks) {

        menuToggle.addEventListener("click", () => {
            const isOpen = navLinks.classList.toggle("open");

            menuToggle.setAttribute(
                "aria-expanded",
                String(isOpen)
            );
        });

        $$("#navLinks a").forEach(link => {
            link.addEventListener("click", () => {
                navLinks.classList.remove("open");
                menuToggle.setAttribute("aria-expanded", "false");
            });
        });
    }

    /* 4. COLOR PALETTE SWITCHER */

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

    /* 5. SCROLL REVEAL ANIMATIONS */

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
            { threshold: 0.12 }
        );

        revealElements.forEach(element => {
            revealObserver.observe(element);
        });

    } else {

        revealElements.forEach(element => {
            element.classList.add("visible");
        });
    }

    /* 6. FEATURE SLIDER */

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

            currentFeature = Math.min(currentFeature, maxIndex);

            featureTrack.scrollTo({
                left: Math.min(
                    currentFeature * cardWidth,
                    maxScroll
                ),
                behavior: "smooth"
            });

            const progress =
                ((currentFeature + 1) / cards.length) * 100;

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

        window.addEventListener("resize", updateFeatureSlider);
        updateFeatureSlider();
    }

    /* 7. SAVINGS LAB CALCULATOR */

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

        if (monthlySaving) {
            monthlySaving.textContent =
                formatCurrency(safeAmount * 30);
        }

        if (yearlySaving) {
            yearlySaving.textContent =
                formatCurrency(safeAmount * 365);
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
            const scale =
                0.75 + Math.min(safeAmount / 1000, 1) * 0.35;

            plantIllustration.style.transform = `scale(${scale})`;
        }
    }

    if (dailySaving && savingSlider) {

        dailySaving.addEventListener("input", () => {

            let amount = Number(dailySaving.value);

            if (!Number.isFinite(amount)) amount = 0;

            amount = Math.max(0, Math.min(100000, amount));

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

            amount = Math.max(0, Math.min(100000, amount));

            dailySaving.value = amount;

            savingSlider.value = Math.max(
                10,
                Math.min(1000, amount)
            );

            updateSavings();
        });

        updateSavings();
    }

    /* 8. FOOTER YEAR */

    const footerYear = $(".footer > span");

    if (footerYear) {
        footerYear.textContent =
            `© ${new Date().getFullYear()} EXPENSA. All rights reserved.`;
    }

    console.log("EXPENSA homepage initialized successfully.");
});

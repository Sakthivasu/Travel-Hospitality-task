
/* =========================================================
   VOYAGEGO - GLOBAL APPLICATION JAVASCRIPT
   HTML + CSS + VANILLA JAVASCRIPT
========================================================= */

"use strict";

/* ---------------------------------------------------------
   1. STORAGE HELPERS
--------------------------------------------------------- */

const VoyageStorage = {
    get(key, fallback = null) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        } catch {
            return fallback;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    },

    remove(key) {
        localStorage.removeItem(key);
    }
};

/* ---------------------------------------------------------
   2. TOAST NOTIFICATION
--------------------------------------------------------- */

function showToast(message) {
    let toast = document.getElementById("voyage-toast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "voyage-toast";
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(window.voyageToastTimer);

    window.voyageToastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

/* ---------------------------------------------------------
   3. GLOBAL PRELOADER
--------------------------------------------------------- */

function initPreloader() {
    if (document.getElementById("voyage-preloader")) return;

    const preloader = document.createElement("div");

    preloader.id = "voyage-preloader";

    preloader.innerHTML = `
        <div class="preloader-content">
            <div class="preloader-logo">
                <i class="fa-solid fa-compass"></i>
            </div>

            <h2>VoyageGo</h2>
            <p>Your next journey starts here</p>

            <div class="preloader-track">
                <div class="preloader-progress"
                     id="preloader-progress"></div>
            </div>

            <span class="preloader-percent"
                  id="preloader-percent">0%</span>
        </div>
    `;

    document.body.appendChild(preloader);

    const progress = preloader.querySelector("#preloader-progress");
    const percentage = preloader.querySelector("#preloader-percent");

    let count = 0;
    let finishing = false;
    let finished = false;
    let finishTimer;
    let fallbackTimer;
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
        // Advance smoothly while loading, reserving 100% for completion.
        count = Math.min(count + 4, 90);
        progress.style.width = count + "%";
        percentage.textContent = count + "%";
    }, 60);

    const finish = () => {
        if (finishing || finished) return;
        finishing = true;

        // Keep the loader visible long enough for the counter to be perceived
        // on fast loads, while still waiting for the page's load event.
        const minimumVisibleMs = 900;
        const remainingVisibleMs = Math.max(
            0,
            minimumVisibleMs - (Date.now() - startedAt)
        );

        finishTimer = window.setTimeout(() => {
            finished = true;
            window.clearInterval(interval);
            window.clearTimeout(fallbackTimer);
            progress.style.width = "100%";
            percentage.textContent = "100%";

            window.setTimeout(() => {
                preloader.classList.add("hide");
                window.setTimeout(() => preloader.remove(), 750);
            }, 100);
        }, remainingVisibleMs);
    };

    // If a network resource prevents the load event, finish instead of
    // leaving the page covered by the preloader.
    fallbackTimer = window.setTimeout(finish, 5000);

    if (document.readyState === "complete") {
        finish();
    } else {
        window.addEventListener("load", finish, { once: true });
    }
}

/* ---------------------------------------------------------
   4. MOBILE MENU
--------------------------------------------------------- */

function initMobileMenu() {
    const toggle = document.getElementById("mobile-toggle");
    const drawer = document.getElementById("mobile-drawer");
    const overlay = document.getElementById("mobile-overlay");
    const close = document.getElementById("drawer-close");

    if (!toggle || !drawer || !overlay) return;

    function openMenu() {
        drawer.classList.add("active");
        overlay.classList.add("active");
        document.body.classList.add("menu-open");

        toggle.setAttribute("aria-expanded", "true");
        drawer.setAttribute("aria-hidden", "false");
    }

    function closeMenu() {
        drawer.classList.remove("active");
        overlay.classList.remove("active");
        document.body.classList.remove("menu-open");

        toggle.setAttribute("aria-expanded", "false");
        drawer.setAttribute("aria-hidden", "true");
    }

    toggle.addEventListener("click", () => {
        drawer.classList.contains("active")
            ? closeMenu()
            : openMenu();
    });

    close?.addEventListener("click", closeMenu);
    overlay.addEventListener("click", closeMenu);

    drawer.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeMenu();
    });
}

/* ---------------------------------------------------------
   5. MODAL UTILITIES
--------------------------------------------------------- */

function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;

    modal.classList.add("active");
    document.body.classList.add("modal-open");
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;

    modal.classList.remove("active");

    if (!document.querySelector(".modal.active")) {
        document.body.classList.remove("modal-open");
    }
}

function initModalControls() {
    document.querySelectorAll("[data-modal-open]").forEach(button => {
        button.addEventListener("click", () => {
            openModal(button.dataset.modalOpen);
        });
    });

    document.querySelectorAll("[data-modal-close]").forEach(button => {
        button.addEventListener("click", () => {
            closeModal(button.dataset.modalClose);
        });
    });

    document.querySelectorAll(".modal").forEach(modal => {
        modal.addEventListener("click", event => {
            if (event.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

/* ---------------------------------------------------------
   6. GEOLOCATION
--------------------------------------------------------- */

function initLocationSelector() {
    const buttons = document.querySelectorAll("[data-location-trigger]");
    const cityLabels = document.querySelectorAll("[data-current-city]");

    const storedCity = VoyageStorage.get("voyage_city", "Chennai");

    cityLabels.forEach(label => {
        label.textContent = storedCity;
    });

    buttons.forEach(button => {
        button.addEventListener("click", () => {
            openModal("location-modal");
        });
    });

    const detectButton = document.getElementById("detect-location");

    detectButton?.addEventListener("click", () => {
        if (!navigator.geolocation) {
            showToast("Geolocation is not supported by this browser.");
            return;
        }

        detectButton.disabled = true;
        detectButton.textContent = "Detecting location...";

        navigator.geolocation.getCurrentPosition(
            async position => {
                const { latitude, longitude } = position.coords;

                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
                    );

                    if (!response.ok) {
                        throw new Error("Location lookup failed");
                    }

                    const data = await response.json();

                    const address = data.address || {};

                    const city =
                        address.city ||
                        address.town ||
                        address.village ||
                        address.county ||
                        "Your location";

                    setVoyageCity(city);
                    closeModal("location-modal");
                    showToast("Location updated to " + city);
                } catch {
                    showToast("Location detected, but city lookup failed.");
                }

                detectButton.disabled = false;
                detectButton.textContent = "Use my current location";
            },
            error => {
                const messages = {
                    1: "Location permission was denied.",
                    2: "Your location is currently unavailable.",
                    3: "Location request timed out."
                };

                showToast(messages[error.code] || "Unable to get location.");

                detectButton.disabled = false;
                detectButton.textContent = "Use my current location";
            },
            {
                enableHighAccuracy: false,
                timeout: 12000,
                maximumAge: 300000
            }
        );
    });

    document.querySelectorAll("[data-city]").forEach(button => {
        button.addEventListener("click", () => {
            const city = button.dataset.city;
            setVoyageCity(city);
            closeModal("location-modal");
            showToast("Selected city: " + city);
        });
    });
}

function setVoyageCity(city) {
    VoyageStorage.set("voyage_city", city);

    document.querySelectorAll("[data-current-city]").forEach(label => {
        label.textContent = city;
    });
}

/* ---------------------------------------------------------
   7. LANGUAGE TRANSLATOR
--------------------------------------------------------- */

const VoyageTranslations = {
    en: {
        home: "Home",
        destinations: "Destinations",
        packages: "Packages",
        about: "About Us",
        contact: "Contact",
        booking: "Booking",
        login: "Login",
        signup: "Sign Up",
        bookNow: "Book Now",
        explore: "Explore the World",
        search: "Search Trips",
        popular: "Popular Destinations",
        newsletter: "Subscribe to our newsletter",
        footerExplore: "Explore",
        customerCare: "Customer Care",
        getInTouch: "Get in Touch"
    },

    ta: {
        home: "முகப்பு",
        destinations: "சுற்றுலா இடங்கள்",
        packages: "சுற்றுலா தொகுப்புகள்",
        about: "எங்களை பற்றி",
        contact: "தொடர்பு",
        booking: "முன்பதிவு",
        login: "உள்நுழை",
        signup: "பதிவு செய்க",
        bookNow: "இப்போது முன்பதிவு",
        explore: "உலகை ஆராயுங்கள்",
        search: "பயணங்களைத் தேடுங்கள்",
        popular: "பிரபலமான சுற்றுலா இடங்கள்",
        newsletter: "செய்திமடலுக்கு குழுசேருங்கள்",
        footerExplore: "ஆராயுங்கள்",
        customerCare: "வாடிக்கையாளர் சேவை",
        getInTouch: "தொடர்புக்கு"
    },

    hi: {
        home: "होम",
        destinations: "गंतव्य",
        packages: "पैकेज",
        about: "हमारे बारे में",
        contact: "संपर्क",
        booking: "बुकिंग",
        login: "लॉगिन",
        signup: "साइन अप",
        bookNow: "अभी बुक करें",
        explore: "दुनिया की खोज करें",
        search: "यात्रा खोजें",
        popular: "लोकप्रिय गंतव्य",
        newsletter: "हमारे न्यूज़लेटर की सदस्यता लें",
        footerExplore: "एक्सप्लोर",
        customerCare: "ग्राहक सेवा",
        getInTouch: "संपर्क करें"
    },

    te: {
        home: "హోమ్",
        destinations: "గమ్యస్థానాలు",
        packages: "ప్యాకేజీలు",
        about: "మా గురించి",
        contact: "సంప్రదించండి",
        booking: "బుకింగ్",
        login: "లాగిన్",
        signup: "సైన్ అప్",
        bookNow: "ఇప్పుడే బుక్ చేయండి",
        explore: "ప్రపంచాన్ని అన్వేషించండి",
        search: "ప్రయాణాలను వెతకండి",
        popular: "ప్రసిద్ధ గమ్యస్థానాలు",
        newsletter: "మా వార్తాలేఖకు సభ్యత్వం పొందండి",
        footerExplore: "అన్వేషించండి",
        customerCare: "కస్టమర్ కేర్",
        getInTouch: "సంప్రదించండి"
    },

    kn: {
        home: "ಮುಖಪುಟ",
        destinations: "ಪ್ರವಾಸಿ ಸ್ಥಳಗಳು",
        packages: "ಪ್ಯಾಕೇಜುಗಳು",
        about: "ನಮ್ಮ ಬಗ್ಗೆ",
        contact: "ಸಂಪರ್ಕಿಸಿ",
        booking: "ಬುಕಿಂಗ್",
        login: "ಲಾಗಿನ್",
        signup: "ಸೈನ್ ಅಪ್",
        bookNow: "ಈಗ ಬುಕ್ ಮಾಡಿ",
        explore: "ಜಗತ್ತನ್ನು ಅನ್ವೇಷಿಸಿ",
        search: "ಪ್ರಯಾಣಗಳನ್ನು ಹುಡುಕಿ",
        popular: "ಜನಪ್ರಿಯ ಪ್ರವಾಸಿ ಸ್ಥಳಗಳು",
        newsletter: "ನಮ್ಮ ಸುದ್ದಿಪತ್ರಕ್ಕೆ ಚಂದಾದಾರರಾಗಿ",
        footerExplore: "ಅನ್ವೇಷಿಸಿ",
        customerCare: "ಗ್ರಾಹಕ ಸೇವೆ",
        getInTouch: "ಸಂಪರ್ಕಿಸಿ"
    },

    ml: {
        home: "ഹോം",
        destinations: "യാത്രാ സ്ഥലങ്ങൾ",
        packages: "പാക്കേജുകൾ",
        about: "ഞങ്ങളെക്കുറിച്ച്",
        contact: "ബന്ധപ്പെടുക",
        booking: "ബുക്കിംഗ്",
        login: "ലോഗിൻ",
        signup: "സൈൻ അപ്പ്",
        bookNow: "ഇപ്പോൾ ബുക്ക് ചെയ്യുക",
        explore: "ലോകം പര്യവേക്ഷണം ചെയ്യുക",
        search: "യാത്രകൾ തിരയുക",
        popular: "ജനപ്രിയ യാത്രാ സ്ഥലങ്ങൾ",
        newsletter: "ഞങ്ങളുടെ വാർത്താക്കുറിപ്പിൽ ചേരുക",
        footerExplore: "പര്യവേക്ഷണം",
        customerCare: "ഉപഭോക്തൃ സേവനം",
        getInTouch: "ബന്ധപ്പെടുക"
    }
};

function translatePage(language) {
    const dictionary = VoyageTranslations[language];

    if (!dictionary) return;

    document.documentElement.lang = language;

    document.querySelectorAll("[data-i18n]").forEach(element => {
        const key = element.dataset.i18n;

        if (dictionary[key]) {
            element.textContent = dictionary[key];
        }
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
        const key = element.dataset.i18nPlaceholder;

        if (dictionary[key]) {
            element.placeholder = dictionary[key];
        }
    });

    VoyageStorage.set("voyage_language", language);

    document.querySelectorAll("[data-language-current]").forEach(element => {
        element.textContent = language.toUpperCase();
    });
}

function initLanguageSelector() {
    const buttons = document.querySelectorAll("[data-language-trigger]");

    buttons.forEach(button => {
        button.addEventListener("click", () => {
            openModal("language-modal");
        });
    });

    document.querySelectorAll("[data-language]").forEach(button => {
        button.addEventListener("click", () => {
            const language = button.dataset.language;

            translatePage(language);
            closeModal("language-modal");

            showToast("Language updated successfully.");
        });
    });

    const savedLanguage = VoyageStorage.get("voyage_language", "en");
    translatePage(savedLanguage);
}

/* ---------------------------------------------------------
   8. DESTINATION FILTERS
--------------------------------------------------------- */

function initDestinationFilters() {
    const filters = document.querySelectorAll("[data-filter]");
    const cards = document.querySelectorAll("[data-category]");

    if (!filters.length || !cards.length) return;

    filters.forEach(button => {
        button.addEventListener("click", () => {
            filters.forEach(item => item.classList.remove("active"));
            button.classList.add("active");

            const selected = button.dataset.filter;

            cards.forEach(card => {
                const category = card.dataset.category;

                const visible =
                    selected === "all" ||
                    category === selected;

                card.classList.toggle("hidden", !visible);
            });
        });
    });
}

/* ---------------------------------------------------------
   9. BOOKING STATE MANAGER
--------------------------------------------------------- */

const VoyageBooking = {
    key: "voyage_cart",

    getItems() {
        return VoyageStorage.get(this.key, []);
    },

    saveItems(items) {
        VoyageStorage.set(this.key, items);
        this.updateCounters();
    },

    add(item) {
        const items = this.getItems();

        const exists = items.some(existing => existing.id === item.id);

        if (exists) {
            showToast("This item is already in your booking.");
            return;
        }

        items.push({
            ...item,
            addedAt: new Date().toISOString()
        });

        this.saveItems(items);

        showToast(item.title + " added to your booking.");
    },

    remove(id) {
        const items = this.getItems().filter(item => item.id !== id);

        this.saveItems(items);
        renderBookingItems();
        renderBookingSummary();

        showToast("Item removed.");
    },

    clear() {
        this.saveItems([]);
    },

    total() {
        return this.getItems().reduce((sum, item) => {
            return sum + Number(item.price || 0);
        }, 0);
    },

    updateCounters() {
        const count = this.getItems().length;

        document.querySelectorAll("[data-booking-count]").forEach(element => {
            element.textContent = count;
        });
    }
};

/* ---------------------------------------------------------
   10. ADD TO BOOKING BUTTONS
--------------------------------------------------------- */

function initAddBookingButtons() {
    document.querySelectorAll("[data-add-booking]").forEach(button => {
        button.addEventListener("click", () => {
            const item = {
                id: button.dataset.id,
                title: button.dataset.title,
                price: Number(button.dataset.price),
                image: button.dataset.image || "",
                type: button.dataset.type || "Package"
            };

            if (!item.id || !item.title) {
                showToast("Booking item information is incomplete.");
                return;
            }

            VoyageBooking.add(item);
        });
    });

    VoyageBooking.updateCounters();
}

/* ---------------------------------------------------------
   11. BOOKING PAGE RENDERING
--------------------------------------------------------- */

function renderBookingItems() {
    const container = document.getElementById("booking-items");

    if (!container) return;

    const items = VoyageBooking.getItems();

    if (!items.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-suitcase-rolling"></i>
                <h3>No trips selected yet</h3>
                <p>Explore destinations and add your favourite trip.</p>
                <a href="tourist.html" class="btn btn-primary">
                    Explore Destinations
                </a>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="booking-item">
            <img src="${escapeHTML(item.image || 'img/vitaly-gariev-fU6cWSv62p4-unsplash.webp')}"
                 alt="${escapeHTML(item.title)}">

            <div>
                <h3>${escapeHTML(item.title)}</h3>
                <p>${escapeHTML(item.type || "Travel Package")}</p>
                <strong>₹${Number(item.price).toLocaleString("en-IN")}</strong>
            </div>

            <button class="remove-item"
                    data-remove-booking="${escapeHTML(item.id)}">
                Remove
            </button>
        </div>
    `).join("");

    container.querySelectorAll("[data-remove-booking]").forEach(button => {
        button.addEventListener("click", () => {
            VoyageBooking.remove(button.dataset.removeBooking);
        });
    });
}

function renderBookingSummary() {
    const subtotal = document.getElementById("booking-subtotal");
    const total = document.getElementById("booking-total");
    const count = document.getElementById("booking-summary-count");

    if (!subtotal || !total) return;

    const items = VoyageBooking.getItems();
    const amount = VoyageBooking.total();

    subtotal.textContent = "₹" + amount.toLocaleString("en-IN");
    total.textContent = "₹" + amount.toLocaleString("en-IN");

    if (count) count.textContent = items.length;
}

/* ---------------------------------------------------------
   12. BOOKING SEARCH FORM
--------------------------------------------------------- */

function initSearchForm() {
    const form = document.getElementById("travel-search-form");

    if (!form) return;

    form.addEventListener("submit", event => {
        event.preventDefault();

        const destination =
            document.getElementById("search-destination")?.value.trim();

        const date =
            document.getElementById("search-date")?.value;

        const guests =
            document.getElementById("search-guests")?.value || "2";

        if (!destination || !date) {
            showToast("Please select a destination and travel date.");
            return;
        }

        const params = new URLSearchParams({
            destination,
            date,
            guests
        });

        window.location.href = "tourist.html?" + params.toString();
    });
}

/* ---------------------------------------------------------
   13. AUTH TABS
--------------------------------------------------------- */

function initAuthTabs() {
    const tabs = document.querySelectorAll("[data-auth-tab]");
    const panels = document.querySelectorAll("[data-auth-panel]");

    if (!tabs.length || !panels.length) return;

    function activateTab(name) {
        tabs.forEach(tab => {
            tab.classList.toggle(
                "active",
                tab.dataset.authTab === name
            );
        });

        panels.forEach(panel => {
            panel.classList.toggle(
                "active",
                panel.dataset.authPanel === name
            );
        });
    }

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            activateTab(tab.dataset.authTab);
        });
    });

    document.querySelectorAll("[data-switch-auth]").forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();
            activateTab(link.dataset.switchAuth);
        });
    });
}

/* ---------------------------------------------------------
   14. DEMO AUTHENTICATION
   Production authentication requires a secure backend.
--------------------------------------------------------- */

function initAuthForms() {
    const signupForm = document.getElementById("signup-form");
    const loginForm = document.getElementById("login-form");
    const forgotForm = document.getElementById("forgot-form");

    signupForm?.addEventListener("submit", event => {
        event.preventDefault();

        const name = document.getElementById("signup-name").value.trim();
        const email = document.getElementById("signup-email").value.trim();
        const password = document.getElementById("signup-password").value;

        if (password.length < 8) {
            showToast("Password must contain at least 8 characters.");
            return;
        }

        const users = VoyageStorage.get("voyage_users", []);

        if (users.some(user => user.email === email)) {
            showToast("An account with this email already exists.");
            return;
        }

        /*
          DEMO ONLY:
          Never store plain-text passwords in a production application.
          Replace this flow with secure server-side authentication.
        */

        users.push({
            id: Date.now().toString(),
            name,
            email
        });

        VoyageStorage.set("voyage_users", users);

        showToast("Demo account created. Please log in.");

        document.querySelector('[data-auth-tab="login"]')?.click();
    });

    loginForm?.addEventListener("submit", event => {
        event.preventDefault();

        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value;

        const users = VoyageStorage.get("voyage_users", []);

        /*
          DEMO LOGIN:
          This does not authenticate a real user.
          Use a backend for secure password verification.
        */

        const user = users.find(item => item.email === email);

        if (!user || !password) {
            showToast("Demo account not found. Please sign up first.");
            return;
        }

        VoyageStorage.set("voyage_session", {
            id: user.id,
            name: user.name,
            email: user.email
        });

        showToast("Demo login successful!");

        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 700);
    });

    forgotForm?.addEventListener("submit", event => {
        event.preventDefault();

        showToast("Password recovery requires a configured backend.");
    });
}

/* ---------------------------------------------------------
   15. DASHBOARD
--------------------------------------------------------- */

function initDashboard() {
    const session = VoyageStorage.get("voyage_session");

    const nameLabels = document.querySelectorAll("[data-user-name]");
    const emailLabels = document.querySelectorAll("[data-user-email]");

    nameLabels.forEach(element => {
        element.textContent = session?.name || "Guest Traveller";
    });

    emailLabels.forEach(element => {
        element.textContent = session?.email || "guest@example.com";
    });

    const tabs = document.querySelectorAll("[data-dashboard-tab]");
    const panels = document.querySelectorAll("[data-dashboard-panel]");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const name = tab.dataset.dashboardTab;

            tabs.forEach(item => item.classList.remove("active"));
            panels.forEach(item => item.classList.remove("active"));

            tab.classList.add("active");

            document.querySelector(
                `[data-dashboard-panel="${name}"]`
            )?.classList.add("active");
        });
    });

    renderDashboardBookings();

    document.getElementById("logout-button")?.addEventListener("click", () => {
        VoyageStorage.remove("voyage_session");
        showToast("You have logged out.");

        setTimeout(() => {
            window.location.href = "login.html";
        }, 500);
    });

    const profileForm = document.getElementById("profile-form");

    profileForm?.addEventListener("submit", event => {
        event.preventDefault();

        const name = document.getElementById("profile-name").value.trim();
        const email = document.getElementById("profile-email").value.trim();

        if (!name || !email) {
            showToast("Please complete your profile information.");
            return;
        }

        const currentSession = VoyageStorage.get("voyage_session");

        if (currentSession) {
            currentSession.name = name;
            currentSession.email = email;

            VoyageStorage.set("voyage_session", currentSession);
        }

        nameLabels.forEach(element => element.textContent = name);
        emailLabels.forEach(element => element.textContent = email);

        showToast("Profile updated.");
    });
}

function renderDashboardBookings() {
    const container = document.getElementById("dashboard-bookings");

    if (!container) return;

    const bookings = VoyageStorage.get("voyage_confirmed_bookings", []);

    const countLabel = document.getElementById("dashboard-booking-count");
    const amountLabel = document.getElementById("dashboard-spend");

    if (countLabel) countLabel.textContent = bookings.length;

    if (amountLabel) {
        const amount = bookings.reduce((sum, item) => sum + Number(item.total || 0), 0);
        amountLabel.textContent = "₹" + amount.toLocaleString("en-IN");
    }

    if (!bookings.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-ticket"></i>
                <h3>No confirmed bookings</h3>
                <p>Your confirmed travel bookings will appear here.</p>
                <a href="tourist.html" class="btn btn-primary">
                    Explore Trips
                </a>
            </div>
        `;
        return;
    }

    container.innerHTML = bookings.map(booking => `
        <tr>
            <td>${escapeHTML(booking.reference)}</td>
            <td>${escapeHTML(booking.destination)}</td>
            <td>${escapeHTML(booking.date)}</td>
            <td>₹${Number(booking.total).toLocaleString("en-IN")}</td>
            <td><span class="status confirmed">Demo Confirmed</span></td>
            <td>
                <button class="btn btn-outline btn-sm"
                        data-ticket="${escapeHTML(booking.reference)}">
                    Ticket
                </button>
            </td>
        </tr>
    `).join("");

    container.querySelectorAll("[data-ticket]").forEach(button => {
        button.addEventListener("click", () => {
            downloadTicket(button.dataset.ticket);
        });
    });
}

/* ---------------------------------------------------------
   16. CONFIRM BOOKING
--------------------------------------------------------- */

function initConfirmBooking() {
    const form = document.getElementById("confirm-booking-form");

    if (!form) return;

    form.addEventListener("submit", event => {
        event.preventDefault();

        const items = VoyageBooking.getItems();

        if (!items.length) {
            showToast("Add a travel package before confirming.");
            return;
        }

        const date = document.getElementById("booking-date")?.value;
        const guests = document.getElementById("booking-guests")?.value;

        if (!date || !guests) {
            showToast("Please select your date and guest count.");
            return;
        }

        const total = VoyageBooking.total();

        const reference =
            "VG" + Date.now().toString().slice(-8);

        const destination = items.map(item => item.title).join(", ");

        const confirmed = VoyageStorage.get(
            "voyage_confirmed_bookings",
            []
        );

        const newBooking = {
            reference,
            destination,
            date,
            guests,
            total,
            items,
            createdAt: new Date().toISOString(),
            status: "Demo Confirmed"
        };

        confirmed.push(newBooking);

        VoyageStorage.set("voyage_confirmed_bookings", confirmed);
        VoyageBooking.clear();

        renderBookingItems();
        renderBookingSummary();

        showToast("Demo booking created: " + reference);

        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1000);
    });
}

/* ---------------------------------------------------------
   17. TICKET DOWNLOAD
--------------------------------------------------------- */

function downloadTicket(reference) {
    const bookings = VoyageStorage.get("voyage_confirmed_bookings", []);

    const booking = bookings.find(item => item.reference === reference);

    if (!booking) {
        showToast("Booking details not found.");
        return;
    }

    const content = `
VOYAGEGO - TRAVEL BOOKING RECEIPT
=================================

Reference: ${booking.reference}
Destination: ${booking.destination}
Travel Date: ${booking.date}
Guests: ${booking.guests}
Total: INR ${booking.total}
Status: ${booking.status}

Thank you for choosing VoyageGo.

Note: This is a demonstration booking receipt.
It is not a real travel ticket or reservation confirmation.
    `.trim();

    const blob = new Blob([content], {
        type: "text/plain;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "VoyageGo-" + reference + ".txt";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    showToast("Booking receipt downloaded.");
}

/* ---------------------------------------------------------
   18. NEWSLETTER
--------------------------------------------------------- */

function initNewsletter() {
    document.querySelectorAll("[data-newsletter-form]").forEach(form => {
        form.addEventListener("submit", event => {
            event.preventDefault();

            const input = form.querySelector("input[type='email']");

            if (!input || !input.checkValidity()) {
                showToast("Please enter a valid email address.");
                return;
            }

            const email = input.value.trim();

            const subscribers = VoyageStorage.get(
                "voyage_subscribers",
                []
            );

            if (subscribers.includes(email)) {
                showToast("You are already subscribed.");
                return;
            }

            subscribers.push(email);

            VoyageStorage.set("voyage_subscribers", subscribers);

            form.reset();

            showToast("Thank you for subscribing!");
        });
    });
}

/* ---------------------------------------------------------
   19. CONTACT FORM
--------------------------------------------------------- */

function initContactForm() {
    const form = document.getElementById("contact-form");

    form?.addEventListener("submit", event => {
        event.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        showToast("Thank you! Your demo enquiry has been received.");

        form.reset();
    });
}

/* ---------------------------------------------------------
   20. SCROLL REVEAL
--------------------------------------------------------- */

function initScrollReveal() {
    const elements = document.querySelectorAll(".reveal");

    if (!("IntersectionObserver" in window)) {
        elements.forEach(element => element.classList.add("visible"));
        return;
    }

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.12
    });

    elements.forEach(element => observer.observe(element));
}

/* ---------------------------------------------------------
   21. CURRENT YEAR
--------------------------------------------------------- */

function initCurrentYear() {
    document.querySelectorAll("[data-current-year]").forEach(element => {
        element.textContent = new Date().getFullYear();
    });
}

/* ---------------------------------------------------------
   22. HTML ESCAPING
--------------------------------------------------------- */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const map = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return map[character];
    });
}

/* ---------------------------------------------------------
   23. APPLICATION INITIALIZATION
--------------------------------------------------------- */

// The script is loaded at the end of each page, so show the overlay before
// the browser paints the page and then initialize page behavior on DOM ready.
initPreloader();

document.addEventListener("DOMContentLoaded", () => {
    initMobileMenu();
    initModalControls();
    initLocationSelector();
    initLanguageSelector();

    initDestinationFilters();
    initAddBookingButtons();

    initBookingPage();
    initSearchForm();

    initAuthTabs();
    initAuthForms();

    initDashboard();
    initConfirmBooking();

    initNewsletter();
    initContactForm();

    initScrollReveal();
    initCurrentYear();
});

/* Booking page initializer */

function initBookingPage() {
    renderBookingItems();
    renderBookingSummary();
}

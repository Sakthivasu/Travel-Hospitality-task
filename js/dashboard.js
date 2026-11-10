document.addEventListener("DOMContentLoaded", function () {

        const USERS_KEY = "voyage_users";
        const SESSION_KEY = "voyage_current_user";
        const BOOKINGS_KEY = "voyage_bookings";
        const PROFILE_KEY = "voyage_profile";
        const SETTINGS_KEY = "voyage_settings";

        let currentUser = null;
        let bookings = [];
        let activeFilter = "all";
        let selectedBookingId = null;


        /* =====================================
           STORAGE HELPERS
        ====================================== */

        function readJSON(storage, key, fallback) {

            try {
                const value = storage.getItem(key);

                if (!value) return fallback;

                return JSON.parse(value);

            } catch (error) {
                return fallback;
            }

        }

        function saveJSON(storage, key, value) {

            storage.setItem(key, JSON.stringify(value));

        }


        /* =====================================
           SESSION
        ====================================== */

        function getCurrentSession() {

            const localSession = readJSON(
                localStorage,
                SESSION_KEY,
                null
            );

            if (localSession) return localSession;

            const temporarySession = readJSON(
                sessionStorage,
                SESSION_KEY,
                null
            );

            return temporarySession;

        }


        function requireLogin() {

            currentUser = getCurrentSession();

            if (!currentUser || !currentUser.email) {

                window.location.replace("login.html");

                return false;

            }

            return true;

        }


        if (!requireLogin()) return;


        /* =====================================
           LOAD USER BOOKINGS
        ====================================== */

        function loadBookings() {

            const allBookings = readJSON(
                localStorage,
                BOOKINGS_KEY,
                []
            );

            if (!Array.isArray(allBookings)) return [];

            return allBookings.filter(booking => {

                return booking.contact &&
                    booking.contact.email &&
                    booking.contact.email.toLowerCase() ===
                    currentUser.email.toLowerCase();

            });

        }


        bookings = loadBookings();


        /* =====================================
           FORMAT HELPERS
        ====================================== */

        function escapeHTML(value) {

            return String(value ?? "").replace(/[&<>"']/g, char => {

                const entities = {
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"
                };

                return entities[char];

            });

        }


        function money(amount) {

            return new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0
            }).format(Number(amount) || 0);

        }


        function formatDate(dateValue) {

            if (!dateValue) return "Not provided";

            const date = new Date(dateValue + "T00:00:00");

            if (Number.isNaN(date.getTime())) {
                return "Not provided";
            }

            return date.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric"
            });

        }


        function initials(name) {

            return String(name || "VoyageGo")
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map(part => part.charAt(0).toUpperCase())
                .join("");

        }


        function getBookingStatus(booking) {

            const status = String(
                booking.status || "Demo Booking Saved"
            ).toLowerCase();

            if (status.includes("cancel")) {
                return {
                    label: "Cancelled",
                    className: "status-cancelled"
                };
            }

            if (status.includes("complete")) {
                return {
                    label: "Completed",
                    className: "status-completed"
                };
            }

            if (status.includes("confirm")) {
                return {
                    label: "Confirmed",
                    className: "status-confirmed"
                };
            }

            if (status.includes("pending")) {
                return {
                    label: "Pending",
                    className: "status-pending"
                };
            }

            return {
                label: "Demo Saved",
                className: "status-demo"
            };

        }


        function getBookingTitle(booking) {

            if (Array.isArray(booking.items) && booking.items.length) {

                return booking.items.map(item =>
                    item.title || item.name || "Travel Package"
                ).join(", ");

            }

            return booking.destination ||
                booking.packageName ||
                "Travel Booking";

        }


        function getBookingImage(booking) {

            const firstItem = booking.items &&
                booking.items.length
                ? booking.items[0]
                : null;

            return firstItem?.image ||
                "img/sophie-turner-LZVmvKlchM0-unsplash.webp";

        }


        function getBookingTotal(booking) {

            return Number(
                booking.pricing?.total ??
                booking.total ??
                booking.amount ??
                0
            );

        }


        function getDateCategory(booking) {

            const status = getBookingStatus(booking).label;

            if (status === "Cancelled") return "cancelled";

            if (status === "Completed") return "completed";

            const departure = booking.travel?.departureDate;

            if (!departure) return "upcoming";

            const date = new Date(departure + "T00:00:00");

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (date < today) return "completed";

            return "upcoming";

        }


        /* =====================================
           USER PROFILE DISPLAY
        ====================================== */

        function getProfile() {

            const profiles = readJSON(
                localStorage,
                PROFILE_KEY,
                {}
            );

            return profiles[currentUser.email] || {};

        }


        function updateUserDisplay() {

            const profile = getProfile();

            const name = profile.name ||
                currentUser.name ||
                "Traveller";

            const email = currentUser.email;

            document.getElementById("welcomeName").textContent =
                name.split(" ")[0];

            document.getElementById("sidebarName").textContent =
                name;

            document.getElementById("sidebarEmail").textContent =
                email;

            document.getElementById("sidebarAvatar").textContent =
                initials(name);

            document.getElementById("profileName").value =
                profile.name || currentUser.name || "";

            document.getElementById("profileEmail").value =
                email;

            document.getElementById("profilePhone").value =
                profile.phone || currentUser.phone || "";

            document.getElementById("profileDisplayName").textContent =
                profile.name || currentUser.name || "Traveller";
            document.getElementById("profileDisplayEmail").textContent = email;
            document.getElementById("profileDisplayPhone").textContent =
                profile.phone || currentUser.phone || "Not provided";

            document.getElementById("profileCity").value =
                profile.city || "";

            document.getElementById("profileCountry").value =
                profile.country || "";

            document.getElementById("profileBirthday").value =
                profile.birthday || "";

            document.getElementById("profileBio").value =
                profile.bio || "";

        }


        /* =====================================
           DASHBOARD STATISTICS
        ====================================== */

        function updateStatistics() {

            bookings = loadBookings();

            const activeBookings = bookings.filter(booking => {
                return getBookingStatus(booking).label !== "Cancelled";
            });

            const upcoming = bookings.filter(booking => {
                return getDateCategory(booking) === "upcoming";
            });

            const completed = bookings.filter(booking => {
                return getDateCategory(booking) === "completed";
            });

            const spent = activeBookings.reduce((total, booking) => {
                return total + getBookingTotal(booking);
            }, 0);


            document.getElementById("totalBookings")
                .textContent = bookings.length;

            document.getElementById("upcomingTrips")
                .textContent = upcoming.length;

            document.getElementById("completedTrips")
                .textContent = completed.length;

            document.getElementById("totalSpent")
                .textContent = money(spent);

            document.getElementById("navBookingCount")
                .textContent = bookings.length;

        }


        /* =====================================
           BOOKING CARD
        ====================================== */

        function bookingCard(booking) {

            const title = getBookingTitle(booking);

            const image = getBookingImage(booking);

            const status = getBookingStatus(booking);

            const total = getBookingTotal(booking);

            const departure =
                booking.travel?.departureDate || "";

            const returning =
                booking.travel?.returnDate || "";

            const id = booking.id || "N/A";

            return `

                <article class="dashboard-booking-card">

                    <img
                        class="dashboard-booking-image"
                        src="${escapeHTML(image)}"
                        alt="${escapeHTML(title)}"
                        onerror="this.src='img/sophie-turner-LZVmvKlchM0-unsplash.webp'"
                    >

                    <div class="dashboard-booking-info">

                        <h3>${escapeHTML(title)}</h3>

                        <p>
                            <i class="fa-regular fa-calendar"></i>
                            ${escapeHTML(formatDate(departure))}
                            ${returning ? " – " + escapeHTML(formatDate(returning)) : ""}
                        </p>

                        <p>
                            <i class="fa-solid fa-users"></i>
                            ${(booking.travellers || []).length} Traveller(s)
                        </p>

                        <div class="booking-id">
                            Booking ID: ${escapeHTML(id)}
                        </div>

                    </div>

                    <div class="dashboard-booking-actions">

                        <strong class="booking-price">
                            ${money(total)}
                        </strong>

                        <span class="booking-status ${status.className}">
                            ${status.label}
                        </span>

                        <div class="booking-action-buttons">

                            <button type="button"
                                title="View Details"
                                aria-label="View booking details"
                                data-view-booking="${escapeHTML(id)}">
                                <i class="fa-regular fa-eye"></i>
                            </button>

                            <button type="button"
                                title="Print Booking"
                                aria-label="Print booking"
                                data-print-booking="${escapeHTML(id)}">
                                <i class="fa-solid fa-print"></i>
                            </button>

                        </div>

                    </div>

                </article>

            `;

        }


        /* =====================================
           EMPTY STATE
        ====================================== */

        function emptyState(title, description) {

            return `

                <div class="dashboard-empty">

                    <div class="empty-icon">
                        <i class="fa-solid fa-suitcase-rolling"></i>
                    </div>

                    <h3>${escapeHTML(title)}</h3>

                    <p>${escapeHTML(description)}</p>

                    <a href="tourist.html">
                        <i class="fa-solid fa-compass"></i>
                        Explore Destinations
                    </a>

                </div>

            `;

        }


        /* =====================================
           RECENT BOOKINGS
        ====================================== */

        function renderRecentBookings() {

            const container =
                document.getElementById("recentBookings");

            const recent = [...bookings]
                .sort((a, b) =>
                    new Date(b.createdAt || 0) -
                    new Date(a.createdAt || 0)
                )
                .slice(0, 3);

            if (!recent.length) {

                container.innerHTML = emptyState(
                    "No bookings yet",
                    "Your travel adventures will appear here after you save a booking."
                );

                return;

            }

            container.innerHTML = recent.map(bookingCard).join("");

        }


        /* =====================================
           ALL BOOKINGS
        ====================================== */

        function renderAllBookings() {

            const container =
                document.getElementById("allBookings");

            bookings = loadBookings();

            let filtered = [...bookings];

            if (activeFilter !== "all") {

                filtered = filtered.filter(booking => {

                    return getDateCategory(booking) === activeFilter;

                });

            }

            filtered.sort((a, b) =>
                new Date(b.createdAt || 0) -
                new Date(a.createdAt || 0)
            );

            if (!filtered.length) {

                container.innerHTML = emptyState(
                    activeFilter === "all"
                        ? "No bookings found"
                        : "No " + activeFilter + " bookings",

                    "When you make a booking, its details will appear here."
                );

                return;

            }

            container.innerHTML = filtered.map(bookingCard).join("");

        }


        /* =====================================
           FILTER BUTTONS
        ====================================== */

        document.querySelectorAll("[data-filter]")
            .forEach(button => {

                button.addEventListener("click", function () {

                    document.querySelectorAll("[data-filter]")
                        .forEach(item => item.classList.remove("active"));

                    this.classList.add("active");

                    activeFilter = this.dataset.filter;

                    renderAllBookings();

                });

            });


        /* =====================================
           NAVIGATION
        ====================================== */

        function openSection(sectionName) {

            const validSections = [
                "overview",
                "bookings",
                "profile",
                "settings"
            ];

            if (!validSections.includes(sectionName)) return;

            document.querySelectorAll(".dashboard-section")
                .forEach(section => {
                    section.classList.remove("active");
                });

            document.getElementById(
                "section-" + sectionName
            ).classList.add("active");


            document.querySelectorAll(
                "#dashboardNav button[data-section]"
            ).forEach(button => {

                button.classList.toggle(
                    "active",
                    button.dataset.section === sectionName
                );

            });


            if (sectionName === "bookings") {
                renderAllBookings();
            }

        }


        document.querySelectorAll(
            "#dashboardNav button[data-section]"
        ).forEach(button => {

            button.addEventListener("click", function () {

                openSection(this.dataset.section);

            });

        });


        document.querySelectorAll("[data-open-section]")
            .forEach(button => {

                button.addEventListener("click", function () {

                    openSection(this.dataset.openSection);

                });

            });


        /* =====================================
           TOAST
        ====================================== */

        let toastTimeout;

        function showToast(message) {

            const toast = document.getElementById("dashboardToast");

            toast.textContent = message;

            toast.classList.add("show");

            clearTimeout(toastTimeout);

            toastTimeout = setTimeout(() => {
                toast.classList.remove("show");
            }, 3000);

        }


        /* =====================================
           BOOKING DETAILS
        ====================================== */

        function openBookingDetails(bookingId) {

            const booking = bookings.find(item =>
                String(item.id) === String(bookingId)
            );

            if (!booking) {
                showToast("Booking details could not be found.");
                return;
            }

            selectedBookingId = bookingId;

            const status = getBookingStatus(booking);

            const items = (booking.items || [])
                .map(item => item.title || item.name || "Travel Package")
                .join(", ");

            const travellers = booking.travellers || [];

            const travellerNames = travellers.length
                ? travellers.map(person => person.name).join(", ")
                : "Not provided";

            const contact = booking.contact || {};

            const travel = booking.travel || {};

            const pricing = booking.pricing || {};

            const content = document.getElementById(
                "bookingDetailsContent"
            );

            content.innerHTML = `

                <div class="detail-group">

                    <h4>Booking Information</h4>

                    <div class="detail-row">
                        <span>Booking ID</span>
                        <strong>${escapeHTML(booking.id || "N/A")}</strong>
                    </div>

                    <div class="detail-row">
                        <span>Trip</span>
                        <strong>${escapeHTML(items || getBookingTitle(booking))}</strong>
                    </div>

                    <div class="detail-row">
                        <span>Status</span>
                        <strong>${escapeHTML(status.label)}</strong>
                    </div>

                    <div class="detail-row">
                        <span>Booking Date</span>
                        <strong>${escapeHTML(
                            booking.createdAt
                                ? new Date(booking.createdAt).toLocaleDateString("en-IN")
                                : "N/A"
                        )}</strong>
                    </div>

                </div>


                <div class="detail-group">

                    <h4>Travel Information</h4>

                    <div class="detail-row">
                        <span>Departure</span>
                        <strong>${escapeHTML(formatDate(travel.departureDate))}</strong>
                    </div>

                    <div class="detail-row">
                        <span>Return</span>
                        <strong>${escapeHTML(formatDate(travel.returnDate))}</strong>
                    </div>

                    <div class="detail-row">
                        <span>Departure City</span>
                        <strong>${escapeHTML(travel.departureCity || "N/A")}</strong>
                    </div>

                    <div class="detail-row">
                        <span>Travel Type</span>
                        <strong>${escapeHTML(travel.travelType || "N/A")}</strong>
                    </div>

                    <div class="detail-row">
                        <span>Travellers</span>
                        <strong>${travellers.length}</strong>
                    </div>

                    <div class="detail-row">
                        <span>Traveller Names</span>
                        <strong>${escapeHTML(travellerNames)}</strong>
                    </div>

                </div>


                <div class="detail-group">

                    <h4>Contact Details</h4>

                    <div class="detail-row">
                        <span>Name</span>
                        <strong>${escapeHTML(contact.name || "N/A")}</strong>
                    </div>

                    <div class="detail-row">
                        <span>Email</span>
                        <strong>${escapeHTML(contact.email || "N/A")}</strong>
                    </div>

                    <div class="detail-row">
                        <span>Phone</span>
                        <strong>${escapeHTML(contact.phone || "N/A")}</strong>
                    </div>

                </div>


                <div class="detail-group">

                    <h4>Payment Summary</h4>

                    <div class="detail-row">
                        <span>Subtotal</span>
                        <strong>${money(pricing.subtotal || 0)}</strong>
                    </div>

                    <div class="detail-row">
                        <span>Tax</span>
                        <strong>${money(pricing.tax || 0)}</strong>
                    </div>

                    <div class="detail-row">
                        <span>Discount</span>
                        <strong>${money(pricing.discount || 0)}</strong>
                    </div>

                    <div class="detail-row">
                        <span>Total</span>
                        <strong>${money(getBookingTotal(booking))}</strong>
                    </div>

                    <div class="detail-row">
                        <span>Payment Status</span>
                        <strong>${escapeHTML(booking.paymentStatus || "Not Paid")}</strong>
                    </div>

                </div>


                <div class="modal-booking-actions">

                    <button type="button"
                        class="modal-primary"
                        id="modalPrintBooking">
                        <i class="fa-solid fa-print"></i>
                        Print Details
                    </button>

                    ${
                        status.label !== "Cancelled" &&
                        status.label !== "Completed"
                        ? `
                            <button type="button"
                                id="modalCancelBooking"
                                style="color:#d64b55;">
                                <i class="fa-solid fa-ban"></i>
                                Cancel Demo Booking
                            </button>
                        `
                        : ""
                    }

                </div>

                <p style="font-size:10px;color:#999eaa;line-height:1.7;margin-top:14px;">
                    This is a browser-stored demo booking record, not a confirmed
                    airline, hotel or tour reservation.
                </p>

            `;


            document.getElementById("bookingDetailsModal")
                .classList.add("show");

            document.body.style.overflow = "hidden";


            document.getElementById("modalPrintBooking")
                .addEventListener("click", function () {

                    printBooking(booking);

                });


            const cancelButton =
                document.getElementById("modalCancelBooking");

            if (cancelButton) {

                cancelButton.addEventListener("click", function () {

                    cancelBooking(booking.id);

                });

            }

        }


        /* =====================================
           CLOSE DETAILS MODAL
        ====================================== */

        function closeBookingModal() {

            document.getElementById("bookingDetailsModal")
                .classList.remove("show");

            document.body.style.overflow = "";

            selectedBookingId = null;

        }


        document.getElementById("closeBookingModal")
            .addEventListener("click", closeBookingModal);


        document.getElementById("bookingDetailsModal")
            .addEventListener("click", function (event) {

                if (event.target === this) {
                    closeBookingModal();
                }

            });


        document.addEventListener("keydown", function (event) {

            if (event.key === "Escape") {
                closeBookingModal();
            }

        });


        /* =====================================
           BOOKING CARD ACTIONS
        ====================================== */

        document.addEventListener("click", function (event) {

            const viewButton =
                event.target.closest("[data-view-booking]");

            if (viewButton) {

                openBookingDetails(
                    viewButton.dataset.viewBooking
                );

                return;

            }


            const printButton =
                event.target.closest("[data-print-booking]");

            if (printButton) {

                const booking = bookings.find(item =>
                    String(item.id) ===
                    String(printButton.dataset.printBooking)
                );

                if (booking) {
                    printBooking(booking);
                }

            }

        });


        /* =====================================
           PRINT BOOKING
        ====================================== */

        function printBooking(booking) {

            const items = (booking.items || [])
                .map(item => item.title || item.name || "Travel Package")
                .join(", ");

            const contact = booking.contact || {};
            const travel = booking.travel || {};
            const pricing = booking.pricing || {};

            const printWindow = window.open(
                "",
                "_blank",
                "width=850,height=750"
            );

            if (!printWindow) {

                showToast(
                    "Please allow pop-ups to print your booking details."
                );

                return;

            }


            const printContent = `

                <!DOCTYPE html>
                <html lang="en">

                <head>

                    <meta charset="UTF-8">

                    <title>VoyageGo Booking ${escapeHTML(booking.id)}</title>

                    <style>

                        body {
                            font-family: Arial, sans-serif;
                            padding: 35px;
                            color: #333;
                        }

                        .header {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            border-bottom: 2px solid #ff4757;
                            padding-bottom: 20px;
                        }

                        h1 {
                            color: #ff4757;
                            margin: 0;
                        }

                        h2 {
                            font-size: 16px;
                            margin-top: 25px;
                            color: #333;
                        }

                        p {
                            font-size: 13px;
                            line-height: 1.7;
                        }

                        .row {
                            display: flex;
                            justify-content: space-between;
                            gap: 20px;
                            padding: 10px 0;
                            border-bottom: 1px solid #eee;
                            font-size: 13px;
                        }

                        .total {
                            font-size: 20px;
                            font-weight: bold;
                            color: #ff4757;
                        }

                        .note {
                            margin-top: 30px;
                            padding: 15px;
                            background: #fff5f5;
                            font-size: 11px;
                            line-height: 1.6;
                        }

                        @media print {
                            body {
                                padding: 10px;
                            }
                        }

                    </style>

                </head>

                <body>

                    <div class="header">
                        <h1>VoyageGo</h1>
                        <strong>Booking Details</strong>
                    </div>

                    <h2>Booking Information</h2>

                    <div class="row">
                        <span>Booking ID</span>
                        <strong>${escapeHTML(booking.id)}</strong>
                    </div>

                    <div class="row">
                        <span>Selected Trip</span>
                        <strong>${escapeHTML(items || getBookingTitle(booking))}</strong>
                    </div>

                    <div class="row">
                        <span>Status</span>
                        <strong>${escapeHTML(getBookingStatus(booking).label)}</strong>
                    </div>

                    <h2>Travel Information</h2>

                    <div class="row">
                        <span>Departure Date</span>
                        <strong>${escapeHTML(formatDate(travel.departureDate))}</strong>
                    </div>

                    <div class="row">
                        <span>Return Date</span>
                        <strong>${escapeHTML(formatDate(travel.returnDate))}</strong>
                    </div>

                    <div class="row">
                        <span>Departure City</span>
                        <strong>${escapeHTML(travel.departureCity || "N/A")}</strong>
                    </div>

                    <h2>Contact Information</h2>

                    <div class="row">
                        <span>Name</span>
                        <strong>${escapeHTML(contact.name || "N/A")}</strong>
                    </div>

                    <div class="row">
                        <span>Email</span>
                        <strong>${escapeHTML(contact.email || "N/A")}</strong>
                    </div>

                    <div class="row">
                        <span>Phone</span>
                        <strong>${escapeHTML(contact.phone || "N/A")}</strong>
                    </div>

                    <h2>Price Summary</h2>

                    <div class="row">
                        <span>Subtotal</span>
                        <strong>${money(pricing.subtotal || 0)}</strong>
                    </div>

                    <div class="row">
                        <span>Tax</span>
                        <strong>${money(pricing.tax || 0)}</strong>
                    </div>

                    <div class="row">
                        <span>Discount</span>
                        <strong>${money(pricing.discount || 0)}</strong>
                    </div>

                    <div class="row total">
                        <span>Total</span>
                        <strong>${money(getBookingTotal(booking))}</strong>
                    </div>

                    <div class="note">
                        This document is a record of a VoyageGo frontend demo.
                        It is not a confirmed travel ticket, hotel reservation,
                        payment receipt or boarding pass.
                    </div>

                </body>
                </html>

            `;


            printWindow.document.open();
            printWindow.document.write(printContent);
            printWindow.document.close();

            window.setTimeout(() => {
                if (printWindow.closed) return;
                printWindow.focus();
                printWindow.print();
            }, 250);

        }


        /* =====================================
           CANCEL DEMO BOOKING
        ====================================== */

        function cancelBooking(bookingId) {

            const confirmed = window.confirm(
                "Are you sure you want to cancel this demo booking?"
            );

            if (!confirmed) return;

            const allBookings = readJSON(
                localStorage,
                BOOKINGS_KEY,
                []
            );

            const bookingIndex = allBookings.findIndex(item => {

                return String(item.id) === String(bookingId) &&
                    item.contact &&
                    item.contact.email.toLowerCase() ===
                    currentUser.email.toLowerCase();

            });

            if (bookingIndex === -1) {

                showToast("Booking could not be found.");

                return;

            }


            allBookings[bookingIndex].status = "Cancelled";

            allBookings[bookingIndex].cancelledAt =
                new Date().toISOString();


            saveJSON(
                localStorage,
                BOOKINGS_KEY,
                allBookings
            );


            bookings = loadBookings();

            updateStatistics();
            renderRecentBookings();
            renderAllBookings();

            closeBookingModal();

            showToast("Demo booking cancelled successfully.");

        }


        /* =====================================
           SAVE PROFILE
        ====================================== */

        document.getElementById("profileForm")
            .addEventListener("submit", function (event) {

                event.preventDefault();

                if (!this.checkValidity()) {
                    this.reportValidity();
                    return;
                }

                const profiles = readJSON(
                    localStorage,
                    PROFILE_KEY,
                    {}
                );

                profiles[currentUser.email] = {

                    name: document.getElementById("profileName")
                        .value.trim(),

                    phone: document.getElementById("profilePhone")
                        .value.trim(),

                    city: document.getElementById("profileCity")
                        .value.trim(),

                    country: document.getElementById("profileCountry")
                        .value.trim(),

                    birthday: document.getElementById("profileBirthday")
                        .value,

                    bio: document.getElementById("profileBio")
                        .value.trim()

                };


                saveJSON(
                    localStorage,
                    PROFILE_KEY,
                    profiles
                );


                currentUser.name =
                    profiles[currentUser.email].name;

                currentUser.phone =
                    profiles[currentUser.email].phone;


                /*
                  Update the current browser session.
                */

                if (localStorage.getItem(SESSION_KEY)) {

                    saveJSON(
                        localStorage,
                        SESSION_KEY,
                        currentUser
                    );

                } else {

                    saveJSON(
                        sessionStorage,
                        SESSION_KEY,
                        currentUser
                    );

                }


                updateUserDisplay();

                showToast("Your profile has been updated.");

            });


        /* =====================================
           SAVE SETTINGS
        ====================================== */

        document.getElementById("saveSettingsBtn")
            .addEventListener("click", function () {

                const settings = readJSON(
                    localStorage,
                    SETTINGS_KEY,
                    {}
                );

                settings[currentUser.email] = {

                    preferredTravel:
                        document.getElementById("preferredTravel").value,

                    preferredCurrency:
                        document.getElementById("preferredCurrency").value,

                    emailNotifications:
                        document.getElementById("emailNotifications").checked,

                    preferredTheme:
                        document.getElementById("preferredTheme").value

                };

                saveJSON(
                    localStorage,
                    SETTINGS_KEY,
                    settings
                );

                showToast("Your preferences have been saved.");

            });


        function loadSettings() {

            const settings = readJSON(
                localStorage,
                SETTINGS_KEY,
                {}
            );

            const userSettings = settings[currentUser.email] || {};

            if (userSettings.preferredTravel) {
                document.getElementById("preferredTravel").value =
                    userSettings.preferredTravel;
            }

            if (userSettings.preferredCurrency) {
                document.getElementById("preferredCurrency").value =
                    userSettings.preferredCurrency;
            }

            if (userSettings.preferredTheme) {
                document.getElementById("preferredTheme").value = userSettings.preferredTheme;
            }
            applyTheme(userSettings.preferredTheme || "light");

            document.getElementById("emailNotifications").checked =
                userSettings.emailNotifications !== false;

        }

        function applyTheme(theme) {
            document.body.classList.toggle("dashboard-dark", theme === "dark");
        }

        document.getElementById("preferredTheme").addEventListener("change", function () {
            applyTheme(this.value);
        });


        document.getElementById("changePasswordForm")
            .addEventListener("submit", function (event) {
                event.preventDefault();
                const currentPassword = document.getElementById("currentPassword").value;
                const newPassword = document.getElementById("newPassword").value;
                const confirmPassword = document.getElementById("confirmNewPassword").value;
                const users = readJSON(localStorage, USERS_KEY, []);
                const user = users.find(item => item.email?.toLowerCase() === currentUser.email.toLowerCase());
                if (!user || user.password !== currentPassword) {
                    showToast("Current password is incorrect.");
                    return;
                }
                if (newPassword !== confirmPassword) {
                    showToast("New passwords do not match.");
                    return;
                }
                user.password = newPassword;
                saveJSON(localStorage, USERS_KEY, users);
                this.reset();
                showToast("Your password has been updated.");
            });


        /* =====================================
           LOGOUT
        ====================================== */

        function logout() {

            const confirmed = window.confirm(
                "Are you sure you want to logout from VoyageGo?"
            );

            if (!confirmed) return;

            localStorage.removeItem(SESSION_KEY);
            sessionStorage.removeItem(SESSION_KEY);

            window.location.replace("login.html");

        }


        document.getElementById("logoutBtn")
            .addEventListener("click", logout);

        document.getElementById("mobileLogoutBtn")
            .addEventListener("click", logout);

        document.getElementById("settingsLogoutBtn")
            .addEventListener("click", logout);


        /* =====================================
           HEADER BOOKING COUNT
        ====================================== */

        function updateHeaderCount() {

            const cart = readJSON(
                localStorage,
                "voyage_cart",
                []
            );

            const count = Array.isArray(cart)
                ? cart.length
                : 0;

            document.querySelectorAll("[data-booking-count]")
                .forEach(element => {

                    element.textContent = count;

                });

        }


        /* =====================================
           INITIALIZE DASHBOARD
        ====================================== */

        function initializeDashboard() {

            updateUserDisplay();

            bookings = loadBookings();

            updateStatistics();

            renderRecentBookings();

            renderAllBookings();

            loadSettings();

            updateHeaderCount();

        }

        initializeDashboard();

    });

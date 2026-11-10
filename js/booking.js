document.addEventListener("DOMContentLoaded", function () {

        const CART_KEY = "voyage_cart";
        const BOOKINGS_KEY = "voyage_bookings";

        const bookingForm = document.getElementById("bookingForm");
        const bookingItems = document.getElementById("bookingItems");
        const travellerForms = document.getElementById("travellerForms");

        const travellerCountElement =
            document.getElementById("travellerCount");

        const bookingAlert =
            document.getElementById("bookingAlert");

        const confirmBookingBtn =
            document.getElementById("confirmBookingBtn");

        const today = new Date();
        const todayString = [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, "0"),
            String(today.getDate()).padStart(2, "0")
        ].join("-");

        const departureDate =
            document.getElementById("departureDate");

        const returnDate =
            document.getElementById("returnDate");

        departureDate.min = todayString;
        returnDate.min = todayString;


        /* =====================================
           STORAGE HELPERS
        ====================================== */

        function getCart() {
            try {
                const cart = JSON.parse(
                    localStorage.getItem(CART_KEY) || "[]"
                );

                if (!Array.isArray(cart)) return [];

                const seen = new Set();
                return cart.filter(item => {
                    if (!item || typeof item !== "object") return false;

                    const key = item.id != null && String(item.id).trim()
                        ? "id:" + String(item.id).trim()
                        : "item:" + [
                            item.title || item.name || item.destination || "",
                            item.location || item.destination || "",
                            item.type || ""
                        ].map(value => String(value).trim().toLowerCase()).join("|");

                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
            } catch (error) {
                return [];
            }
        }

        function saveCart(cart) {
            localStorage.setItem(CART_KEY, JSON.stringify(cart));
        }

        function getBookings() {
            try {
                const bookings = JSON.parse(
                    localStorage.getItem(BOOKINGS_KEY) || "[]"
                );

                return Array.isArray(bookings) ? bookings : [];
            } catch (error) {
                return [];
            }
        }


        /* =====================================
           PRICE HELPERS
        ====================================== */

        function money(amount) {
            return new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0
            }).format(amount);
        }

        function getItemPrice(item) {
            const price = Number(
                item.price || item.amount || item.cost || 0
            );

            return Number.isFinite(price) && price > 0
                ? price
                : 0;
        }

        function getItemTitle(item) {
            return item.title || item.name ||
                item.destination || "Travel Package";
        }

        function getItemImage(item) {
            return item.image || item.imageUrl ||
                item.img ||
                "img/sophie-turner-LZVmvKlchM0-unsplash.webp";
        }


        /* =====================================
           BOOKING CART
        ====================================== */

        let cart = getCart();

        // Persist a cleaned cart so later actions use the same items as the display.
        saveCart(cart);

        let travellerCount = 1;
        let discountPercent = 0;
        let discountApplied = false;


        function renderCart() {

            cart = getCart();

            if (cart.length === 0) {

                bookingItems.innerHTML = `
                    <div class="booking-empty">
                        <i class="fa-solid fa-suitcase-rolling"></i>
                        <h3>No trip selected yet</h3>
                        <p>Explore destinations or packages and add a trip to your booking.</p>
                        <a href="tourist.html" class="btn btn-primary">
                            Explore Destinations
                        </a>
                    </div>
                `;

                confirmBookingBtn.disabled = true;

                updateSummary();
                return;
            }

            confirmBookingBtn.disabled = false;

            bookingItems.innerHTML = cart.map((item, index) => {

                const title = getItemTitle(item);
                const price = getItemPrice(item);
                const image = getItemImage(item);

                const type = item.type || "Travel Package";
                const location = item.location || item.destination || title;

                return `
                    <div class="booking-trip">

                        <img
                            src="${escapeHTML(image)}"
                            alt="${escapeHTML(title)}"
                            class="booking-trip-image"
                            onerror="this.src='img/sophie-turner-LZVmvKlchM0-unsplash.webp'"
                        >

                        <div class="booking-trip-details">
                            <h3>${escapeHTML(title)}</h3>

                            <p>
                                <i class="fa-solid fa-location-dot"></i>
                                ${escapeHTML(String(location))}
                            </p>

                            <p>
                                <i class="fa-solid fa-tag"></i>
                                ${escapeHTML(String(type))}
                            </p>

                            <button type="button"
                                class="booking-remove"
                                data-remove-item="${index}">
                                <i class="fa-regular fa-trash-can"></i>
                                Remove
                            </button>
                        </div>

                        <div class="booking-trip-price">
                            <strong>${money(price)}</strong>
                            <span>/ person</span>
                        </div>

                    </div>

                    ${index < cart.length - 1
                        ? '<div class="booking-divider"></div>'
                        : ''
                    }
                `;

            }).join("");

            updateSummary();

        }


        /* =====================================
           SAFE HTML TEXT
        ====================================== */

        function escapeHTML(value) {

            return String(value).replace(/[&<>"']/g, function (char) {

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


        /* =====================================
           REMOVE ITEM
        ====================================== */

        bookingItems.addEventListener("click", function (event) {

            const button = event.target.closest("[data-remove-item]");

            if (!button) return;

            const index = Number(button.dataset.removeItem);

            if (!Number.isInteger(index) ||
                index < 0 ||
                index >= cart.length) return;

            cart.splice(index, 1);

            saveCart(cart);
            renderCart();

        });


        /* =====================================
           TRAVELLER COUNT
        ====================================== */

        function updateTravellerCount() {

            travellerCountElement.textContent = travellerCount;

            document.getElementById("decreaseTravellers")
                .disabled = travellerCount <= 1;

            document.getElementById("increaseTravellers")
                .disabled = travellerCount >= 10;

            renderTravellerForms();
            updateSummary();

        }


        document.getElementById("decreaseTravellers")
            .addEventListener("click", function () {

                if (travellerCount > 1) {
                    travellerCount--;
                    updateTravellerCount();
                }

            });


        document.getElementById("increaseTravellers")
            .addEventListener("click", function () {

                if (travellerCount < 10) {
                    travellerCount++;
                    updateTravellerCount();
                }

            });


        /* =====================================
           DYNAMIC TRAVELLER FORMS
        ====================================== */

        function renderTravellerForms() {

            const existingTravellers = [];

            travellerForms.querySelectorAll(".traveller-person")
                .forEach((person, index) => {

                    existingTravellers[index] = {
                        name: person.querySelector(
                            '[name="travellerName"]'
                        )?.value || "",

                        age: person.querySelector(
                            '[name="travellerAge"]'
                        )?.value || "",

                        gender: person.querySelector(
                            '[name="travellerGender"]'
                        )?.value || ""
                    };

                });


            travellerForms.innerHTML = "";

            for (let i = 0; i < travellerCount; i++) {

                const person = existingTravellers[i] || {};

                const traveller = document.createElement("div");

                traveller.className = "traveller-person";

                const heading = document.createElement("h4");

                heading.textContent = i === 0
                    ? "Traveller 1 – Primary Traveller"
                    : "Traveller " + (i + 1);

                const grid = document.createElement("div");
                grid.className = "booking-form-grid";

                const nameField = createTravellerInput(
                    "Full Name",
                    "travellerName",
                    "text",
                    "Enter full name",
                    person.name,
                    true
                );

                const ageField = createTravellerInput(
                    "Age",
                    "travellerAge",
                    "number",
                    "Age",
                    person.age,
                    true
                );

                ageField.querySelector("input").min = "1";
                ageField.querySelector("input").max = "110";

                const genderField = document.createElement("div");
                genderField.className = "booking-field full";

                const genderLabel = document.createElement("label");
                genderLabel.textContent = "Gender";

                const genderSelect = document.createElement("select");
                genderSelect.name = "travellerGender";
                genderSelect.className = "booking-input";

                [
                    ["", "Select gender"],
                    ["Male", "Male"],
                    ["Female", "Female"],
                    ["Other", "Other"],
                    ["Prefer not to say", "Prefer not to say"]
                ].forEach(([value, label]) => {

                    const option = document.createElement("option");

                    option.value = value;
                    option.textContent = label;

                    genderSelect.appendChild(option);

                });

                genderSelect.value = person.gender || "";

                genderField.append(genderLabel, genderSelect);

                grid.append(nameField, ageField, genderField);

                traveller.append(heading, grid);

                travellerForms.appendChild(traveller);

            }

        }


        function createTravellerInput(
            labelText,
            name,
            type,
            placeholder,
            value,
            required
        ) {

            const field = document.createElement("div");
            field.className = "booking-field";

            const label = document.createElement("label");
            label.textContent = labelText;

            if (required) {
                const star = document.createElement("span");
                star.textContent = " *";
                label.appendChild(star);
            }

            const input = document.createElement("input");

            input.type = type;
            input.name = name;
            input.className = "booking-input";
            input.placeholder = placeholder;
            input.value = value || "";
            input.required = Boolean(required);

            field.append(label, input);

            return field;

        }


        /* =====================================
           PRICE CALCULATION
        ====================================== */

        function calculatePrice() {

            const perPerson = cart.reduce((total, item) => {
                return total + getItemPrice(item);
            }, 0);

            const subtotal = perPerson * travellerCount;

            const tax = Math.round(subtotal * 0.05);

            const discount = discountApplied
                ? Math.round(subtotal * discountPercent / 100)
                : 0;

            const total = Math.max(0, subtotal + tax - discount);

            return {
                perPerson,
                subtotal,
                tax,
                discount,
                total
            };

        }


        function updateSummary() {

            const prices = calculatePrice();

            document.getElementById("summaryTripCount")
                .textContent = cart.length;

            document.getElementById("summaryTravellers")
                .textContent = travellerCount;

            document.getElementById("summarySubtotal")
                .textContent = money(prices.subtotal);

            document.getElementById("summaryTax")
                .textContent = money(prices.tax);

            document.getElementById("summaryDiscount")
                .textContent = "− " + money(prices.discount);

            document.getElementById("summaryTotal")
                .textContent = money(prices.total);

        }


        /* =====================================
           PROMO CODE
        ====================================== */

        document.getElementById("applyPromo")
            .addEventListener("click", function () {

                const code = document.getElementById("promoCode")
                    .value.trim().toUpperCase();

                const message = document.getElementById("promoMessage");

                if (code === "VOYAGE10") {

                    discountPercent = 10;
                    discountApplied = true;

                    message.style.color = "#20965b";
                    message.textContent =
                        "Success! 10% discount applied.";

                } else {

                    discountPercent = 0;
                    discountApplied = false;

                    message.style.color = "#d94b55";
                    message.textContent =
                        "Invalid promo code. Please try again.";

                }

                updateSummary();

            });


        /* =====================================
           DATE VALIDATION
        ====================================== */

        departureDate.addEventListener("change", function () {

            returnDate.min = this.value || todayString;

            if (returnDate.value && returnDate.value < this.value) {
                returnDate.value = "";
            }

        });


        /* =====================================
           BOOKING ALERT
        ====================================== */

        function showBookingAlert(message) {

            bookingAlert.textContent = message;
            bookingAlert.classList.add("show");

            bookingAlert.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

        }

        function clearBookingAlert() {

            bookingAlert.textContent = "";
            bookingAlert.classList.remove("show");

        }


        /* =====================================
           GET TRAVELLER DATA
        ====================================== */

        function collectTravellers() {

            const result = [];

            const people = travellerForms.querySelectorAll(
                ".traveller-person"
            );

            people.forEach(person => {

                result.push({

                    name: person.querySelector(
                        '[name="travellerName"]'
                    ).value.trim(),

                    age: Number(person.querySelector(
                        '[name="travellerAge"]'
                    ).value),

                    gender: person.querySelector(
                        '[name="travellerGender"]'
                    ).value

                });

            });

            return result;

        }


        /* =====================================
           CONFIRM BOOKING
        ====================================== */

        bookingForm.addEventListener("submit", function (event) {

            event.preventDefault();
            clearBookingAlert();

            cart = getCart();

            if (cart.length === 0) {
                showBookingAlert(
                    "Please add at least one destination or package before confirming your booking."
                );
                return;
            }

            if (!bookingForm.checkValidity()) {
                bookingForm.reportValidity();
                return;
            }


            const departure = departureDate.value;
            const returning = returnDate.value;

            if (returning < departure) {
                showBookingAlert(
                    "Return date must be the same as or later than departure date."
                );
                return;
            }


            const travellers = collectTravellers();

            if (travellers.length !== travellerCount) {
                showBookingAlert(
                    "Please complete all traveller details."
                );
                return;
            }

            const invalidTraveller = travellers.find(person => {

                return !person.name ||
                    !Number.isInteger(person.age) ||
                    person.age < 1 ||
                    person.age > 110;

            });

            if (invalidTraveller) {
                showBookingAlert(
                    "Please enter a valid name and age for every traveller."
                );
                return;
            }


            const prices = calculatePrice();

            const bookingId = "VG" +
                Date.now().toString().slice(-9);


            const booking = {

                id: bookingId,

                items: cart.map(item => ({
                    id: item.id || null,
                    title: getItemTitle(item),
                    name: getItemTitle(item),
                    type: item.type || "Travel Package",
                    location: item.location || item.destination || "",
                    price: getItemPrice(item),
                    image: getItemImage(item)
                })),

                travel: {
                    departureDate: departure,
                    returnDate: returning,
                    travelType: document.getElementById("travelType").value,
                    departureCity: document.getElementById("departureCity")
                        .value.trim()
                },

                travellers: travellers,

                contact: {
                    name: document.getElementById("contactName")
                        .value.trim(),

                    email: document.getElementById("contactEmail")
                        .value.trim(),

                    phone: document.getElementById("contactPhone")
                        .value.trim(),

                    country: document.getElementById("contactCountry").value
                },

                specialRequest: document.getElementById("specialRequest")
                    .value.trim(),

                pricing: {
                    subtotal: prices.subtotal,
                    tax: prices.tax,
                    discount: prices.discount,
                    total: prices.total
                },

                promoCode: discountApplied ? "VOYAGE10" : "",

                status: "Demo Booking Saved",

                paymentStatus: "Not Paid",

                createdAt: new Date().toISOString()

            };


            const bookings = getBookings();

            bookings.unshift(booking);

            try {

                localStorage.setItem(
                    BOOKINGS_KEY,
                    JSON.stringify(bookings)
                );

                /*
                  Keep the selected items in the booking record,
                  then clear the cart after successful saving.
                */

                saveCart([]);

            } catch (error) {

                showBookingAlert(
                    "Unable to save this booking. Your browser storage may be full."
                );

                return;

            }


            document.getElementById("bookingContent").style.display = "none";

            const successSection =
                document.getElementById("bookingSuccess");

            successSection.classList.add("show");

            document.getElementById("successBookingId")
                .textContent = "Booking ID: " + bookingId;

            document.getElementById("successBookingDetails")
                .textContent =
                travellers.length + " traveller(s) • " +
                departure + " to " + returning + " • Total " +
                money(prices.total);

            document.querySelectorAll(".progress-step")
                .forEach(step => step.classList.remove("active"));

            document.querySelectorAll(".progress-step")[2]
                .classList.add("active");

            document.querySelectorAll(".progress-step")[2]
                .classList.add("completed");

            successSection.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

        });


        /* =====================================
           LOAD USER DETAILS FROM LOGIN
        ====================================== */

        function loadLoggedInUser() {

            let session = null;

            try {

                const rawSession =
                    localStorage.getItem("voyage_current_user") ||
                    sessionStorage.getItem("voyage_current_user");

                if (rawSession) {
                    session = JSON.parse(rawSession);
                }

            } catch (error) {
                session = null;
            }

            if (!session) return;

            document.getElementById("contactName").value =
                session.name || "";

            document.getElementById("contactEmail").value =
                session.email || "";

            document.getElementById("contactPhone").value =
                session.phone || "";

        }


        /* =====================================
           HEADER BOOKING COUNT
        ====================================== */

        function updateHeaderCount() {

            const count = getCart().length;

            document.querySelectorAll("[data-booking-count]")
                .forEach(element => {
                    element.textContent = count;
                });

        }


        /* =====================================
           INITIALIZE
        ====================================== */

        renderCart();
        updateTravellerCount();
        loadLoggedInUser();
        updateHeaderCount();

    });

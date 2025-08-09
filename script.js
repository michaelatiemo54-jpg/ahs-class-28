// ======== NAVIGATION HIGHLIGHT ON SCROLL =========
const sections = document.querySelectorAll("section");
const navLinks = document.querySelectorAll("nav ul li a");

window.addEventListener("scroll", () => {
    let current = "";
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        if (pageYOffset >= sectionTop) {
            current = section.getAttribute("id");
        }
    });

    navLinks.forEach(link => {
        link.classList.remove("active");
        if (link.getAttribute("href").includes(current)) {
            link.classList.add("active");
        }
    });
});

// ======== SMOOTH SCROLLING =========
navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        document.querySelector(link.getAttribute("href")).scrollIntoView({
            behavior: "smooth"
        });
    });
});

// ======== SCROLL TO TOP BUTTON =========
const scrollBtn = document.createElement("button");
scrollBtn.innerText = "⬆";
scrollBtn.id = "scrollToTop";
document.body.appendChild(scrollBtn);

scrollBtn.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    display: none;
    background: #007bff;
    color: white;
    border: none;
    padding: 10px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 18px;
`;

window.addEventListener("scroll", () => {
    scrollBtn.style.display = window.scrollY > 300 ? "block" : "none";
});

scrollBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
});

// ======== ANIMATED COUNTERS =========
const counters = document.querySelectorAll(".counter");
const speed = 200;

const runCounter = () => {
    counters.forEach(counter => {
        const updateCount = () => {
            const target = +counter.getAttribute("data-target");
            const count = +counter.innerText;
            const increment = target / speed;

            if (count < target) {
                counter.innerText = Math.ceil(count + increment);
                setTimeout(updateCount, 20);
            } else {
                counter.innerText = target;
            }
        };
        updateCount();
    });
};

const counterObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
        runCounter();
        counterObserver.disconnect();
    }
}, { threshold: 0.5 });

if (counters.length > 0) {
    counterObserver.observe(counters[0]);
}

// ======== FORM VALIDATION =========
const form = document.querySelector("form");
if (form) {
    form.addEventListener("submit", (e) => {
        let valid = true;
        form.querySelectorAll("input[required], textarea[required]").forEach(input => {
            if (!input.value.trim()) {
                input.style.border = "2px solid red";
                valid = false;
            } else {
                input.style.border = "1px solid #ccc";
            }
        });
        if (!valid) {
            e.preventDefault();
            alert("Please fill in all required fields.");
        }
    });
}

// ======== DARK/LIGHT MODE TOGGLE =========
const toggleBtn = document.createElement("button");
toggleBtn.innerText = "🌙";
toggleBtn.id = "themeToggle";
document.body.appendChild(toggleBtn);

toggleBtn.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 30px;
    background: #333;
    color: white;
    border: none;
    padding: 10px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 18px;
`;

const applyTheme = (theme) => {
    document.body.setAttribute("data-theme", theme);
    toggleBtn.innerText = theme === "dark" ? "☀️" : "🌙";
    localStorage.setItem("theme", theme);
};

toggleBtn.addEventListener("click", () => {
    const currentTheme = document.body.getAttribute("data-theme") || "light";
    applyTheme(currentTheme === "light" ? "dark" : "light");
});

if (localStorage.getItem("theme")) {
    applyTheme(localStorage.getItem("theme"));
}

// ======== FADE-IN ANIMATIONS =========
const fadeElements = document.querySelectorAll(".fade-in");
const fadeObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("visible");
        }
    });
}, { threshold: 0.2 });

fadeElements.forEach(el => fadeObserver.observe(el));

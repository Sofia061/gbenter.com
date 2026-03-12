const cards = document.querySelectorAll(".artist-card");
const cards2 = document.querySelectorAll(".artist-card2");
const modal = document.getElementById("artistModal");
const modalImg = document.getElementById("modalImg");
const modalName = document.getElementById("modalName");
const modalRole = document.getElementById("modalRole");
const modalDescription = document.getElementById("modalDescription");
const closeBtn = document.querySelector(".close-btn");

cards.forEach((card) => {
  card.addEventListener("click", () => {
    modal.style.display = "flex";
    modalImg.src = card.dataset.img;
    modalImg.style.objectPosition = card.dataset.position || "center 25%";
    modalName.textContent = card.dataset.name;
    modalRole.textContent = card.dataset.role;
    modalDescription.innerHTML = card.dataset.description;
  });
});

cards2.forEach((card) => {
  card.addEventListener("click", () => {
    modal.style.display = "flex";
    modalImg.src = card.dataset.img;
    modalImg.style.objectPosition = card.dataset.position || "center 25%";
    modalName.textContent = card.dataset.name;
    modalRole.textContent = card.dataset.role;
    modalDescription.innerHTML = card.dataset.description;
  });
});

closeBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
});

const filterButtons = document.querySelectorAll(".filter-btn");
const artists = document.querySelectorAll(".artist-card");
const artists2 = document.querySelectorAll(".artist-card2");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(".filter-btn.active").classList.remove("active");
    button.classList.add("active");

    const filter = button.dataset.filter;

    artists.forEach((artist) => {
      if (filter === "all") {
        artist.style.display = "block";
      } else if (artist.classList.contains(filter)) {
        artist.style.display = "block";
      } else {
        artist.style.display = "none";
      }
    });
  });
});


filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(".filter-btn.active").classList.remove("active");
    button.classList.add("active");

    const filter = button.dataset.filter;

    artists2.forEach((artist) => {
      if (filter === "all") {
        artist.style.display = "block";
      } else if (artist.classList.contains(filter)) {
        artist.style.display = "block";
      } else {
        artist.style.display = "none";
      }
    });
  });
});
